/**
 * Correção Monetária Calculator
 * Calculates monetary correction using various indices
 */

import Decimal from 'decimal.js';
import { IndexType } from '@/types';
import { getIndexFromStatic, getMonthsBetween } from '../indices/fetcher';
import { formatDate } from '@/lib/utils/formatters';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface CorrecaoMonetariaInput {
  valorOriginal: number;
  dataInicio: Date;
  dataFim: Date;
  indice: IndexType;
  incluirJuros: boolean;
  taxaJuros?: number; // Monthly rate in percentage
  tipoJuros?: 'simples' | 'composto';
}

export interface CorrecaoMonetariaOutput {
  valorOriginal: number;
  valorCorrigido: number;
  correcaoMonetaria: number;
  juros: number;
  valorTotal: number;
  fatorCorrecao: number;
  percentualCorrecao: number;
  breakdown: CorrecaoBreakdownItem[];
}

export interface CorrecaoBreakdownItem {
  periodo: string;
  indice: number;
  fatorAcumulado: number;
  valorCorrigido: number;
  juros?: number;
}

/**
 * Calculate monetary correction
 */
export function calcularCorrecaoMonetaria(input: CorrecaoMonetariaInput): CorrecaoMonetariaOutput {
  const {
    valorOriginal,
    dataInicio,
    dataFim,
    indice,
    incluirJuros,
    taxaJuros = 1, // Default 1% a.m.
    tipoJuros = 'simples',
  } = input;

  let valorAtual = new Decimal(valorOriginal);
  let fatorAcumulado = new Decimal(1);
  let totalJuros = new Decimal(0);

  const breakdown: CorrecaoBreakdownItem[] = [];
  const meses = getMonthsBetween(dataInicio, dataFim);
  const taxaMensal = new Decimal(taxaJuros).dividedBy(100);

  for (let i = 0; i < meses.length; i++) {
    const mes = meses[i];
    const indiceMensal = new Decimal(getIndexFromStatic(indice, mes));

    // Apply index
    fatorAcumulado = fatorAcumulado.times(new Decimal(1).plus(indiceMensal));
    const valorCorrigido = new Decimal(valorOriginal).times(fatorAcumulado);

    // Calculate interest
    let jurosMes = new Decimal(0);
    if (incluirJuros) {
      if (tipoJuros === 'simples') {
        // Simple interest: calculated on original corrected value
        jurosMes = new Decimal(valorOriginal).times(taxaMensal);
        totalJuros = totalJuros.plus(jurosMes);
      } else {
        // Compound interest: calculated on accumulated value
        jurosMes = valorCorrigido.plus(totalJuros).times(taxaMensal);
        totalJuros = totalJuros.plus(jurosMes);
      }
    }

    breakdown.push({
      periodo: formatDate(mes, 'MM/yyyy'),
      indice: indiceMensal.times(100).toNumber(), // As percentage
      fatorAcumulado: fatorAcumulado.toNumber(),
      valorCorrigido: valorCorrigido.toNumber(),
      juros: jurosMes.toNumber(),
    });

    valorAtual = valorCorrigido;
  }

  const correcaoMonetaria = valorAtual.minus(valorOriginal);
  const valorTotal = valorAtual.plus(totalJuros);
  const percentualCorrecao = correcaoMonetaria.dividedBy(valorOriginal).times(100);

  return {
    valorOriginal,
    valorCorrigido: valorAtual.toNumber(),
    correcaoMonetaria: correcaoMonetaria.toNumber(),
    juros: totalJuros.toNumber(),
    valorTotal: valorTotal.toNumber(),
    fatorCorrecao: fatorAcumulado.toNumber(),
    percentualCorrecao: percentualCorrecao.toNumber(),
    breakdown,
  };
}

/**
 * Calculate simple correction (without month-by-month breakdown)
 */
export function calcularCorrecaoSimples(
  valor: number,
  fator: number,
  juros?: { taxa: number; meses: number; tipo: 'simples' | 'composto' }
): number {
  const valorCorrigido = new Decimal(valor).times(fator);

  if (!juros) {
    return valorCorrigido.toNumber();
  }

  const taxaMensal = new Decimal(juros.taxa).dividedBy(100);

  if (juros.tipo === 'simples') {
    const totalJuros = new Decimal(valor).times(taxaMensal).times(juros.meses);
    return valorCorrigido.plus(totalJuros).toNumber();
  } else {
    // Compound interest
    const fatorJuros = new Decimal(1).plus(taxaMensal).pow(juros.meses);
    return valorCorrigido.times(fatorJuros).toNumber();
  }
}

/**
 * Calculate SELIC rate (special case - already includes correction + interest)
 */
export function calcularCorrecaoSelic(
  valor: number,
  dataInicio: Date,
  dataFim: Date
): CorrecaoMonetariaOutput {
  // SELIC already includes monetary correction + interest
  return calcularCorrecaoMonetaria({
    valorOriginal: valor,
    dataInicio,
    dataFim,
    indice: 'selic',
    incluirJuros: false, // SELIC already includes interest
  });
}

/**
 * Validate input
 */
export function validateCorrecaoInput(input: Partial<CorrecaoMonetariaInput>): string[] {
  const errors: string[] = [];

  if (!input.valorOriginal || input.valorOriginal <= 0) {
    errors.push('Valor original deve ser maior que zero');
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

  if (!input.indice) {
    errors.push('Índice de correção é obrigatório');
  }

  if (input.incluirJuros && input.taxaJuros !== undefined && input.taxaJuros < 0) {
    errors.push('Taxa de juros não pode ser negativa');
  }

  return errors;
}

/**
 * Get index description
 */
export function getIndiceDescription(indice: IndexType): string {
  const descriptions: Record<IndexType, string> = {
    inpc: 'INPC - Índice Nacional de Preços ao Consumidor',
    ipca: 'IPCA - Índice de Preços ao Consumidor Amplo',
    tr: 'TR - Taxa Referencial',
    selic: 'SELIC - Sistema Especial de Liquidação e Custódia',
    cdi: 'CDI - Certificado de Depósito Interbancário',
    igpm: 'IGP-M - Índice Geral de Preços do Mercado',
    incc: 'INCC - Índice Nacional de Custo da Construção',
    ufir: 'UFIR - Unidade Fiscal de Referência',
  };

  return descriptions[indice] || indice.toUpperCase();
}
