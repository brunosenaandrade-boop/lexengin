/**
 * Revisão da Vida Toda Calculator
 * Calculates benefit revision including contributions before July 1994
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface SalarioHistorico {
  competencia: Date;
  valor: number;
  moeda: 'real' | 'cruzeiro_real' | 'cruzeiro' | 'cruzado_novo' | 'cruzado';
  indiceCorrecao?: number;
  valorConvertido?: number;
}

export interface RevisaoVidaTodaInput {
  beneficioAtual: number;
  dib: Date; // Data de Início do Benefício
  salariosApos1994: SalarioHistorico[];
  salariosAntes1994: SalarioHistorico[];
  tempoContribuicaoMeses: number;
  sexo: 'masculino' | 'feminino';
}

export interface RevisaoVidaTodaOutput {
  valeAPena: boolean;
  beneficioAtual: number;
  beneficioRevisado: number;
  diferenca: number;
  percentualAumento: number;
  mediaRegra1999: number; // Only post-1994
  mediaVidaToda: number; // All contributions
  atrasadosEstimados: number;
  prescricao: {
    dataLimite: Date;
    mesesPerdidos: number;
    valorPerdido: number;
  };
  fundamentacao: string;
}

const TETO_INSS_2024 = 7786.02;
const PISO_INSS_2024 = 1412.00;

// Currency conversion factors to Real (BRL)
// These are the official conversion rates when each currency was replaced
const CONVERSAO_MOEDAS: Record<string, number> = {
  real: 1,
  cruzeiro_real: 2750, // 1 Real = 2.750 Cruzeiros Reais (1994)
  cruzeiro: 2750000, // 1 Real = 2.750.000 Cruzeiros (1993)
  cruzado_novo: 2750000000, // Through Cruzeiro conversion
  cruzado: 2750000000000, // Through Cruzado Novo/Cruzeiro conversion
};

// ORTN/OTN/BTN/IRSM/INPC correction factors (simplified)
// In production, these would come from BACEN API
const INDICES_CORRECAO: Record<number, number> = {
  1994: 13500000,
  1993: 6750000,
  1992: 450000,
  1991: 50000,
  1990: 8000,
  1989: 600,
  1988: 100,
  1987: 20,
  1986: 5,
  1985: 2.5,
  1984: 1.8,
  1983: 1.3,
  1982: 1.0,
};

/**
 * Calculate "Revisão da Vida Toda"
 */
export function calcularRevisaoVidaToda(input: RevisaoVidaTodaInput): RevisaoVidaTodaOutput {
  const {
    beneficioAtual,
    dib,
    salariosApos1994,
    salariosAntes1994,
    tempoContribuicaoMeses,
    sexo,
  } = input;

  // Calculate average with only post-1994 salaries (current rule)
  const salariosCorrigidos1994 = corrigirSalarios(salariosApos1994);
  const soma1994 = salariosCorrigidos1994.reduce((acc, s) => acc + (s.valorConvertido || 0), 0);
  const mediaRegra1999 = salariosCorrigidos1994.length > 0
    ? soma1994 / salariosCorrigidos1994.length
    : 0;

  // Calculate average with ALL contributions (vida toda)
  const salariosCorrigidosAntigos = corrigirSalariosAntigos(salariosAntes1994);
  const todosSalarios = [...salariosCorrigidos1994, ...salariosCorrigidosAntigos];
  const somaTotal = todosSalarios.reduce((acc, s) => acc + (s.valorConvertido || 0), 0);
  const mediaVidaToda = todosSalarios.length > 0
    ? somaTotal / todosSalarios.length
    : 0;

  // Calculate coefficient
  const coeficiente = calcularCoeficiente(sexo, tempoContribuicaoMeses);

  // Calculate revised benefit
  const beneficioCalculado1999 = new Decimal(mediaRegra1999)
    .times(coeficiente)
    .dividedBy(100)
    .toNumber();

  const beneficioCalculadoVidaToda = new Decimal(mediaVidaToda)
    .times(coeficiente)
    .dividedBy(100)
    .toNumber();

  // Apply limits
  const beneficioRevisado = Math.max(
    PISO_INSS_2024,
    Math.min(TETO_INSS_2024, beneficioCalculadoVidaToda)
  );

  // Compare
  const diferenca = beneficioRevisado - beneficioAtual;
  const percentualAumento = beneficioAtual > 0
    ? ((beneficioRevisado - beneficioAtual) / beneficioAtual) * 100
    : 0;

  const valeAPena = diferenca > 0 && percentualAumento > 5; // Worth it if > 5% increase

  // Calculate arrears (last 5 years - prescription)
  const hoje = new Date();
  const prescricaoData = new Date(hoje);
  prescricaoData.setFullYear(prescricaoData.getFullYear() - 5);

  const mesesDesdeDB = monthsBetween(dib, hoje);
  const mesesPrescricao = Math.max(0, mesesDesdeDB - 60);
  const valorPrescrito = mesesPrescricao * diferenca;

  const mesesCobrados = Math.min(60, mesesDesdeDB);
  const atrasadosEstimados = mesesCobrados * Math.max(0, diferenca);

  const fundamentacao = buildFundamentacao(valeAPena, percentualAumento);

  return {
    valeAPena,
    beneficioAtual,
    beneficioRevisado,
    diferenca: Math.max(0, diferenca),
    percentualAumento: Math.max(0, percentualAumento),
    mediaRegra1999,
    mediaVidaToda,
    atrasadosEstimados,
    prescricao: {
      dataLimite: prescricaoData,
      mesesPerdidos: mesesPrescricao,
      valorPerdido: Math.max(0, valorPrescrito),
    },
    fundamentacao,
  };
}

/**
 * Correct post-1994 salaries using INPC
 */
function corrigirSalarios(salarios: SalarioHistorico[]): SalarioHistorico[] {
  return salarios.map((s) => {
    const ano = s.competencia.getFullYear();
    const mesesDesde = monthsBetween(s.competencia, new Date());
    // Simplified correction: 0.5% per month average
    const indice = Math.pow(1.005, mesesDesde);

    return {
      ...s,
      indiceCorrecao: indice,
      valorConvertido: new Decimal(s.valor).times(indice).toNumber(),
    };
  });
}

/**
 * Convert and correct pre-1994 salaries
 */
function corrigirSalariosAntigos(salarios: SalarioHistorico[]): SalarioHistorico[] {
  return salarios.map((s) => {
    const ano = s.competencia.getFullYear();

    // Convert currency to Real
    const fatorMoeda = CONVERSAO_MOEDAS[s.moeda] || 1;
    const valorEmReal = s.valor / fatorMoeda;

    // Apply historical correction
    const fatorCorrecao = INDICES_CORRECAO[ano] || 1;
    const valorCorrigido = valorEmReal * fatorCorrecao;

    return {
      ...s,
      indiceCorrecao: fatorCorrecao,
      valorConvertido: Math.min(TETO_INSS_2024, valorCorrigido),
    };
  });
}

/**
 * Calculate coefficient
 */
function calcularCoeficiente(sexo: 'masculino' | 'feminino', tempoMeses: number): number {
  const tempoMinimo = sexo === 'masculino' ? 20 : 15;
  const anosContribuicao = Math.floor(tempoMeses / 12);
  const anosExcedentes = Math.max(0, anosContribuicao - tempoMinimo);
  return Math.min(100, 60 + (anosExcedentes * 2));
}

/**
 * Calculate months between two dates
 */
function monthsBetween(start: Date, end: Date): number {
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  return years * 12 + months;
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(valeAPena: boolean, percentual: number): string {
  let base = `Análise da Revisão da Vida Toda conforme Tema 1102 do STF. ` +
    `O STF reconheceu o direito de incluir contribuições anteriores a julho/1994 ` +
    `no cálculo do benefício, quando for mais vantajoso ao segurado. `;

  if (valeAPena) {
    base += `Neste caso, a inclusão das contribuições anteriores a 1994 ` +
      `resulta em aumento de ${percentual.toFixed(2)}% no benefício, ` +
      `demonstrando vantagem na revisão. `;
  } else {
    base += `Neste caso, a inclusão das contribuições anteriores a 1994 ` +
      `não resulta em aumento significativo (${percentual.toFixed(2)}%), ` +
      `pois a média dos salários antigos é inferior à média pós-1994. `;
  }

  base += `IMPORTANTE: O prazo decadencial de 10 anos conta a partir do primeiro pagamento do benefício. ` +
    `A prescrição quinquenal limita a cobrança de atrasados aos últimos 5 anos.`;

  return base;
}

/**
 * Check eligibility for revision
 */
export function verificarElegibilidade(dib: Date): {
  elegivel: boolean;
  diasRestantes: number;
  dataLimite: Date;
  motivo: string;
} {
  const dataLimite = new Date(dib);
  dataLimite.setFullYear(dataLimite.getFullYear() + 10);

  const hoje = new Date();
  const diasRestantes = Math.floor((dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (dib > new Date('1999-11-28')) {
    return {
      elegivel: false,
      diasRestantes: 0,
      dataLimite,
      motivo: 'Benefício concedido após a Lei 9.876/99 - regra do fator previdenciário já aplicada',
    };
  }

  if (diasRestantes <= 0) {
    return {
      elegivel: false,
      diasRestantes: 0,
      dataLimite,
      motivo: 'Prazo decadencial de 10 anos já expirado',
    };
  }

  return {
    elegivel: true,
    diasRestantes,
    dataLimite,
    motivo: 'Benefício elegível para revisão da vida toda',
  };
}

/**
 * Simulate revision scenario
 */
export function simularRevisao(
  beneficioAtual: number,
  mediaSalariosAntigos: number,
  mediaSalariosRecentes: number,
  tempoContribuicaoMeses: number,
  sexo: 'masculino' | 'feminino'
): { beneficioRevisado: number; diferenca: number; valeAPena: boolean } {
  const coeficiente = calcularCoeficiente(sexo, tempoContribuicaoMeses);

  // Estimate with all contributions
  const mediaTotal = (mediaSalariosAntigos + mediaSalariosRecentes) / 2;
  const beneficioRevisado = new Decimal(mediaTotal)
    .times(coeficiente)
    .dividedBy(100)
    .toNumber();

  const beneficioFinal = Math.max(
    PISO_INSS_2024,
    Math.min(TETO_INSS_2024, beneficioRevisado)
  );

  const diferenca = beneficioFinal - beneficioAtual;

  return {
    beneficioRevisado: beneficioFinal,
    diferenca: Math.max(0, diferenca),
    valeAPena: diferenca > beneficioAtual * 0.05,
  };
}
