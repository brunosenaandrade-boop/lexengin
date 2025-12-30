/**
 * Verbas Rescisórias Calculator
 * Calculates all termination payments based on dismissal type
 */

import Decimal from 'decimal.js';
import { formatDate } from '@/lib/utils/formatters';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoRescisao =
  | 'sem_justa_causa'
  | 'justa_causa'
  | 'pedido_demissao'
  | 'acordo_mutuo'
  | 'termino_contrato';

export interface VerbasRescisoriasInput {
  salarioBruto: number;
  dataAdmissao: Date;
  dataDemissao: Date;
  tipoRescisao: TipoRescisao;
  saldoFGTS: number;
  feriasVencidas: boolean;
  diasFeriasVencidas?: number;
  avisoPrevioCumprido: boolean;
  horasExtrasDevidas?: number;
  valorHoraExtra?: number;
}

export interface VerbasRescisoriasOutput {
  saldoSalario: number;
  avisoPrevio: number;
  diasAvisoPrevio: number;
  feriasVencidas: number;
  feriasProporcionais: number;
  tercoFerias: number;
  decimoTerceiroProporcional: number;
  multaFGTS: number;
  saldoFGTS: number;
  horasExtras: number;
  totalBruto: number;
  inss: number;
  irrf: number;
  totalLiquido: number;
  breakdown: VerbasBreakdownItem[];
}

export interface VerbasBreakdownItem {
  descricao: string;
  valor: number;
  tipo: 'credito' | 'debito';
}

/**
 * Calculate days of proportional notice based on years of service
 * Law 12.506/2011: 30 days + 3 days per year of service (max 90 days)
 */
function calcularDiasAvisoPrevio(anosServico: number): number {
  const diasAdicionais = Math.min(anosServico * 3, 60);
  return 30 + diasAdicionais;
}

/**
 * Calculate months worked in the year for 13th salary
 */
function calcularMesesTrabalhados(dataAdmissao: Date, dataDemissao: Date): number {
  const inicioAno = new Date(dataDemissao.getFullYear(), 0, 1);
  const dataInicio = dataAdmissao > inicioAno ? dataAdmissao : inicioAno;

  let meses = 0;
  const current = new Date(dataInicio);
  current.setDate(1);

  while (current <= dataDemissao) {
    const diaInicio = current.getMonth() === dataInicio.getMonth() ? dataInicio.getDate() : 1;
    const ultimoDiaMes = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
    const diaFim = current.getMonth() === dataDemissao.getMonth() ? dataDemissao.getDate() : ultimoDiaMes;

    const diasTrabalhados = diaFim - diaInicio + 1;
    if (diasTrabalhados >= 15) {
      meses++;
    }

    current.setMonth(current.getMonth() + 1);
  }

  return Math.min(meses, 12);
}

/**
 * Calculate proportional vacation days
 */
function calcularFeriasProporcionais(dataAdmissao: Date, dataDemissao: Date): number {
  const umAnoAtras = new Date(dataDemissao);
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  const inicioPeriodo = dataAdmissao > umAnoAtras ? dataAdmissao : umAnoAtras;
  const diffTime = dataDemissao.getTime() - inicioPeriodo.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const meses = Math.floor(diffDays / 30);

  return Math.min(meses, 12);
}

/**
 * Calculate INSS deduction
 */
function calcularINSS(salario: number): number {
  // 2024 INSS brackets
  const faixas = [
    { limite: 1412.00, aliquota: 0.075 },
    { limite: 2666.68, aliquota: 0.09 },
    { limite: 4000.03, aliquota: 0.12 },
    { limite: 7786.02, aliquota: 0.14 },
  ];

  let inss = new Decimal(0);
  let salarioRestante = new Decimal(salario);
  let limiteAnterior = new Decimal(0);

  for (const faixa of faixas) {
    const limiteFaixa = new Decimal(faixa.limite);
    const aliquota = new Decimal(faixa.aliquota);

    if (salarioRestante.lte(0)) break;

    const baseFaixa = Decimal.min(salarioRestante, limiteFaixa.minus(limiteAnterior));
    inss = inss.plus(baseFaixa.times(aliquota));

    salarioRestante = salarioRestante.minus(baseFaixa);
    limiteAnterior = limiteFaixa;
  }

  return inss.toNumber();
}

/**
 * Calculate IRRF deduction
 */
function calcularIRRF(salario: number, inss: number): number {
  const baseCalculo = new Decimal(salario).minus(inss);

  // 2024 IRRF brackets
  const faixas = [
    { limite: 2259.20, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
  ];

  for (const faixa of faixas) {
    if (baseCalculo.lte(faixa.limite)) {
      return baseCalculo.times(faixa.aliquota).minus(faixa.deducao).toNumber();
    }
  }

  return 0;
}

/**
 * Main calculation function
 */
export function calcularVerbasRescisorias(input: VerbasRescisoriasInput): VerbasRescisoriasOutput {
  const {
    salarioBruto,
    dataAdmissao,
    dataDemissao,
    tipoRescisao,
    saldoFGTS,
    feriasVencidas,
    diasFeriasVencidas = 30,
    avisoPrevioCumprido,
    horasExtrasDevidas = 0,
    valorHoraExtra = 0,
  } = input;

  const salario = new Decimal(salarioBruto);
  const breakdown: VerbasBreakdownItem[] = [];

  // Calculate time of service
  const diffTime = dataDemissao.getTime() - dataAdmissao.getTime();
  const anosServico = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));

  // 1. Saldo de Salário (days worked in the month)
  const diasNoMes = dataDemissao.getDate();
  const diasTotaisMes = new Date(dataDemissao.getFullYear(), dataDemissao.getMonth() + 1, 0).getDate();
  const saldoSalario = salario.times(diasNoMes).dividedBy(diasTotaisMes).toNumber();
  breakdown.push({ descricao: `Saldo de Salário (${diasNoMes} dias)`, valor: saldoSalario, tipo: 'credito' });

  // 2. Aviso Prévio
  let avisoPrevio = 0;
  let diasAvisoPrevio = 0;

  if (!avisoPrevioCumprido) {
    if (tipoRescisao === 'sem_justa_causa') {
      diasAvisoPrevio = calcularDiasAvisoPrevio(anosServico);
      avisoPrevio = salario.times(diasAvisoPrevio).dividedBy(30).toNumber();
      breakdown.push({ descricao: `Aviso Prévio Indenizado (${diasAvisoPrevio} dias)`, valor: avisoPrevio, tipo: 'credito' });
    } else if (tipoRescisao === 'acordo_mutuo') {
      diasAvisoPrevio = Math.floor(calcularDiasAvisoPrevio(anosServico) / 2);
      avisoPrevio = salario.times(diasAvisoPrevio).dividedBy(30).toNumber();
      breakdown.push({ descricao: `Aviso Prévio 50% (${diasAvisoPrevio} dias)`, valor: avisoPrevio, tipo: 'credito' });
    } else if (tipoRescisao === 'pedido_demissao') {
      // Employee may owe notice period (deducted)
      diasAvisoPrevio = 30;
      avisoPrevio = 0; // Not paid, could be deducted
    }
  }

  // 3. Férias Vencidas
  let valorFeriasVencidas = 0;
  if (feriasVencidas && tipoRescisao !== 'justa_causa') {
    valorFeriasVencidas = salario.times(diasFeriasVencidas).dividedBy(30).toNumber();
    breakdown.push({ descricao: `Férias Vencidas (${diasFeriasVencidas} dias)`, valor: valorFeriasVencidas, tipo: 'credito' });
  }

  // 4. Férias Proporcionais
  let feriasProporcionais = 0;
  if (tipoRescisao !== 'justa_causa') {
    const mesesFerias = calcularFeriasProporcionais(dataAdmissao, dataDemissao);
    feriasProporcionais = salario.times(mesesFerias).dividedBy(12).toNumber();
    breakdown.push({ descricao: `Férias Proporcionais (${mesesFerias}/12 avos)`, valor: feriasProporcionais, tipo: 'credito' });
  }

  // 5. 1/3 de Férias
  const tercoFerias = new Decimal(valorFeriasVencidas + feriasProporcionais).dividedBy(3).toNumber();
  if (tercoFerias > 0) {
    breakdown.push({ descricao: '1/3 Constitucional de Férias', valor: tercoFerias, tipo: 'credito' });
  }

  // 6. 13º Salário Proporcional
  let decimoTerceiro = 0;
  if (tipoRescisao !== 'justa_causa') {
    const meses13 = calcularMesesTrabalhados(dataAdmissao, dataDemissao);
    decimoTerceiro = salario.times(meses13).dividedBy(12).toNumber();
    breakdown.push({ descricao: `13º Salário Proporcional (${meses13}/12 avos)`, valor: decimoTerceiro, tipo: 'credito' });
  }

  // 7. Multa FGTS
  let multaFGTS = 0;
  if (tipoRescisao === 'sem_justa_causa') {
    multaFGTS = new Decimal(saldoFGTS).times(0.4).toNumber();
    breakdown.push({ descricao: 'Multa 40% FGTS', valor: multaFGTS, tipo: 'credito' });
  } else if (tipoRescisao === 'acordo_mutuo') {
    multaFGTS = new Decimal(saldoFGTS).times(0.2).toNumber();
    breakdown.push({ descricao: 'Multa 20% FGTS (Acordo)', valor: multaFGTS, tipo: 'credito' });
  }

  // 8. Horas Extras
  const horasExtras = new Decimal(horasExtrasDevidas).times(valorHoraExtra).toNumber();
  if (horasExtras > 0) {
    breakdown.push({ descricao: `Horas Extras (${horasExtrasDevidas}h)`, valor: horasExtras, tipo: 'credito' });
  }

  // Total Bruto
  const totalBruto = saldoSalario + avisoPrevio + valorFeriasVencidas + feriasProporcionais +
                     tercoFerias + decimoTerceiro + horasExtras;

  // Deductions
  const baseINSS = saldoSalario + horasExtras;
  const inss = calcularINSS(baseINSS);
  const irrf = Math.max(0, calcularIRRF(baseINSS, inss));

  breakdown.push({ descricao: 'INSS', valor: inss, tipo: 'debito' });
  if (irrf > 0) {
    breakdown.push({ descricao: 'IRRF', valor: irrf, tipo: 'debito' });
  }

  const totalLiquido = totalBruto - inss - irrf;

  return {
    saldoSalario,
    avisoPrevio,
    diasAvisoPrevio,
    feriasVencidas: valorFeriasVencidas,
    feriasProporcionais,
    tercoFerias,
    decimoTerceiroProporcional: decimoTerceiro,
    multaFGTS,
    saldoFGTS,
    horasExtras,
    totalBruto,
    inss,
    irrf,
    totalLiquido,
    breakdown,
  };
}

/**
 * Validate input
 */
export function validateVerbasRescisoriasInput(input: Partial<VerbasRescisoriasInput>): string[] {
  const errors: string[] = [];

  if (!input.salarioBruto || input.salarioBruto <= 0) {
    errors.push('Salário bruto deve ser maior que zero');
  }

  if (!input.dataAdmissao) {
    errors.push('Data de admissão é obrigatória');
  }

  if (!input.dataDemissao) {
    errors.push('Data de demissão é obrigatória');
  }

  if (input.dataAdmissao && input.dataDemissao && input.dataAdmissao > input.dataDemissao) {
    errors.push('Data de admissão deve ser anterior à data de demissão');
  }

  if (!input.tipoRescisao) {
    errors.push('Tipo de rescisão é obrigatório');
  }

  return errors;
}
