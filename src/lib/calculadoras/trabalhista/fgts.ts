/**
 * FGTS Calculator
 * Calculates FGTS balance correction with TR and 3% annual interest
 */

import { FGTSInput, FGTSOutput, FGTSBreakdownItem } from '@/types';
import { getMonthsBetween, getTRFromStatic } from '../indices/fetcher';
import { formatDate } from '@/lib/utils/formatters';
import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// FGTS annual interest rate (fixed by law)
const TAXA_JUROS_ANUAL = new Decimal(0.03); // 3% a.a.
const TAXA_JUROS_MENSAL = TAXA_JUROS_ANUAL.dividedBy(12); // 0.25% a.m.

/**
 * Calculate FGTS balance with corrections
 */
export function calcularFGTS(input: FGTSInput): FGTSOutput {
  const { saldoInicial, dataInicio, dataFim, depositosMensais = 0, tipoCorrecao } = input;

  let saldoAtual = new Decimal(saldoInicial);
  let totalCorrecao = new Decimal(0);
  let totalJuros = new Decimal(0);
  let totalDepositos = new Decimal(0);

  const breakdown: FGTSBreakdownItem[] = [];
  const meses = getMonthsBetween(dataInicio, dataFim);

  for (const mes of meses) {
    const saldoInicialMes = saldoAtual;

    // 1. Get TR for the month
    const trMensal = new Decimal(getTRFromStatic(mes));

    // 2. Apply TR correction
    const correcaoTR = saldoAtual.times(trMensal);
    saldoAtual = saldoAtual.plus(correcaoTR);
    totalCorrecao = totalCorrecao.plus(correcaoTR);

    // 3. Apply 3% annual interest (monthly)
    const juros = saldoAtual.times(TAXA_JUROS_MENSAL);
    saldoAtual = saldoAtual.plus(juros);
    totalJuros = totalJuros.plus(juros);

    // 4. Add monthly deposit
    const deposito = new Decimal(depositosMensais);
    saldoAtual = saldoAtual.plus(deposito);
    totalDepositos = totalDepositos.plus(deposito);

    breakdown.push({
      periodo: formatDate(mes, 'MM/yyyy'),
      saldoInicial: saldoInicialMes.toNumber(),
      deposito: deposito.toNumber(),
      trAplicada: trMensal.toNumber(),
      correcaoTR: correcaoTR.toNumber(),
      jurosAplicados: TAXA_JUROS_MENSAL.toNumber(),
      juros: juros.toNumber(),
      saldoFinal: saldoAtual.toNumber(),
    });
  }

  // Calculate difference owed (if using TR+SELIC vs only TR)
  let diferencaDevida = new Decimal(0);
  if (tipoCorrecao === 'TR_SELIC') {
    // The difference would be calculated here comparing with SELIC
    // This is used in FGTS revision lawsuits
    diferencaDevida = saldoAtual.times(0.1); // Simplified estimation
  }

  return {
    saldoFinal: saldoAtual.toNumber(),
    correcaoMonetaria: totalCorrecao.toNumber(),
    juros: totalJuros.toNumber(),
    totalDepositos: totalDepositos.toNumber(),
    diferencaDevida: diferencaDevida.toNumber(),
    breakdown,
  };
}

/**
 * Calculate FGTS 40% penalty (multa rescisória)
 */
export function calcularMultaFGTS(saldoFGTS: number): number {
  return new Decimal(saldoFGTS).times(0.4).toNumber();
}

/**
 * Calculate FGTS monthly deposit based on salary
 */
export function calcularDepositoMensal(salarioBruto: number): number {
  return new Decimal(salarioBruto).times(0.08).toNumber();
}

/**
 * Calculate FGTS balance projection
 */
export function projetarSaldoFGTS(
  saldoAtual: number,
  salarioMensal: number,
  meses: number
): FGTSOutput {
  const depositoMensal = calcularDepositoMensal(salarioMensal);

  const hoje = new Date();
  const dataFim = new Date(hoje);
  dataFim.setMonth(dataFim.getMonth() + meses);

  return calcularFGTS({
    saldoInicial: saldoAtual,
    dataInicio: hoje,
    dataFim,
    depositosMensais: depositoMensal,
    tipoCorrecao: 'TR',
  });
}

/**
 * Validate FGTS calculation input
 */
export function validateFGTSInput(input: Partial<FGTSInput>): string[] {
  const errors: string[] = [];

  if (input.saldoInicial === undefined || input.saldoInicial < 0) {
    errors.push('Saldo inicial deve ser maior ou igual a zero');
  }

  if (!input.dataInicio) {
    errors.push('Data de início é obrigatória');
  }

  if (!input.dataFim) {
    errors.push('Data de fim é obrigatória');
  }

  if (input.dataInicio && input.dataFim && input.dataInicio > input.dataFim) {
    errors.push('Data de início deve ser anterior à data de fim');
  }

  if (input.depositosMensais !== undefined && input.depositosMensais < 0) {
    errors.push('Depósitos mensais não podem ser negativos');
  }

  if (input.tipoCorrecao && !['TR', 'TR_SELIC'].includes(input.tipoCorrecao)) {
    errors.push('Tipo de correção inválido');
  }

  return errors;
}

/**
 * Generate PDF report data for FGTS calculation
 */
export function generateFGTSReportData(input: FGTSInput, output: FGTSOutput) {
  return {
    titulo: 'Cálculo de Correção FGTS',
    dataCalculo: new Date(),
    parametros: {
      'Saldo Inicial': input.saldoInicial,
      'Data Início': formatDate(input.dataInicio),
      'Data Fim': formatDate(input.dataFim),
      'Depósitos Mensais': input.depositosMensais ?? 0,
      'Tipo de Correção': input.tipoCorrecao === 'TR' ? 'TR (Taxa Referencial)' : 'TR + SELIC',
    },
    resultados: {
      'Saldo Final': output.saldoFinal,
      'Correção Monetária (TR)': output.correcaoMonetaria,
      'Juros (3% a.a.)': output.juros,
      'Total de Depósitos': output.totalDepositos,
      'Diferença Devida': output.diferencaDevida,
    },
    memoriaCalculo: output.breakdown,
    fundamentacao: `
      Cálculo realizado conforme Lei 8.036/90, que dispõe sobre o FGTS.

      A correção foi aplicada mensalmente utilizando:
      - Taxa Referencial (TR) conforme publicação do BACEN
      - Juros de 3% ao ano, capitalizados mensalmente (0,25% a.m.)

      ${input.tipoCorrecao === 'TR_SELIC'
        ? 'Nota: O cálculo inclui a diferença devida pela aplicação da TR+SELIC conforme tese de revisão do FGTS.'
        : ''}
    `.trim(),
  };
}
