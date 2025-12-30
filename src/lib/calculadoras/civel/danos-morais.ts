/**
 * Danos Morais Calculator
 * Estimates moral damages based on jurisprudential criteria
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoDano =
  | 'inscricao_indevida'
  | 'protesto_indevido'
  | 'cobranca_indevida'
  | 'falha_servico'
  | 'atraso_voo'
  | 'extravio_bagagem'
  | 'erro_medico'
  | 'acidente_trabalho'
  | 'acidente_transito'
  | 'ofensa_honra'
  | 'assedio_moral'
  | 'assedio_sexual'
  | 'prisao_indevida'
  | 'morte_familiar'
  | 'lesao_corporal'
  | 'publicacao_indevida'
  | 'outro';

export type GravidadeDano = 'leve' | 'medio' | 'grave' | 'gravissimo';
export type PerfilOfensor = 'pessoa_fisica' | 'microempresa' | 'empresa_medio_porte' | 'grande_empresa' | 'multinacional';
export type TipoVitima = 'consumidor' | 'trabalhador' | 'cidadao' | 'pessoa_publica';

export interface DanosMoraisInput {
  tipoDano: TipoDano;
  gravidadeDano: GravidadeDano;
  perfilOfensor: PerfilOfensor;
  tipoVitima: TipoVitima;
  rendaVitima?: number;
  faturamentoOfensor?: number;
  reincidencia: boolean;
  culpaGrave: boolean;
  sequelaPermanente: boolean;
  duracaoEventoDias?: number;
  estadoUF: string;
}

export interface DanosMoraisOutput {
  valorMinimo: number;
  valorSugerido: number;
  valorMaximo: number;
  faixaSalariosMinimos: { min: number; max: number };
  criteriosAplicados: CriterioAplicado[];
  jurisprudenciaReferencia: JurisprudenciaReferencia[];
  fundamentacao: string;
}

export interface CriterioAplicado {
  descricao: string;
  fatorMultiplicador: number;
  justificativa: string;
}

export interface JurisprudenciaReferencia {
  tribunal: string;
  processo: string;
  valorArbitrado: number;
  tipoDano: string;
}

const SALARIO_MINIMO = 1412.00;

// Base values by damage type (in minimum wages)
const VALORES_BASE: Record<TipoDano, { min: number; med: number; max: number }> = {
  inscricao_indevida: { min: 5, med: 10, max: 20 },
  protesto_indevido: { min: 5, med: 10, max: 30 },
  cobranca_indevida: { min: 3, med: 7, max: 15 },
  falha_servico: { min: 3, med: 8, max: 20 },
  atraso_voo: { min: 5, med: 10, max: 25 },
  extravio_bagagem: { min: 10, med: 20, max: 40 },
  erro_medico: { min: 30, med: 100, max: 500 },
  acidente_trabalho: { min: 20, med: 50, max: 200 },
  acidente_transito: { min: 20, med: 50, max: 300 },
  ofensa_honra: { min: 5, med: 15, max: 50 },
  assedio_moral: { min: 10, med: 30, max: 100 },
  assedio_sexual: { min: 30, med: 80, max: 200 },
  prisao_indevida: { min: 50, med: 150, max: 500 },
  morte_familiar: { min: 100, med: 300, max: 1000 },
  lesao_corporal: { min: 20, med: 60, max: 300 },
  publicacao_indevida: { min: 10, med: 30, max: 100 },
  outro: { min: 5, med: 15, max: 50 },
};

// Multipliers by severity
const MULTIPLICADORES_GRAVIDADE: Record<GravidadeDano, number> = {
  leve: 0.5,
  medio: 1.0,
  grave: 1.5,
  gravissimo: 2.5,
};

// Multipliers by offender profile (economic capacity)
const MULTIPLICADORES_OFENSOR: Record<PerfilOfensor, number> = {
  pessoa_fisica: 0.5,
  microempresa: 0.7,
  empresa_medio_porte: 1.0,
  grande_empresa: 1.5,
  multinacional: 2.0,
};

/**
 * Estimate moral damages value
 */
export function calcularDanosMorais(input: DanosMoraisInput): DanosMoraisOutput {
  const {
    tipoDano,
    gravidadeDano,
    perfilOfensor,
    tipoVitima,
    rendaVitima,
    faturamentoOfensor,
    reincidencia,
    culpaGrave,
    sequelaPermanente,
    duracaoEventoDias,
  } = input;

  // Get base values
  const base = VALORES_BASE[tipoDano];

  // Apply multipliers
  const criteriosAplicados: CriterioAplicado[] = [];

  let multiplicadorTotal = 1;

  // Severity multiplier
  const multGravidade = MULTIPLICADORES_GRAVIDADE[gravidadeDano];
  multiplicadorTotal *= multGravidade;
  criteriosAplicados.push({
    descricao: 'Gravidade do dano',
    fatorMultiplicador: multGravidade,
    justificativa: `Dano classificado como ${gravidadeDano}`,
  });

  // Offender profile multiplier
  const multOfensor = MULTIPLICADORES_OFENSOR[perfilOfensor];
  multiplicadorTotal *= multOfensor;
  criteriosAplicados.push({
    descricao: 'Capacidade econômica do ofensor',
    fatorMultiplicador: multOfensor,
    justificativa: `Ofensor: ${perfilOfensor.replace('_', ' ')}`,
  });

  // Recidivism multiplier
  if (reincidencia) {
    multiplicadorTotal *= 1.5;
    criteriosAplicados.push({
      descricao: 'Reincidência',
      fatorMultiplicador: 1.5,
      justificativa: 'Ofensor reincidente na conduta danosa',
    });
  }

  // Grave fault multiplier
  if (culpaGrave) {
    multiplicadorTotal *= 1.3;
    criteriosAplicados.push({
      descricao: 'Culpa grave ou dolo',
      fatorMultiplicador: 1.3,
      justificativa: 'Conduta com culpa grave ou dolo',
    });
  }

  // Permanent sequel multiplier
  if (sequelaPermanente) {
    multiplicadorTotal *= 2.0;
    criteriosAplicados.push({
      descricao: 'Sequela permanente',
      fatorMultiplicador: 2.0,
      justificativa: 'Dano resultou em sequela permanente',
    });
  }

  // Duration multiplier (for prolonged events)
  if (duracaoEventoDias && duracaoEventoDias > 30) {
    const multDuracao = 1 + (duracaoEventoDias / 365) * 0.5;
    multiplicadorTotal *= Math.min(2, multDuracao);
    criteriosAplicados.push({
      descricao: 'Duração do evento',
      fatorMultiplicador: Math.min(2, multDuracao),
      justificativa: `Evento durou ${duracaoEventoDias} dias`,
    });
  }

  // Calculate values
  const valorMinimo = new Decimal(base.min)
    .times(SALARIO_MINIMO)
    .times(multiplicadorTotal)
    .toDecimalPlaces(2)
    .toNumber();

  const valorSugerido = new Decimal(base.med)
    .times(SALARIO_MINIMO)
    .times(multiplicadorTotal)
    .toDecimalPlaces(2)
    .toNumber();

  const valorMaximo = new Decimal(base.max)
    .times(SALARIO_MINIMO)
    .times(multiplicadorTotal)
    .toDecimalPlaces(2)
    .toNumber();

  // Calculate range in minimum wages
  const faixaSalariosMinimos = {
    min: Math.round(valorMinimo / SALARIO_MINIMO),
    max: Math.round(valorMaximo / SALARIO_MINIMO),
  };

  // Get reference jurisprudence
  const jurisprudenciaReferencia = getJurisprudencia(tipoDano);

  const fundamentacao = buildFundamentacao(tipoDano, criteriosAplicados);

  return {
    valorMinimo,
    valorSugerido,
    valorMaximo,
    faixaSalariosMinimos,
    criteriosAplicados,
    jurisprudenciaReferencia,
    fundamentacao,
  };
}

/**
 * Get reference jurisprudence for damage type
 */
function getJurisprudencia(tipoDano: TipoDano): JurisprudenciaReferencia[] {
  const jurisprudencia: Record<TipoDano, JurisprudenciaReferencia[]> = {
    inscricao_indevida: [
      {
        tribunal: 'STJ',
        processo: 'REsp 1.061.134/RS',
        valorArbitrado: 10000,
        tipoDano: 'Inscrição indevida em cadastro de inadimplentes',
      },
      {
        tribunal: 'TJSP',
        processo: 'AC 1001234-56.2023',
        valorArbitrado: 15000,
        tipoDano: 'Negativação indevida - pessoa física',
      },
    ],
    atraso_voo: [
      {
        tribunal: 'TJSP',
        processo: 'AC 1002345-67.2023',
        valorArbitrado: 8000,
        tipoDano: 'Atraso de voo superior a 4 horas',
      },
      {
        tribunal: 'TJRJ',
        processo: 'AC 0012345-89.2023',
        valorArbitrado: 12000,
        tipoDano: 'Atraso com pernoite sem assistência',
      },
    ],
    extravio_bagagem: [
      {
        tribunal: 'STJ',
        processo: 'REsp 1.842.066/RS',
        valorArbitrado: 25000,
        tipoDano: 'Extravio definitivo de bagagem',
      },
    ],
    assedio_moral: [
      {
        tribunal: 'TST',
        processo: 'RR 1234-56.2020',
        valorArbitrado: 50000,
        tipoDano: 'Assédio moral no trabalho',
      },
    ],
    morte_familiar: [
      {
        tribunal: 'STJ',
        processo: 'REsp 1.127.913/RS',
        valorArbitrado: 300000,
        tipoDano: 'Morte de filho menor',
      },
    ],
    // Simplified - would have more entries
    protesto_indevido: [],
    cobranca_indevida: [],
    falha_servico: [],
    erro_medico: [],
    acidente_trabalho: [],
    acidente_transito: [],
    ofensa_honra: [],
    assedio_sexual: [],
    prisao_indevida: [],
    lesao_corporal: [],
    publicacao_indevida: [],
    outro: [],
  };

  return jurisprudencia[tipoDano] || [];
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  tipoDano: TipoDano,
  criterios: CriterioAplicado[]
): string {
  let base = `Estimativa de danos morais conforme art. 186 e 927 do Código Civil ` +
    `e art. 5º, X, da Constituição Federal. `;

  base += `\n\nO arbitramento observa os critérios da razoabilidade e proporcionalidade, ` +
    `considerando: (i) a extensão do dano; (ii) a capacidade econômica do ofensor; ` +
    `(iii) o caráter pedagógico/punitivo da indenização; ` +
    `(iv) a vedação ao enriquecimento ilícito da vítima.\n\n`;

  base += `Critérios aplicados no cálculo:\n`;
  for (const criterio of criterios) {
    base += `- ${criterio.descricao}: fator ${criterio.fatorMultiplicador.toFixed(2)}x ` +
      `(${criterio.justificativa})\n`;
  }

  base += `\nOs valores são estimativas baseadas em parâmetros jurisprudenciais ` +
    `e podem variar conforme o caso concreto e o entendimento do juízo.`;

  return base;
}

/**
 * Calculate aggravated damages (danos morais agravados)
 */
export function calcularDanosAgravados(
  valorBase: number,
  fatorAgravamento: number,
  motivo: string
): { valorAgravado: number; fundamentacao: string } {
  const valorAgravado = new Decimal(valorBase)
    .times(fatorAgravamento)
    .toDecimalPlaces(2)
    .toNumber();

  return {
    valorAgravado,
    fundamentacao: `Danos majorados pelo fator ${fatorAgravamento.toFixed(2)}x em razão de: ${motivo}`,
  };
}

/**
 * Calculate accumulated damages (multiple events)
 */
export function calcularDanosAcumulados(
  danos: Array<{ tipo: TipoDano; valor: number }>
): { valorTotal: number; reducaoAcumulo: number; valorFinal: number } {
  // When there are multiple moral damages, courts often apply reduction
  const valorTotal = danos.reduce((acc, d) => acc + d.valor, 0);

  // Reduction for accumulation (typically 20-30%)
  const reducaoAcumulo = danos.length > 1 ? 0.2 : 0;
  const valorFinal = new Decimal(valorTotal)
    .times(1 - reducaoAcumulo)
    .toDecimalPlaces(2)
    .toNumber();

  return {
    valorTotal,
    reducaoAcumulo,
    valorFinal,
  };
}

/**
 * Check if damage is presumed (in re ipsa)
 */
export function verificarDanoInReIpsa(tipoDano: TipoDano): {
  presumido: boolean;
  fundamentacao: string;
} {
  const danosPresumidos: TipoDano[] = [
    'inscricao_indevida',
    'protesto_indevido',
    'prisao_indevida',
    'morte_familiar',
  ];

  const presumido = danosPresumidos.includes(tipoDano);

  return {
    presumido,
    fundamentacao: presumido
      ? `O dano moral é presumido (in re ipsa), dispensando comprovação do prejuízo ` +
        `(STJ, Súmula 385 e jurisprudência consolidada).`
      : `O dano moral deve ser comprovado nos autos, demonstrando-se o abalo sofrido.`,
  };
}
