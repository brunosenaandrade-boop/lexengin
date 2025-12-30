/**
 * Férias Calculator
 * Calculates vacation pay according to CLT
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoFerias = 'integrais' | 'proporcionais' | 'dobradas' | 'abono';

export interface FeriasInput {
  salarioBase: number;
  tipoFerias: TipoFerias;
  diasFerias: number; // 30 for full, or less
  mesesTrabalhados?: number; // For proportional (1-12)
  mediaComissoes?: number;
  mediaHorasExtras?: number;
  mediaAdicionalNoturno?: number;
  mediaOutrasVerbas?: number;
  faltas?: number; // Absences in the period
  adiantamento13?: boolean; // Request 13th salary advance
}

export interface FeriasOutput {
  feriasBruto: number;
  tercoConstitucional: number;
  abonoPecuniario: number;
  tercoAbono: number;
  adiantamento13: number;
  totalBruto: number;
  descontos: {
    inss: number;
    irrf: number;
    outros: number;
  };
  totalLiquido: number;
  diasDireito: number;
  fundamentacao: string;
}

// INSS rates 2024
const INSS_FAIXAS = [
  { limite: 1412.00, aliquota: 0.075 },
  { limite: 2666.68, aliquota: 0.09 },
  { limite: 4000.03, aliquota: 0.12 },
  { limite: 7786.02, aliquota: 0.14 },
];

// IRRF rates 2024
const IRRF_FAIXAS = [
  { limite: 2259.20, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
];

/**
 * Calculate vacation days based on absences (CLT Art. 130)
 */
function calcularDiasDireito(faltas: number): number {
  if (faltas <= 5) return 30;
  if (faltas <= 14) return 24;
  if (faltas <= 23) return 18;
  if (faltas <= 32) return 12;
  return 0; // More than 32 absences = no vacation
}

/**
 * Calculate vacation pay
 */
export function calcularFerias(input: FeriasInput): FeriasOutput {
  const {
    salarioBase,
    tipoFerias,
    diasFerias,
    mesesTrabalhados = 12,
    mediaComissoes = 0,
    mediaHorasExtras = 0,
    mediaAdicionalNoturno = 0,
    mediaOutrasVerbas = 0,
    faltas = 0,
    adiantamento13 = false,
  } = input;

  // Calculate days entitled
  const diasDireito = calcularDiasDireito(faltas);

  // Base for calculation
  const baseCalculo = new Decimal(salarioBase)
    .plus(mediaComissoes)
    .plus(mediaHorasExtras)
    .plus(mediaAdicionalNoturno)
    .plus(mediaOutrasVerbas);

  // Daily rate
  const valorDiario = baseCalculo.dividedBy(30);

  // Calculate vacation value based on type
  let feriasBruto = new Decimal(0);
  let multiplicador = 1;

  switch (tipoFerias) {
    case 'integrais':
      feriasBruto = valorDiario.times(Math.min(diasFerias, diasDireito));
      break;

    case 'proporcionais':
      feriasBruto = baseCalculo.times(mesesTrabalhados).dividedBy(12);
      break;

    case 'dobradas':
      // Double vacation (CLT Art. 137) - employer delayed payment
      feriasBruto = valorDiario.times(Math.min(diasFerias, diasDireito));
      multiplicador = 2;
      break;

    case 'abono':
      // Only calculating the pecuniary bonus (1/3 of vacation)
      feriasBruto = valorDiario.times(10); // Max 10 days can be sold
      break;
  }

  // Apply multiplier for double vacation
  feriasBruto = feriasBruto.times(multiplicador);

  // Constitutional 1/3
  const tercoConstitucional = feriasBruto.dividedBy(3);

  // Pecuniary bonus (sell up to 10 days)
  let abonoPecuniario = new Decimal(0);
  let tercoAbono = new Decimal(0);

  if (tipoFerias === 'abono' || diasFerias < diasDireito) {
    const diasVendidos = Math.min(10, diasDireito - diasFerias);
    if (diasVendidos > 0) {
      abonoPecuniario = valorDiario.times(diasVendidos);
      tercoAbono = abonoPecuniario.dividedBy(3);
    }
  }

  // 13th salary advance (optional - up to 50%)
  let adiantamento13Valor = new Decimal(0);
  if (adiantamento13) {
    adiantamento13Valor = baseCalculo.dividedBy(2);
  }

  // Total bruto
  const totalBruto = feriasBruto
    .plus(tercoConstitucional)
    .plus(abonoPecuniario)
    .plus(tercoAbono)
    .plus(adiantamento13Valor);

  // Calculate INSS
  // Note: Pecuniary bonus is not subject to INSS
  const baseInss = feriasBruto.plus(tercoConstitucional).plus(adiantamento13Valor);
  const inss = calcularINSS(baseInss.toNumber());

  // Calculate IRRF
  const baseIrrf = baseInss.minus(inss);
  const irrf = calcularIRRF(baseIrrf.toNumber());

  const totalLiquido = totalBruto.minus(inss).minus(irrf);

  const fundamentacao = buildFundamentacao(tipoFerias, diasDireito, diasFerias);

  return {
    feriasBruto: feriasBruto.toNumber(),
    tercoConstitucional: tercoConstitucional.toNumber(),
    abonoPecuniario: abonoPecuniario.toNumber(),
    tercoAbono: tercoAbono.toNumber(),
    adiantamento13: adiantamento13Valor.toNumber(),
    totalBruto: totalBruto.toNumber(),
    descontos: {
      inss,
      irrf,
      outros: 0,
    },
    totalLiquido: totalLiquido.toNumber(),
    diasDireito,
    fundamentacao,
  };
}

/**
 * Calculate INSS (progressive rates)
 */
function calcularINSS(base: number): number {
  let inss = 0;
  let baseRestante = Math.min(base, INSS_FAIXAS[INSS_FAIXAS.length - 1].limite);
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
function calcularIRRF(base: number): number {
  for (const faixa of IRRF_FAIXAS) {
    if (base <= faixa.limite) {
      const irrf = base * faixa.aliquota - faixa.deducao;
      return Math.max(0, new Decimal(irrf).toDecimalPlaces(2).toNumber());
    }
  }
  return 0;
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(tipo: TipoFerias, diasDireito: number, diasGozados: number): string {
  let base = `Cálculo realizado conforme arts. 129 a 145 da CLT e art. 7º, XVII, da CF/88. `;

  switch (tipo) {
    case 'integrais':
      base += `Férias integrais de ${diasGozados} dias com acréscimo de 1/3 constitucional.`;
      break;
    case 'proporcionais':
      base += `Férias proporcionais calculadas na razão de 1/12 por mês trabalhado ou fração superior a 14 dias.`;
      break;
    case 'dobradas':
      base += `Férias em dobro (art. 137, CLT) devidas em razão de concessão fora do período legal.`;
      break;
    case 'abono':
      base += `Abono pecuniário correspondente a até 1/3 das férias (art. 143, CLT).`;
      break;
  }

  if (diasDireito < 30) {
    base += ` Dias de direito reduzidos para ${diasDireito} em razão de faltas injustificadas (art. 130, CLT).`;
  }

  return base;
}

/**
 * Calculate proportional months
 */
export function calcularMesesProporcionais(dataAdmissao: Date, dataCalculo: Date): number {
  const diffTime = dataCalculo.getTime() - dataAdmissao.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const meses = Math.floor(diffDays / 30);

  // Check if fraction is >= 15 days
  const diasRestantes = diffDays % 30;
  const mesesFinais = diasRestantes >= 15 ? meses + 1 : meses;

  return Math.min(12, Math.max(0, mesesFinais));
}

/**
 * Validate vacation period (must be within 12 months after acquisition)
 */
export function validarPeriodoConcessivo(
  dataAdmissao: Date,
  dataInicioFerias: Date
): { valido: boolean; vencidas: boolean; diasAtraso: number } {
  // Acquisition period: 12 months from admission
  const fimAquisitivo = new Date(dataAdmissao);
  fimAquisitivo.setFullYear(fimAquisitivo.getFullYear() + 1);

  // Concession period: 12 months after acquisition
  const fimConcessivo = new Date(fimAquisitivo);
  fimConcessivo.setFullYear(fimConcessivo.getFullYear() + 1);

  const vencidas = dataInicioFerias > fimConcessivo;
  const diasAtraso = vencidas
    ? Math.floor((dataInicioFerias.getTime() - fimConcessivo.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    valido: !vencidas,
    vencidas,
    diasAtraso,
  };
}
