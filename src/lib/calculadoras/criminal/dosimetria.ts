/**
 * Dosimetria de Pena Calculator
 * Three-phase penalty calculation system (Brazilian Criminal Law)
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface CircunstanciaJudicial {
  nome: string;
  valoracao: -1 | 0 | 1; // -1 = favorable, 0 = neutral, 1 = unfavorable
}

export interface Agravante {
  descricao: string;
  fator: number; // Usually 1/6 = 0.166666
}

export interface Atenuante {
  descricao: string;
  fator: number; // Usually 1/6 = 0.166666
}

export interface CausaAumento {
  descricao: string;
  fracao: string; // "1/3", "1/2", "2/3"
  valor: number;
}

export interface CausaDiminuicao {
  descricao: string;
  fracao: string;
  valor: number;
}

export interface DosimetriaInput {
  penaMinima: number; // In months
  penaMaxima: number; // In months
  circunstanciasJudiciais: CircunstanciaJudicial[];
  agravantes: Agravante[];
  atenuantes: Atenuante[];
  causasAumento: CausaAumento[];
  causasDiminuicao: CausaDiminuicao[];
}

export interface DosimetriaOutput {
  penaBase: number; // In months
  penaIntermediaria: number;
  penaDefinitiva: number;
  regimeInicial: 'fechado' | 'semiaberto' | 'aberto';
  substituicaoPossivel: boolean;
  sursisPossivel: boolean;
  detalhamento: DosimetriaDetalhamento;
}

export interface DosimetriaDetalhamento {
  fase1: {
    penaMinima: number;
    penaMaxima: number;
    circunstanciasDesfavoraveis: number;
    circunstanciasFavoraveis: number;
    aumentoPorCircunstancia: number;
    penaBase: number;
    fundamentacao: string;
  };
  fase2: {
    penaAnterior: number;
    totalAgravantes: number;
    totalAtenuantes: number;
    penaIntermediaria: number;
    fundamentacao: string;
  };
  fase3: {
    penaAnterior: number;
    totalAumentos: number;
    totalDiminuicoes: number;
    penaDefinitiva: number;
    fundamentacao: string;
  };
}

// Common judicial circumstances (Art. 59 CP)
export const CIRCUNSTANCIAS_JUDICIAIS = [
  'Culpabilidade',
  'Antecedentes',
  'Conduta Social',
  'Personalidade',
  'Motivos do Crime',
  'Circunstâncias do Crime',
  'Consequências do Crime',
  'Comportamento da Vítima',
];

// Common aggravating factors (Art. 61 CP)
export const AGRAVANTES_COMUNS: Agravante[] = [
  { descricao: 'Reincidência (Art. 61, I)', fator: 1 / 6 },
  { descricao: 'Motivo fútil ou torpe (Art. 61, II, a)', fator: 1 / 6 },
  { descricao: 'Contra ascendente, descendente, irmão ou cônjuge (Art. 61, II, e)', fator: 1 / 6 },
  { descricao: 'Abuso de autoridade (Art. 61, II, g)', fator: 1 / 6 },
  { descricao: 'Contra criança, maior de 60 anos ou enfermo (Art. 61, II, h)', fator: 1 / 6 },
];

// Common mitigating factors (Art. 65 CP)
export const ATENUANTES_COMUNS: Atenuante[] = [
  { descricao: 'Menor de 21 anos na data do fato (Art. 65, I)', fator: 1 / 6 },
  { descricao: 'Maior de 70 anos na data da sentença (Art. 65, I)', fator: 1 / 6 },
  { descricao: 'Desconhecimento da lei (Art. 65, II)', fator: 1 / 6 },
  { descricao: 'Confissão espontânea (Art. 65, III, d)', fator: 1 / 6 },
  { descricao: 'Reparação do dano antes do julgamento (Art. 65, III, b)', fator: 1 / 6 },
];

/**
 * Parse fraction string to number
 */
function parseFracao(fracao: string): number {
  const match = fracao.match(/(\d+)\/(\d+)/);
  if (match) {
    return parseInt(match[1]) / parseInt(match[2]);
  }
  return parseFloat(fracao);
}

/**
 * Calculate penalty dosimetry
 */
export function calcularDosimetria(input: DosimetriaInput): DosimetriaOutput {
  const {
    penaMinima,
    penaMaxima,
    circunstanciasJudiciais,
    agravantes,
    atenuantes,
    causasAumento,
    causasDiminuicao,
  } = input;

  // ========================================
  // PHASE 1: Base Penalty (Art. 59 CP)
  // ========================================
  const circDesfavoraveis = circunstanciasJudiciais.filter((c) => c.valoracao === 1).length;
  const circFavoraveis = circunstanciasJudiciais.filter((c) => c.valoracao === -1).length;

  // Each unfavorable circumstance increases penalty by 1/8 of the range
  const intervalo = new Decimal(penaMaxima - penaMinima);
  const aumentoPorCirc = intervalo.dividedBy(8);
  const saldoCircunstancias = circDesfavoraveis - circFavoraveis;

  let penaBase = new Decimal(penaMinima);
  if (saldoCircunstancias > 0) {
    penaBase = penaBase.plus(aumentoPorCirc.times(saldoCircunstancias));
  }

  // Penalty cannot exceed maximum in phase 1
  penaBase = Decimal.min(penaBase, new Decimal(penaMaxima));

  const fase1: DosimetriaDetalhamento['fase1'] = {
    penaMinima,
    penaMaxima,
    circunstanciasDesfavoraveis: circDesfavoraveis,
    circunstanciasFavoraveis: circFavoraveis,
    aumentoPorCircunstancia: aumentoPorCirc.toNumber(),
    penaBase: penaBase.toNumber(),
    fundamentacao: `Considerando ${circDesfavoraveis} circunstância(s) desfavorável(is) e ${circFavoraveis} favorável(is), ` +
      `fixo a pena-base em ${formatarPena(penaBase.toNumber())}.`,
  };

  // ========================================
  // PHASE 2: Aggravating and Mitigating (Arts. 61-66 CP)
  // ========================================
  let penaIntermediaria = penaBase;

  // Apply aggravating factors
  let totalAgravantes = new Decimal(0);
  for (const agravante of agravantes) {
    const aumento = penaIntermediaria.times(agravante.fator);
    totalAgravantes = totalAgravantes.plus(aumento);
  }

  // Apply mitigating factors
  let totalAtenuantes = new Decimal(0);
  for (const atenuante of atenuantes) {
    const diminuicao = penaIntermediaria.times(atenuante.fator);
    totalAtenuantes = totalAtenuantes.plus(diminuicao);
  }

  penaIntermediaria = penaIntermediaria.plus(totalAgravantes).minus(totalAtenuantes);

  // Penalty cannot go below minimum or above maximum in phase 2
  penaIntermediaria = Decimal.max(penaIntermediaria, new Decimal(penaMinima));
  penaIntermediaria = Decimal.min(penaIntermediaria, new Decimal(penaMaxima));

  const fase2: DosimetriaDetalhamento['fase2'] = {
    penaAnterior: penaBase.toNumber(),
    totalAgravantes: totalAgravantes.toNumber(),
    totalAtenuantes: totalAtenuantes.toNumber(),
    penaIntermediaria: penaIntermediaria.toNumber(),
    fundamentacao: `Aplicando ${agravantes.length} agravante(s) e ${atenuantes.length} atenuante(s), ` +
      `fixo a pena intermediária em ${formatarPena(penaIntermediaria.toNumber())}.`,
  };

  // ========================================
  // PHASE 3: Causes of Increase/Decrease
  // ========================================
  let penaDefinitiva = penaIntermediaria;

  // Apply causes of increase
  let totalAumentos = new Decimal(0);
  for (const causa of causasAumento) {
    const fator = parseFracao(causa.fracao);
    const aumento = penaDefinitiva.times(fator);
    totalAumentos = totalAumentos.plus(aumento);
  }
  penaDefinitiva = penaDefinitiva.plus(totalAumentos);

  // Apply causes of decrease
  let totalDiminuicoes = new Decimal(0);
  for (const causa of causasDiminuicao) {
    const fator = parseFracao(causa.fracao);
    const diminuicao = penaDefinitiva.times(fator);
    totalDiminuicoes = totalDiminuicoes.plus(diminuicao);
  }
  penaDefinitiva = penaDefinitiva.minus(totalDiminuicoes);

  // In phase 3, penalty CAN go below minimum or above maximum
  penaDefinitiva = Decimal.max(penaDefinitiva, new Decimal(0));

  const fase3: DosimetriaDetalhamento['fase3'] = {
    penaAnterior: penaIntermediaria.toNumber(),
    totalAumentos: totalAumentos.toNumber(),
    totalDiminuicoes: totalDiminuicoes.toNumber(),
    penaDefinitiva: penaDefinitiva.toNumber(),
    fundamentacao: `Aplicando ${causasAumento.length} causa(s) de aumento e ${causasDiminuicao.length} de diminuição, ` +
      `fixo a pena definitiva em ${formatarPena(penaDefinitiva.toNumber())}.`,
  };

  // ========================================
  // Determine initial regime and alternatives
  // ========================================
  const regimeInicial = determinarRegime(penaDefinitiva.toNumber(), agravantes.length > 0);
  const substituicaoPossivel = penaDefinitiva.lte(48) && !agravantes.some(a => a.descricao.includes('Reincidência'));
  const sursisPossivel = penaDefinitiva.lte(24) && !agravantes.some(a => a.descricao.includes('Reincidência'));

  return {
    penaBase: penaBase.toNumber(),
    penaIntermediaria: penaIntermediaria.toNumber(),
    penaDefinitiva: penaDefinitiva.toNumber(),
    regimeInicial,
    substituicaoPossivel,
    sursisPossivel,
    detalhamento: {
      fase1,
      fase2,
      fase3,
    },
  };
}

/**
 * Determine initial prison regime
 */
function determinarRegime(penaMeses: number, reincidente: boolean): 'fechado' | 'semiaberto' | 'aberto' {
  if (penaMeses > 96) {
    return 'fechado'; // > 8 years
  } else if (penaMeses > 48 || reincidente) {
    return 'semiaberto'; // > 4 years or recidivist
  } else {
    return 'aberto'; // <= 4 years non-recidivist
  }
}

/**
 * Format penalty in years and months
 */
export function formatarPena(meses: number): string {
  const anos = Math.floor(meses / 12);
  const mesesRestantes = Math.round(meses % 12);

  if (anos === 0) {
    return `${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`;
  } else if (mesesRestantes === 0) {
    return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  } else {
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`;
  }
}

/**
 * Convert years/months to total months
 */
export function converterParaMeses(anos: number, meses: number = 0): number {
  return anos * 12 + meses;
}

/**
 * Validate input
 */
export function validateDosimetriaInput(input: Partial<DosimetriaInput>): string[] {
  const errors: string[] = [];

  if (!input.penaMinima || input.penaMinima <= 0) {
    errors.push('Pena mínima deve ser maior que zero');
  }

  if (!input.penaMaxima || input.penaMaxima <= 0) {
    errors.push('Pena máxima deve ser maior que zero');
  }

  if (input.penaMinima && input.penaMaxima && input.penaMinima > input.penaMaxima) {
    errors.push('Pena mínima deve ser menor ou igual à pena máxima');
  }

  return errors;
}
