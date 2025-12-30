/**
 * INSS Contribution Calculator
 * Calculates social security contributions for different types of contributors
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoContribuinte =
  | 'empregado'
  | 'domestico'
  | 'contribuinte_individual'
  | 'facultativo'
  | 'mei'
  | 'segurado_especial';

export type PlanoContribuicao = 'normal' | 'simplificado' | 'baixa_renda';

export interface INSSInput {
  salarioBruto: number;
  tipoContribuinte: TipoContribuinte;
  planoContribuicao?: PlanoContribuicao; // For individual/facultative
  competencia: Date;
  incluirPatronal?: boolean; // For employers
  numeroEmpregados?: number; // For domestic employers
}

export interface INSSOutput {
  salarioBruto: number;
  baseCalculo: number;
  aliquotaEfetiva: number;
  contribuicaoSegurado: number;
  contribuicaoPatronal: number;
  totalContribuicao: number;
  tetoINSS: number;
  salarioContribuicao: number;
  faixasAplicadas: FaixaAplicada[];
  fundamentacao: string;
}

export interface FaixaAplicada {
  faixa: number;
  baseCalculo: number;
  aliquota: number;
  contribuicao: number;
}

// INSS rates 2024 (progressive rates for employees)
const TABELA_INSS_2024 = [
  { limite: 1412.00, aliquota: 0.075 },
  { limite: 2666.68, aliquota: 0.09 },
  { limite: 4000.03, aliquota: 0.12 },
  { limite: 7786.02, aliquota: 0.14 },
];

const TETO_INSS_2024 = 7786.02;
const SALARIO_MINIMO_2024 = 1412.00;

// Contribution rates for individual/facultative contributors
const ALIQUOTAS_CONTRIBUINTE = {
  normal: 0.20, // 20% (full benefits)
  simplificado: 0.11, // 11% (minimum wage only)
  baixa_renda: 0.05, // 5% (low income)
};

// MEI contribution (5% of minimum wage + fixed ISS/ICMS)
const ALIQUOTA_MEI = 0.05;

/**
 * Calculate INSS contribution
 */
export function calcularINSS(input: INSSInput): INSSOutput {
  const {
    salarioBruto,
    tipoContribuinte,
    planoContribuicao = 'normal',
    incluirPatronal = false,
    numeroEmpregados = 1,
  } = input;

  let baseCalculo = salarioBruto;
  let contribuicaoSegurado = 0;
  let contribuicaoPatronal = 0;
  let aliquotaEfetiva = 0;
  const faixasAplicadas: FaixaAplicada[] = [];

  // Cap at ceiling
  const salarioContribuicao = Math.min(salarioBruto, TETO_INSS_2024);

  switch (tipoContribuinte) {
    case 'empregado':
    case 'domestico':
      // Progressive calculation
      const resultado = calcularProgressivo(salarioContribuicao);
      contribuicaoSegurado = resultado.total;
      faixasAplicadas.push(...resultado.faixas);
      aliquotaEfetiva = (contribuicaoSegurado / salarioContribuicao) * 100;

      // Employer contribution (domestic)
      if (incluirPatronal && tipoContribuinte === 'domestico') {
        contribuicaoPatronal = new Decimal(salarioContribuicao)
          .times(0.08) // 8% for domestic employers
          .toNumber();
      }
      break;

    case 'contribuinte_individual':
    case 'facultativo':
      const aliquota = ALIQUOTAS_CONTRIBUINTE[planoContribuicao];

      if (planoContribuicao === 'simplificado' || planoContribuicao === 'baixa_renda') {
        // Simplified/low-income: only minimum wage as base
        baseCalculo = SALARIO_MINIMO_2024;
      }

      contribuicaoSegurado = new Decimal(baseCalculo)
        .times(aliquota)
        .toDecimalPlaces(2)
        .toNumber();

      aliquotaEfetiva = aliquota * 100;

      faixasAplicadas.push({
        faixa: 1,
        baseCalculo,
        aliquota: aliquota * 100,
        contribuicao: contribuicaoSegurado,
      });
      break;

    case 'mei':
      // MEI: 5% of minimum wage
      baseCalculo = SALARIO_MINIMO_2024;
      contribuicaoSegurado = new Decimal(baseCalculo)
        .times(ALIQUOTA_MEI)
        .toDecimalPlaces(2)
        .toNumber();
      aliquotaEfetiva = 5;

      faixasAplicadas.push({
        faixa: 1,
        baseCalculo,
        aliquota: 5,
        contribuicao: contribuicaoSegurado,
      });
      break;

    case 'segurado_especial':
      // Special insured (rural): 1.3% of gross revenue
      contribuicaoSegurado = new Decimal(salarioBruto)
        .times(0.013)
        .toDecimalPlaces(2)
        .toNumber();
      aliquotaEfetiva = 1.3;

      faixasAplicadas.push({
        faixa: 1,
        baseCalculo: salarioBruto,
        aliquota: 1.3,
        contribuicao: contribuicaoSegurado,
      });
      break;
  }

  const totalContribuicao = contribuicaoSegurado + contribuicaoPatronal;
  const fundamentacao = buildFundamentacao(tipoContribuinte, planoContribuicao);

  return {
    salarioBruto,
    baseCalculo,
    aliquotaEfetiva,
    contribuicaoSegurado,
    contribuicaoPatronal,
    totalContribuicao,
    tetoINSS: TETO_INSS_2024,
    salarioContribuicao,
    faixasAplicadas,
    fundamentacao,
  };
}

/**
 * Calculate progressive INSS
 */
function calcularProgressivo(base: number): { total: number; faixas: FaixaAplicada[] } {
  let total = 0;
  let baseRestante = base;
  let faixaAnterior = 0;
  const faixas: FaixaAplicada[] = [];

  for (let i = 0; i < TABELA_INSS_2024.length; i++) {
    const faixa = TABELA_INSS_2024[i];
    if (baseRestante <= 0) break;

    const baseFaixa = Math.min(baseRestante, faixa.limite - faixaAnterior);
    const contribuicao = new Decimal(baseFaixa)
      .times(faixa.aliquota)
      .toDecimalPlaces(2)
      .toNumber();

    total += contribuicao;
    baseRestante -= baseFaixa;

    faixas.push({
      faixa: i + 1,
      baseCalculo: baseFaixa,
      aliquota: faixa.aliquota * 100,
      contribuicao,
    });

    faixaAnterior = faixa.limite;
  }

  return { total, faixas };
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(tipo: TipoContribuinte, plano: PlanoContribuicao): string {
  let base = `Cálculo realizado conforme Lei 8.212/91 e EC 103/2019 (Reforma da Previdência). `;

  switch (tipo) {
    case 'empregado':
      base += `Contribuição do empregado com alíquotas progressivas de 7,5% a 14% ` +
        `sobre o salário de contribuição (art. 20, Lei 8.212/91 c/c EC 103/2019). `;
      break;
    case 'domestico':
      base += `Contribuição do empregado doméstico com alíquotas progressivas. ` +
        `O empregador contribui com 8% sobre o salário (LC 150/2015). `;
      break;
    case 'contribuinte_individual':
    case 'facultativo':
      if (plano === 'simplificado') {
        base += `Plano simplificado de previdência: alíquota de 11% sobre o salário mínimo ` +
          `(art. 21, §2º, I, Lei 8.212/91). Direito apenas à aposentadoria por idade. `;
      } else if (plano === 'baixa_renda') {
        base += `Contribuição de baixa renda: alíquota de 5% sobre o salário mínimo ` +
          `(art. 21, §2º, II, Lei 8.212/91). Aplicável a MEI e segurados de baixa renda. `;
      } else {
        base += `Contribuição de 20% sobre o salário de contribuição (art. 21, Lei 8.212/91). `;
      }
      break;
    case 'mei':
      base += `Microempreendedor Individual: contribuição de 5% sobre o salário mínimo ` +
        `(art. 18-A, §3º, VI, LC 123/2006). `;
      break;
    case 'segurado_especial':
      base += `Segurado especial: contribuição de 1,3% sobre a receita bruta da comercialização ` +
        `da produção (art. 25, Lei 8.212/91). `;
      break;
  }

  base += `Teto do INSS vigente: R$ ${TETO_INSS_2024.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;

  return base;
}

/**
 * Get current INSS table
 */
export function getTabelaINSS(): typeof TABELA_INSS_2024 {
  return TABELA_INSS_2024;
}

/**
 * Get INSS ceiling
 */
export function getTetoINSS(): number {
  return TETO_INSS_2024;
}

/**
 * Calculate effective rate for a given salary
 */
export function calcularAliquotaEfetiva(salarioBruto: number): number {
  const resultado = calcularINSS({
    salarioBruto,
    tipoContribuinte: 'empregado',
    competencia: new Date(),
  });
  return resultado.aliquotaEfetiva;
}
