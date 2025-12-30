/**
 * Detração Penal Calculator
 * Calculates penalty deduction for time served in provisional detention
 */

import Decimal from 'decimal.js';
import { differenceInDays, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoPrisao =
  | 'prisao_preventiva'
  | 'prisao_temporaria'
  | 'prisao_flagrante'
  | 'internacao_provisoria'
  | 'prisao_civil';

export interface PeriodoPrisao {
  id: string;
  tipo: TipoPrisao;
  dataInicio: Date;
  dataFim: Date;
  local: string;
  observacoes?: string;
}

export interface DetracaoPenalInput {
  penaTotal: number; // In days
  regimeInicial: 'fechado' | 'semiaberto' | 'aberto';
  periodosPrisao: PeriodoPrisao[];
  diasRemidos?: number;
  dataTransitoJulgado?: Date;
  dataInicioExecucao?: Date;
}

export interface DetracaoPenalOutput {
  penaTotalDias: number;
  detracaoDias: number;
  remicaoDias: number;
  penaCumprirDias: number;
  penaCumprida: number;
  percentualCumprido: number;
  regimeApurado: 'fechado' | 'semiaberto' | 'aberto' | 'livramento';
  dataPrevisaoTermino: Date;
  detalhamentoPeriodos: DetalhamentoPeriodo[];
  mudancaRegime?: {
    regimeOriginal: string;
    regimeApurado: string;
    fundamentacao: string;
  };
  fundamentacao: string;
}

export interface DetalhamentoPeriodo {
  tipo: TipoPrisao;
  dataInicio: string;
  dataFim: string;
  diasContados: number;
  detratavel: boolean;
  motivo?: string;
}

// Regime thresholds for penalty deduction
const LIMITES_REGIME = {
  fechado: 8 * 365, // More than 8 years
  semiaberto: 4 * 365, // 4 to 8 years
  aberto: 0, // Less than 4 years
};

/**
 * Calculate penalty deduction
 */
export function calcularDetracaoPenal(input: DetracaoPenalInput): DetracaoPenalOutput {
  const {
    penaTotal,
    regimeInicial,
    periodosPrisao,
    diasRemidos = 0,
    dataTransitoJulgado,
    dataInicioExecucao,
  } = input;

  // Calculate total detention days
  const detalhamentoPeriodos: DetalhamentoPeriodo[] = [];
  let detracaoTotal = 0;

  for (const periodo of periodosPrisao) {
    const diasPeriodo = differenceInDays(periodo.dataFim, periodo.dataInicio) + 1;
    const detratavel = verificarDetratavel(periodo, dataTransitoJulgado);

    detalhamentoPeriodos.push({
      tipo: periodo.tipo,
      dataInicio: format(periodo.dataInicio, 'dd/MM/yyyy', { locale: ptBR }),
      dataFim: format(periodo.dataFim, 'dd/MM/yyyy', { locale: ptBR }),
      diasContados: detratavel ? diasPeriodo : 0,
      detratavel,
      motivo: detratavel ? undefined : getMotivoNaoDetratavel(periodo),
    });

    if (detratavel) {
      detracaoTotal += diasPeriodo;
    }
  }

  // Calculate remaining penalty
  const penaCumprida = detracaoTotal + diasRemidos;
  const penaCumprirDias = Math.max(0, penaTotal - penaCumprida);
  const percentualCumprido = penaTotal > 0
    ? (penaCumprida / penaTotal) * 100
    : 0;

  // Determine appropriate regime after deduction
  const regimeApurado = determinarRegime(penaCumprirDias);

  // Check for regime change
  let mudancaRegime: { regimeOriginal: string; regimeApurado: string; fundamentacao: string } | undefined;

  if (regimeApurado !== regimeInicial && regimeInicial === 'fechado') {
    mudancaRegime = {
      regimeOriginal: regimeInicial,
      regimeApurado,
      fundamentacao: `Após detração de ${detracaoTotal} dias, a pena restante de ${penaCumprirDias} dias ` +
        `permite fixação de regime ${regimeApurado} (art. 33, §2º, CP c/c art. 42, CP).`,
    };
  }

  // Calculate estimated end date
  const dataBase = dataInicioExecucao || new Date();
  const dataPrevisaoTermino = addDays(dataBase, penaCumprirDias);

  const fundamentacao = buildFundamentacao(
    detracaoTotal,
    diasRemidos,
    penaTotal,
    penaCumprirDias
  );

  return {
    penaTotalDias: penaTotal,
    detracaoDias: detracaoTotal,
    remicaoDias: diasRemidos,
    penaCumprirDias,
    penaCumprida,
    percentualCumprido: Math.min(100, percentualCumprido),
    regimeApurado,
    dataPrevisaoTermino,
    detalhamentoPeriodos,
    mudancaRegime,
    fundamentacao,
  };
}

/**
 * Check if detention period is deductible
 */
function verificarDetratavel(periodo: PeriodoPrisao, transitoJulgado?: Date): boolean {
  // Civil prison is not deductible for criminal penalty
  if (periodo.tipo === 'prisao_civil') {
    return false;
  }

  // Provisional detention before sentence is deductible
  if (transitoJulgado && periodo.dataFim > transitoJulgado) {
    return false;
  }

  return true;
}

/**
 * Get reason for non-deductible period
 */
function getMotivoNaoDetratavel(periodo: PeriodoPrisao): string {
  if (periodo.tipo === 'prisao_civil') {
    return 'Prisão civil não é computada para detração penal (natureza diversa)';
  }

  return 'Período posterior ao trânsito em julgado já computado como execução';
}

/**
 * Determine regime based on remaining penalty
 */
function determinarRegime(diasRestantes: number): 'fechado' | 'semiaberto' | 'aberto' | 'livramento' {
  if (diasRestantes <= 0) {
    return 'livramento';
  }

  if (diasRestantes > LIMITES_REGIME.fechado) {
    return 'fechado';
  }

  if (diasRestantes > LIMITES_REGIME.semiaberto) {
    return 'semiaberto';
  }

  return 'aberto';
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  detracao: number,
  remicao: number,
  penaTotal: number,
  penaCumprir: number
): string {
  let base = `Cálculo de detração penal conforme art. 42 do Código Penal. `;

  base += `A detração consiste no cômputo, na pena privativa de liberdade, ` +
    `do tempo de prisão provisória cumprida no Brasil ou no estrangeiro. `;

  base += `\n\nResumo:\n`;
  base += `- Pena total: ${formatarDias(penaTotal)}\n`;
  base += `- Detração: ${formatarDias(detracao)}\n`;

  if (remicao > 0) {
    base += `- Remição: ${formatarDias(remicao)}\n`;
  }

  base += `- Pena a cumprir: ${formatarDias(penaCumprir)}\n`;

  base += `\nA detração também influencia na fixação do regime inicial de cumprimento ` +
    `(STJ, REsp 1.557.461/SC). Após descontar o tempo de prisão provisória, ` +
    `aplica-se o art. 33, §2º, do CP para definir o regime adequado.`;

  return base;
}

/**
 * Format days as years/months/days
 */
function formatarDias(dias: number): string {
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  const diasRestantes = dias % 30;

  const partes: string[] = [];

  if (anos > 0) partes.push(`${anos} ano${anos > 1 ? 's' : ''}`);
  if (meses > 0) partes.push(`${meses} ${meses > 1 ? 'meses' : 'mês'}`);
  if (diasRestantes > 0 || partes.length === 0) {
    partes.push(`${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`);
  }

  return partes.join(', ');
}

/**
 * Convert penalty to days
 */
export function converterPenaParaDias(anos: number, meses: number = 0, dias: number = 0): number {
  return anos * 365 + meses * 30 + dias;
}

/**
 * Calculate work remission (3 days worked = 1 day remitted)
 */
export function calcularRemicaoTrabalho(diasTrabalhados: number): number {
  return Math.floor(diasTrabalhados / 3);
}

/**
 * Calculate study remission (12 hours = 1 day remitted)
 */
export function calcularRemicaoEstudo(horasEstudo: number): number {
  return Math.floor(horasEstudo / 12);
}

/**
 * Validate detention periods (no overlaps)
 */
export function validarPeriodos(periodos: PeriodoPrisao[]): {
  valido: boolean;
  erros: string[];
} {
  const erros: string[] = [];

  // Sort by start date
  const ordenados = [...periodos].sort(
    (a, b) => a.dataInicio.getTime() - b.dataInicio.getTime()
  );

  for (let i = 0; i < ordenados.length - 1; i++) {
    const atual = ordenados[i];
    const proximo = ordenados[i + 1];

    // Check for overlaps
    if (atual.dataFim >= proximo.dataInicio) {
      erros.push(
        `Sobreposição de períodos: ${format(atual.dataFim, 'dd/MM/yyyy')} ` +
          `conflita com início em ${format(proximo.dataInicio, 'dd/MM/yyyy')}`
      );
    }

    // Check for invalid dates
    if (atual.dataFim < atual.dataInicio) {
      erros.push(`Período inválido: data fim anterior à data início`);
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

/**
 * Calculate total detention time considering overlaps
 */
export function calcularTempoTotalPrisao(periodos: PeriodoPrisao[]): number {
  if (periodos.length === 0) return 0;

  // Sort by start date
  const ordenados = [...periodos].sort(
    (a, b) => a.dataInicio.getTime() - b.dataInicio.getTime()
  );

  let totalDias = 0;
  let ultimaDataFim = new Date(0);

  for (const periodo of ordenados) {
    const inicio = periodo.dataInicio > ultimaDataFim ? periodo.dataInicio : ultimaDataFim;
    const fim = periodo.dataFim;

    if (fim > inicio) {
      totalDias += differenceInDays(fim, inicio) + 1;
      ultimaDataFim = fim;
    }
  }

  return totalDias;
}
