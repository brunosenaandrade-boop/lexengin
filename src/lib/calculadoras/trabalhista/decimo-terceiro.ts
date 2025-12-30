/**
 * 13º Salário (Décimo Terceiro) Calculator
 * Calculates the 13th salary bonus according to Law 4.090/62
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoCalculo13 = 'integral' | 'proporcional' | 'primeira_parcela' | 'segunda_parcela';

export interface DecimoTerceiroInput {
  salarioBase: number;
  tipoCalculo: TipoCalculo13;
  mesesTrabalhados?: number; // 1-12, for proportional
  mediaComissoes?: number;
  mediaHorasExtras?: number;
  mediaAdicionalNoturno?: number;
  mediaOutrasVerbas?: number;
  valorPrimeiraParcela?: number; // For second installment calculation
  dependentesIR?: number;
  pensaoAlimenticia?: number;
}

export interface DecimoTerceiroOutput {
  salarioCalculo: number;
  valorBruto: number;
  primeiraParcela: number;
  segundaParcela: number;
  descontos: {
    inss: number;
    irrf: number;
    pensaoAlimenticia: number;
    outros: number;
  };
  valorLiquido: number;
  mesesConsiderados: number;
  avosDevidos: string;
  fundamentacao: string;
}

// INSS rates 2024
const INSS_FAIXAS = [
  { limite: 1412.00, aliquota: 0.075 },
  { limite: 2666.68, aliquota: 0.09 },
  { limite: 4000.03, aliquota: 0.12 },
  { limite: 7786.02, aliquota: 0.14 },
];

const TETO_INSS = 7786.02;

// IRRF rates 2024
const IRRF_FAIXAS = [
  { limite: 2259.20, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
];

const DEDUCAO_DEPENDENTE = 189.59;

/**
 * Calculate 13th salary
 */
export function calcularDecimoTerceiro(input: DecimoTerceiroInput): DecimoTerceiroOutput {
  const {
    salarioBase,
    tipoCalculo,
    mesesTrabalhados = 12,
    mediaComissoes = 0,
    mediaHorasExtras = 0,
    mediaAdicionalNoturno = 0,
    mediaOutrasVerbas = 0,
    valorPrimeiraParcela = 0,
    dependentesIR = 0,
    pensaoAlimenticia = 0,
  } = input;

  // Base calculation salary
  const salarioCalculo = new Decimal(salarioBase)
    .plus(mediaComissoes)
    .plus(mediaHorasExtras)
    .plus(mediaAdicionalNoturno)
    .plus(mediaOutrasVerbas)
    .toNumber();

  const meses = Math.min(12, Math.max(1, mesesTrabalhados));

  // Calculate gross value
  const valorBruto = new Decimal(salarioCalculo)
    .times(meses)
    .dividedBy(12)
    .toNumber();

  let primeiraParcela = 0;
  let segundaParcela = 0;
  let inss = 0;
  let irrf = 0;
  let valorLiquido = 0;

  switch (tipoCalculo) {
    case 'integral':
      // Full 13th (usually paid in December)
      primeiraParcela = new Decimal(valorBruto).dividedBy(2).toNumber();
      segundaParcela = new Decimal(valorBruto).minus(primeiraParcela).toNumber();
      inss = calcularINSS(valorBruto);
      irrf = calcularIRRF(valorBruto - inss, dependentesIR);
      valorLiquido = valorBruto - inss - irrf - pensaoAlimenticia;
      break;

    case 'proporcional':
      // Proportional (termination)
      inss = calcularINSS(valorBruto);
      irrf = calcularIRRF(valorBruto - inss, dependentesIR);
      valorLiquido = valorBruto - inss - irrf - pensaoAlimenticia;
      break;

    case 'primeira_parcela':
      // First installment (paid by November 30)
      // 50% of the projected gross, no discounts
      primeiraParcela = new Decimal(salarioCalculo).dividedBy(2).toNumber();
      valorLiquido = primeiraParcela;
      break;

    case 'segunda_parcela':
      // Second installment (paid by December 20)
      // Remaining amount with all discounts
      const totalBruto = new Decimal(salarioCalculo).times(meses).dividedBy(12);
      segundaParcela = totalBruto.minus(valorPrimeiraParcela).toNumber();

      // Discounts calculated on full 13th
      inss = calcularINSS(totalBruto.toNumber());
      irrf = calcularIRRF(totalBruto.toNumber() - inss, dependentesIR);

      valorLiquido = segundaParcela - inss - irrf - pensaoAlimenticia;
      break;
  }

  const avosDevidos = `${meses}/12`;

  const fundamentacao = buildFundamentacao(tipoCalculo, meses);

  return {
    salarioCalculo,
    valorBruto,
    primeiraParcela,
    segundaParcela,
    descontos: {
      inss,
      irrf,
      pensaoAlimenticia,
      outros: 0,
    },
    valorLiquido: Math.max(0, valorLiquido),
    mesesConsiderados: meses,
    avosDevidos,
    fundamentacao,
  };
}

/**
 * Calculate INSS (progressive rates)
 */
function calcularINSS(base: number): number {
  let inss = 0;
  let baseRestante = Math.min(base, TETO_INSS);
  let faixaAnterior = 0;

  for (const faixa of INSS_FAIXAS) {
    if (baseRestante <= 0) break;

    const baseFaixa = Math.min(baseRestante, faixa.limite - faixaAnterior);
    inss += baseFaixa * faixa.aliquota;
    baseRestante -= baseFaixa;
    faixaAnterior = faixa.limite;
  }

  return new Decimal(inss).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate IRRF
 */
function calcularIRRF(base: number, dependentes: number): number {
  // Deduct dependents
  const baseCalculo = base - (dependentes * DEDUCAO_DEPENDENTE);

  if (baseCalculo <= 0) return 0;

  for (const faixa of IRRF_FAIXAS) {
    if (baseCalculo <= faixa.limite) {
      const irrf = baseCalculo * faixa.aliquota - faixa.deducao;
      return Math.max(0, new Decimal(irrf).toDecimalPlaces(2).toNumber());
    }
  }

  return 0;
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(tipo: TipoCalculo13, meses: number): string {
  let base = `Cálculo realizado conforme Lei 4.090/62 e Decreto 57.155/65. `;

  switch (tipo) {
    case 'integral':
      base += `Gratificação natalina integral correspondente a ${meses}/12 avos do salário de dezembro.`;
      break;
    case 'proporcional':
      base += `Gratificação natalina proporcional correspondente a ${meses}/12 avos, ` +
        `devida na rescisão contratual (exceto justa causa).`;
      break;
    case 'primeira_parcela':
      base += `Primeira parcela (50%) a ser paga até 30 de novembro, ` +
        `sem desconto de INSS ou IRRF (art. 2º, Lei 4.749/65).`;
      break;
    case 'segunda_parcela':
      base += `Segunda parcela a ser paga até 20 de dezembro, ` +
        `com desconto de INSS e IRRF sobre o valor total da gratificação.`;
      break;
  }

  base += ` O 13º salário integra o cálculo de INSS e IRRF, sendo tributado separadamente do salário mensal.`;

  return base;
}

/**
 * Calculate months worked for proportional 13th
 */
export function calcularMesesTrabalhados(dataAdmissao: Date, dataCalculo: Date): number {
  const anoCalculo = dataCalculo.getFullYear();
  const inicioAno = new Date(anoCalculo, 0, 1);

  // Use the later date (admission or start of year)
  const dataInicio = dataAdmissao > inicioAno ? dataAdmissao : inicioAno;

  let meses = 0;

  for (let mes = dataInicio.getMonth(); mes <= dataCalculo.getMonth(); mes++) {
    const primeiroDia = new Date(anoCalculo, mes, 1);
    const ultimoDia = new Date(anoCalculo, mes + 1, 0);

    // If worked at least 15 days in the month, count it
    const inicioMes = dataInicio > primeiroDia ? dataInicio : primeiroDia;
    const fimMes = dataCalculo < ultimoDia ? dataCalculo : ultimoDia;

    const diasTrabalhados = Math.ceil(
      (fimMes.getTime() - inicioMes.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    if (diasTrabalhados >= 15) {
      meses++;
    }
  }

  return Math.min(12, meses);
}

/**
 * Simulate annual 13th salary payment schedule
 */
export function simularPagamentoAnual(salarioBase: number): {
  primeiraParcela: { valor: number; prazo: string };
  segundaParcela: { valor: number; prazo: string };
  total: number;
} {
  const primeiraParcela = new Decimal(salarioBase).dividedBy(2).toNumber();
  const inss = calcularINSS(salarioBase);
  const irrf = calcularIRRF(salarioBase - inss, 0);
  const segundaParcela = salarioBase - primeiraParcela - inss - irrf;

  return {
    primeiraParcela: {
      valor: primeiraParcela,
      prazo: '30 de novembro',
    },
    segundaParcela: {
      valor: Math.max(0, segundaParcela),
      prazo: '20 de dezembro',
    },
    total: primeiraParcela + Math.max(0, segundaParcela),
  };
}
