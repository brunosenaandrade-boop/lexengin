/**
 * Pensão Alimentícia Calculator
 * Calculates and updates alimony payments
 */

import Decimal from 'decimal.js';
import { differenceInMonths, addMonths } from 'date-fns';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoPensao = 'percentual_renda' | 'valor_fixo' | 'salarios_minimos' | 'misto';
export type TipoRenda = 'empregado' | 'autonomo' | 'empresario' | 'aposentado' | 'desempregado';
export type IndiceCorrecao = 'inpc' | 'ipca' | 'igpm' | 'salario_minimo';

export interface PensaoAlimenticiaInput {
  tipoPensao: TipoPensao;
  rendaMensalAlimentante: number;
  tipoRenda: TipoRenda;
  percentualPensao?: number; // For percentage-based
  valorFixo?: number; // For fixed value
  quantidadeSalariosMinimos?: number; // For SM-based
  dataFixacao: Date; // Date the alimony was set
  dataCalculo: Date;
  indiceCorrecao: IndiceCorrecao;
  incluirDecimoTerceiro: boolean;
  incluirFerias: boolean;
  incluirPLR: boolean;
  quantidadeFilhos: number;
  necessidadesEspeciais?: boolean;
}

export interface PensaoAlimenticiaOutput {
  valorMensal: number;
  valorCorrigido: number;
  percentualEfetivo: number;
  valorAnual: number;
  decimoTerceiro: number;
  tercoFerias: number;
  plrEstimado: number;
  totalAnual: number;
  detalhamento: DetalhamentoPensao;
  fundamentacao: string;
}

export interface DetalhamentoPensao {
  baseCalculo: number;
  descontos: {
    inss: number;
    irrf: number;
    outrosDescontos: number;
  };
  rendaLiquida: number;
  percentualAplicado: number;
  valorCalculado: number;
  correcaoMonetaria: number;
}

const SALARIO_MINIMO_2024 = 1412.00;

// Índices de correção mensais simplificados (em produção, viriam do BACEN)
const INDICES_MENSAIS = {
  inpc: 0.004, // ~0.4% ao mês
  ipca: 0.0035,
  igpm: 0.005,
  salario_minimo: 0.007, // Reajuste anual do SM
};

// INSS rates for calculation
const TETO_INSS = 7786.02;

/**
 * Calculate alimony payment
 */
export function calcularPensaoAlimenticia(input: PensaoAlimenticiaInput): PensaoAlimenticiaOutput {
  const {
    tipoPensao,
    rendaMensalAlimentante,
    tipoRenda,
    percentualPensao = 30,
    valorFixo = 0,
    quantidadeSalariosMinimos = 1,
    dataFixacao,
    dataCalculo,
    indiceCorrecao,
    incluirDecimoTerceiro,
    incluirFerias,
    incluirPLR,
    quantidadeFilhos,
  } = input;

  // Calculate net income
  const descontos = calcularDescontos(rendaMensalAlimentante, tipoRenda);
  const rendaLiquida = rendaMensalAlimentante - descontos.inss - descontos.irrf - descontos.outrosDescontos;

  // Calculate base alimony value
  let valorBase: number;
  let percentualEfetivo: number;

  switch (tipoPensao) {
    case 'percentual_renda':
      valorBase = new Decimal(rendaLiquida)
        .times(percentualPensao)
        .dividedBy(100)
        .toNumber();
      percentualEfetivo = percentualPensao;
      break;

    case 'valor_fixo':
      valorBase = valorFixo;
      percentualEfetivo = rendaLiquida > 0
        ? (valorFixo / rendaLiquida) * 100
        : 0;
      break;

    case 'salarios_minimos':
      valorBase = quantidadeSalariosMinimos * SALARIO_MINIMO_2024;
      percentualEfetivo = rendaLiquida > 0
        ? (valorBase / rendaLiquida) * 100
        : 0;
      break;

    case 'misto':
      // Fixed value + percentage of income above minimum
      const acimaSM = Math.max(0, rendaLiquida - SALARIO_MINIMO_2024);
      valorBase = valorFixo + new Decimal(acimaSM)
        .times(percentualPensao)
        .dividedBy(100)
        .toNumber();
      percentualEfetivo = rendaLiquida > 0
        ? (valorBase / rendaLiquida) * 100
        : 0;
      break;

    default:
      valorBase = 0;
      percentualEfetivo = 0;
  }

  // Apply monetary correction
  const mesesDecorridos = differenceInMonths(dataCalculo, dataFixacao);
  const taxaMensal = INDICES_MENSAIS[indiceCorrecao];
  const fatorCorrecao = Math.pow(1 + taxaMensal, mesesDecorridos);
  const correcaoMonetaria = valorBase * (fatorCorrecao - 1);
  const valorCorrigido = valorBase * fatorCorrecao;

  // Calculate annual extras
  const decimoTerceiro = incluirDecimoTerceiro ? valorCorrigido : 0;
  const tercoFerias = incluirFerias ? valorCorrigido / 3 : 0;
  const plrEstimado = incluirPLR ? valorCorrigido * 0.5 : 0; // Estimate 50% of salary

  const valorAnual = valorCorrigido * 12;
  const totalAnual = valorAnual + decimoTerceiro + tercoFerias + plrEstimado;

  const detalhamento: DetalhamentoPensao = {
    baseCalculo: rendaMensalAlimentante,
    descontos,
    rendaLiquida,
    percentualAplicado: percentualEfetivo,
    valorCalculado: valorBase,
    correcaoMonetaria,
  };

  const fundamentacao = buildFundamentacao(tipoPensao, quantidadeFilhos, percentualEfetivo);

  return {
    valorMensal: valorBase,
    valorCorrigido,
    percentualEfetivo,
    valorAnual,
    decimoTerceiro,
    tercoFerias,
    plrEstimado,
    totalAnual,
    detalhamento,
    fundamentacao,
  };
}

/**
 * Calculate income discounts
 */
function calcularDescontos(renda: number, tipo: TipoRenda): {
  inss: number;
  irrf: number;
  outrosDescontos: number;
} {
  let inss = 0;
  let irrf = 0;
  let outros = 0;

  if (tipo === 'empregado' || tipo === 'aposentado') {
    // INSS progressive calculation (simplified)
    const baseInss = Math.min(renda, TETO_INSS);
    inss = baseInss * 0.11; // Simplified average rate

    // IRRF (simplified)
    const baseIrrf = renda - inss;
    if (baseIrrf > 4664.68) {
      irrf = baseIrrf * 0.275 - 896;
    } else if (baseIrrf > 3751.05) {
      irrf = baseIrrf * 0.225 - 662.77;
    } else if (baseIrrf > 2826.65) {
      irrf = baseIrrf * 0.15 - 381.44;
    } else if (baseIrrf > 2259.20) {
      irrf = baseIrrf * 0.075 - 169.44;
    }
    irrf = Math.max(0, irrf);
  }

  return { inss, irrf, outrosDescontos: outros };
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  tipo: TipoPensao,
  filhos: number,
  percentual: number
): string {
  let base = `Cálculo realizado conforme arts. 1.694 a 1.710 do Código Civil ` +
    `e princípio do binômio necessidade-possibilidade. `;

  base += `A pensão alimentícia deve atender às necessidades do alimentando ` +
    `na medida das possibilidades do alimentante. `;

  if (filhos > 1) {
    base += `Para ${filhos} filhos, aplicou-se o percentual total de ${percentual.toFixed(1)}% ` +
      `sobre a renda líquida. `;
  } else {
    base += `Aplicou-se o percentual de ${percentual.toFixed(1)}% sobre a renda líquida. `;
  }

  base += `A jurisprudência costuma fixar entre 15% a 33% da renda líquida por filho, ` +
    `podendo variar conforme as necessidades específicas. `;

  if (tipo === 'salarios_minimos') {
    base += `A fixação em salários mínimos garante atualização automática (Súmula 490/STJ). `;
  }

  return base;
}

/**
 * Calculate alimony arrears
 */
export function calcularAtrasados(
  valorMensal: number,
  mesesAtraso: number,
  indice: IndiceCorrecao,
  juros: number = 1 // 1% monthly interest
): {
  principal: number;
  correcao: number;
  juros: number;
  total: number;
  parcelas: Array<{ mes: number; principal: number; correcao: number; juros: number; total: number }>;
} {
  const parcelas = [];
  let totalPrincipal = 0;
  let totalCorrecao = 0;
  let totalJuros = 0;

  const taxaCorrecao = INDICES_MENSAIS[indice];

  for (let i = 1; i <= mesesAtraso; i++) {
    const mesesAteHoje = mesesAtraso - i + 1;

    const correcaoParc = valorMensal * (Math.pow(1 + taxaCorrecao, mesesAteHoje) - 1);
    const jurosParc = (valorMensal + correcaoParc) * (juros / 100) * mesesAteHoje;

    parcelas.push({
      mes: i,
      principal: valorMensal,
      correcao: correcaoParc,
      juros: jurosParc,
      total: valorMensal + correcaoParc + jurosParc,
    });

    totalPrincipal += valorMensal;
    totalCorrecao += correcaoParc;
    totalJuros += jurosParc;
  }

  return {
    principal: totalPrincipal,
    correcao: totalCorrecao,
    juros: totalJuros,
    total: totalPrincipal + totalCorrecao + totalJuros,
    parcelas,
  };
}

/**
 * Suggest alimony percentage based on income and number of children
 */
export function sugerirPercentual(
  rendaLiquida: number,
  quantidadeFilhos: number,
  necessidadesEspeciais: boolean = false
): { minimo: number; sugerido: number; maximo: number } {
  // Base percentages per child
  let base = quantidadeFilhos <= 1 ? 20 : quantidadeFilhos * 15;

  // Adjust for special needs
  if (necessidadesEspeciais) {
    base += 10;
  }

  // Adjust for high income (can afford more)
  if (rendaLiquida > SALARIO_MINIMO_2024 * 10) {
    base = Math.min(base, 25); // Cap at 25% for high income
  }

  return {
    minimo: Math.max(10, base - 10),
    sugerido: base,
    maximo: Math.min(50, base + 10), // Never exceed 50% of income
  };
}
