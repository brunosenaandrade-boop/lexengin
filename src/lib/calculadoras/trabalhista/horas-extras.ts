/**
 * Horas Extras Calculator
 * Calculates overtime pay with reflexes
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface HorasExtrasInput {
  salarioBase: number;
  horasMensais: number; // Usually 220 for monthly workers
  quantidadeHoras50: number;
  quantidadeHoras100: number;
  incluirReflexos: boolean;
  meses?: number; // For calculating reflexes
}

export interface HorasExtrasOutput {
  valorHoraNormal: number;
  valorHora50: number;
  valorHora100: number;
  totalHoras50: number;
  totalHoras100: number;
  subtotal: number;
  reflexoDSR: number;
  reflexoFerias: number;
  reflexo13: number;
  reflexoFGTS: number;
  totalReflexos: number;
  totalGeral: number;
  breakdown: HorasExtrasBreakdownItem[];
}

export interface HorasExtrasBreakdownItem {
  descricao: string;
  quantidade?: number;
  valorUnitario?: number;
  valor: number;
}

/**
 * Calculate overtime pay
 */
export function calcularHorasExtras(input: HorasExtrasInput): HorasExtrasOutput {
  const {
    salarioBase,
    horasMensais = 220,
    quantidadeHoras50,
    quantidadeHoras100,
    incluirReflexos,
    meses = 1,
  } = input;

  const salario = new Decimal(salarioBase);
  const breakdown: HorasExtrasBreakdownItem[] = [];

  // Calculate hourly rate
  const valorHoraNormal = salario.dividedBy(horasMensais);
  const valorHora50 = valorHoraNormal.times(1.5);
  const valorHora100 = valorHoraNormal.times(2);

  // Calculate overtime totals
  const totalHoras50 = valorHora50.times(quantidadeHoras50);
  const totalHoras100 = valorHora100.times(quantidadeHoras100);
  const subtotal = totalHoras50.plus(totalHoras100);

  breakdown.push({
    descricao: 'Valor da Hora Normal',
    valorUnitario: valorHoraNormal.toNumber(),
    valor: valorHoraNormal.toNumber(),
  });

  if (quantidadeHoras50 > 0) {
    breakdown.push({
      descricao: 'Horas Extras 50%',
      quantidade: quantidadeHoras50,
      valorUnitario: valorHora50.toNumber(),
      valor: totalHoras50.toNumber(),
    });
  }

  if (quantidadeHoras100 > 0) {
    breakdown.push({
      descricao: 'Horas Extras 100%',
      quantidade: quantidadeHoras100,
      valorUnitario: valorHora100.toNumber(),
      valor: totalHoras100.toNumber(),
    });
  }

  // Calculate reflexes if requested
  let reflexoDSR = new Decimal(0);
  let reflexoFerias = new Decimal(0);
  let reflexo13 = new Decimal(0);
  let reflexoFGTS = new Decimal(0);

  if (incluirReflexos) {
    // DSR Reflex (1/6 of overtime for 6-day week)
    reflexoDSR = subtotal.dividedBy(6);
    breakdown.push({
      descricao: 'Reflexo em DSR (1/6)',
      valor: reflexoDSR.toNumber(),
    });

    // Base for other reflexes includes DSR
    const baseReflexos = subtotal.plus(reflexoDSR);

    // Vacation Reflex (1/12 per month + 1/3)
    const feriasBase = baseReflexos.times(meses).dividedBy(12);
    reflexoFerias = feriasBase.plus(feriasBase.dividedBy(3));
    breakdown.push({
      descricao: `Reflexo em Férias + 1/3 (${meses} meses)`,
      valor: reflexoFerias.toNumber(),
    });

    // 13th Salary Reflex (1/12 per month)
    reflexo13 = baseReflexos.times(meses).dividedBy(12);
    breakdown.push({
      descricao: `Reflexo em 13º Salário (${meses} meses)`,
      valor: reflexo13.toNumber(),
    });

    // FGTS Reflex (8% of all)
    const baseFGTS = baseReflexos.plus(reflexoFerias).plus(reflexo13);
    reflexoFGTS = baseFGTS.times(0.08);
    breakdown.push({
      descricao: 'Reflexo em FGTS (8%)',
      valor: reflexoFGTS.toNumber(),
    });
  }

  const totalReflexos = reflexoDSR.plus(reflexoFerias).plus(reflexo13).plus(reflexoFGTS);
  const totalGeral = subtotal.plus(totalReflexos);

  breakdown.push({
    descricao: 'TOTAL GERAL',
    valor: totalGeral.toNumber(),
  });

  return {
    valorHoraNormal: valorHoraNormal.toNumber(),
    valorHora50: valorHora50.toNumber(),
    valorHora100: valorHora100.toNumber(),
    totalHoras50: totalHoras50.toNumber(),
    totalHoras100: totalHoras100.toNumber(),
    subtotal: subtotal.toNumber(),
    reflexoDSR: reflexoDSR.toNumber(),
    reflexoFerias: reflexoFerias.toNumber(),
    reflexo13: reflexo13.toNumber(),
    reflexoFGTS: reflexoFGTS.toNumber(),
    totalReflexos: totalReflexos.toNumber(),
    totalGeral: totalGeral.toNumber(),
    breakdown,
  };
}

/**
 * Calculate hourly rate from monthly salary
 */
export function calcularValorHora(salarioMensal: number, horasMensais: number = 220): number {
  return new Decimal(salarioMensal).dividedBy(horasMensais).toNumber();
}

/**
 * Validate input
 */
export function validateHorasExtrasInput(input: Partial<HorasExtrasInput>): string[] {
  const errors: string[] = [];

  if (!input.salarioBase || input.salarioBase <= 0) {
    errors.push('Salário base deve ser maior que zero');
  }

  if (input.quantidadeHoras50 === undefined && input.quantidadeHoras100 === undefined) {
    errors.push('Informe a quantidade de horas extras');
  }

  if (input.quantidadeHoras50 !== undefined && input.quantidadeHoras50 < 0) {
    errors.push('Quantidade de horas 50% não pode ser negativa');
  }

  if (input.quantidadeHoras100 !== undefined && input.quantidadeHoras100 < 0) {
    errors.push('Quantidade de horas 100% não pode ser negativa');
  }

  return errors;
}
