/**
 * Progressão de Regime Calculator
 * Calculates the date for prison regime progression
 */

import Decimal from 'decimal.js';
import { addDays, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoCrime = 'comum' | 'hediondo' | 'hediondo_reincidente';
export type Regime = 'fechado' | 'semiaberto' | 'aberto';

export interface ProgressaoInput {
  penaTotal: number; // In days
  regimeAtual: Regime;
  tipoCrime: TipoCrime;
  dataInicioExecucao: Date;
  diasRemidos?: number;
  reincidente: boolean;
  primario: boolean;
}

export interface ProgressaoOutput {
  dataProgressao: Date;
  proximoRegime: Regime | 'livramento';
  diasCumpridos: number;
  diasNecessarios: number;
  diasRestantes: number;
  percentualCumprido: number;
  fracaoExigida: string;
  fundamentacao: string;
  livramentoCondicional?: {
    data: Date;
    diasNecessarios: number;
    diasRestantes: number;
    fracao: string;
  };
}

// Progression fractions based on Lei 13.964/2019 (Pacote Anticrime)
const FRACOES_PROGRESSAO: Record<TipoCrime, Record<string, number>> = {
  comum: {
    primario: 1 / 6, // 16%
    reincidente: 1 / 4, // 25%
  },
  hediondo: {
    primario: 2 / 5, // 40%
    reincidente: 3 / 5, // 60%
  },
  hediondo_reincidente: {
    primario: 1 / 2, // 50% (hediondo reincidente específico)
    reincidente: 7 / 10, // 70%
  },
};

// Conditional release fractions
const FRACOES_LIVRAMENTO: Record<TipoCrime, Record<string, number>> = {
  comum: {
    primario: 1 / 3, // 33%
    reincidente: 1 / 2, // 50%
  },
  hediondo: {
    primario: 2 / 3, // 66%
    reincidente: 2 / 3, // 66% (same for recidivists)
  },
  hediondo_reincidente: {
    primario: 2 / 3,
    reincidente: 2 / 3,
  },
};

/**
 * Calculate regime progression
 */
export function calcularProgressao(input: ProgressaoInput): ProgressaoOutput {
  const {
    penaTotal,
    regimeAtual,
    tipoCrime,
    dataInicioExecucao,
    diasRemidos = 0,
    reincidente,
    primario,
  } = input;

  const hoje = new Date();
  const diasCumpridos = differenceInDays(hoje, dataInicioExecucao) + diasRemidos;

  // Get the fraction for progression
  const tipoReu = primario ? 'primario' : 'reincidente';
  const fracaoProgressao = FRACOES_PROGRESSAO[tipoCrime][tipoReu];
  const fracaoLivramento = FRACOES_LIVRAMENTO[tipoCrime][tipoReu];

  // Calculate days needed
  const diasNecessarios = Math.ceil(new Decimal(penaTotal).times(fracaoProgressao).toNumber());
  const diasRestantes = Math.max(0, diasNecessarios - diasCumpridos);

  // Calculate progression date
  const dataProgressao = addDays(hoje, diasRestantes);

  // Calculate percentage completed
  const percentualCumprido = new Decimal(diasCumpridos)
    .dividedBy(diasNecessarios)
    .times(100)
    .toNumber();

  // Determine next regime
  const proximoRegime = getProximoRegime(regimeAtual);

  // Format fraction
  const fracaoExigida = formatarFracao(fracaoProgressao);

  // Calculate conditional release
  const diasLivramento = Math.ceil(new Decimal(penaTotal).times(fracaoLivramento).toNumber());
  const diasRestantesLivramento = Math.max(0, diasLivramento - diasCumpridos);
  const dataLivramento = addDays(hoje, diasRestantesLivramento);

  // Build fundamentação
  const fundamentacao = buildFundamentacao(
    tipoCrime,
    reincidente,
    primario,
    fracaoExigida,
    diasNecessarios,
    diasCumpridos,
    regimeAtual,
    proximoRegime
  );

  return {
    dataProgressao,
    proximoRegime,
    diasCumpridos,
    diasNecessarios,
    diasRestantes,
    percentualCumprido: Math.min(percentualCumprido, 100),
    fracaoExigida,
    fundamentacao,
    livramentoCondicional: {
      data: dataLivramento,
      diasNecessarios: diasLivramento,
      diasRestantes: diasRestantesLivramento,
      fracao: formatarFracao(fracaoLivramento),
    },
  };
}

/**
 * Get next regime in progression
 */
function getProximoRegime(regimeAtual: Regime): Regime | 'livramento' {
  switch (regimeAtual) {
    case 'fechado':
      return 'semiaberto';
    case 'semiaberto':
      return 'aberto';
    case 'aberto':
      return 'livramento';
    default:
      return 'semiaberto';
  }
}

/**
 * Format fraction as string
 */
function formatarFracao(valor: number): string {
  const fracoes: Record<number, string> = {
    [1 / 6]: '1/6',
    [1 / 5]: '1/5',
    [1 / 4]: '1/4',
    [1 / 3]: '1/3',
    [2 / 5]: '2/5',
    [1 / 2]: '1/2',
    [3 / 5]: '3/5',
    [2 / 3]: '2/3',
    [7 / 10]: '7/10',
  };

  // Find closest fraction
  for (const [fracVal, fracStr] of Object.entries(fracoes)) {
    if (Math.abs(parseFloat(fracVal) - valor) < 0.001) {
      return fracStr;
    }
  }

  return `${Math.round(valor * 100)}%`;
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  tipoCrime: TipoCrime,
  reincidente: boolean,
  primario: boolean,
  fracao: string,
  diasNecessarios: number,
  diasCumpridos: number,
  regimeAtual: Regime,
  proximoRegime: Regime | 'livramento'
): string {
  const crimeDesc = tipoCrime === 'comum' ? 'crime comum' : 'crime hediondo';
  const reuDesc = primario ? 'réu primário' : 'réu reincidente';
  const regimeDesc = {
    fechado: 'regime fechado',
    semiaberto: 'regime semiaberto',
    aberto: 'regime aberto',
    livramento: 'livramento condicional',
  };

  return `Considerando tratar-se de ${crimeDesc} e ${reuDesc}, ` +
    `nos termos do art. 112 da Lei 7.210/84 (com redação dada pela Lei 13.964/2019), ` +
    `a progressão de ${regimeDesc[regimeAtual]} para ${regimeDesc[proximoRegime]} ` +
    `exige o cumprimento de ${fracao} da pena, equivalente a ${diasNecessarios} dias. ` +
    `O apenado já cumpriu ${diasCumpridos} dias.`;
}

/**
 * Calculate work remission (3 days worked = 1 day remitted)
 */
export function calcularRemicao(diasTrabalhados: number): number {
  return Math.floor(diasTrabalhados / 3);
}

/**
 * Calculate study remission (12 hours = 1 day remitted)
 */
export function calcularRemicaoEstudo(horasEstudo: number): number {
  return Math.floor(horasEstudo / 12);
}

/**
 * Convert penalty to days
 */
export function converterPenaParaDias(anos: number, meses: number = 0, dias: number = 0): number {
  return anos * 365 + meses * 30 + dias;
}

/**
 * Format days as years/months/days
 */
export function formatarDias(totalDias: number): string {
  const anos = Math.floor(totalDias / 365);
  const meses = Math.floor((totalDias % 365) / 30);
  const dias = totalDias % 30;

  const partes: string[] = [];

  if (anos > 0) partes.push(`${anos} ano${anos > 1 ? 's' : ''}`);
  if (meses > 0) partes.push(`${meses} ${meses > 1 ? 'meses' : 'mês'}`);
  if (dias > 0 || partes.length === 0) partes.push(`${dias} dia${dias > 1 ? 's' : ''}`);

  return partes.join(', ');
}

/**
 * Validate input
 */
export function validateProgressaoInput(input: Partial<ProgressaoInput>): string[] {
  const errors: string[] = [];

  if (!input.penaTotal || input.penaTotal <= 0) {
    errors.push('Pena total deve ser maior que zero');
  }

  if (!input.regimeAtual) {
    errors.push('Regime atual é obrigatório');
  }

  if (!input.tipoCrime) {
    errors.push('Tipo de crime é obrigatório');
  }

  if (!input.dataInicioExecucao) {
    errors.push('Data de início da execução é obrigatória');
  }

  if (input.diasRemidos !== undefined && input.diasRemidos < 0) {
    errors.push('Dias remidos não pode ser negativo');
  }

  return errors;
}
