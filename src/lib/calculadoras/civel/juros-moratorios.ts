/**
 * Juros Moratórios Calculator
 * Calculates late payment interest according to Brazilian law
 */

import Decimal from 'decimal.js';
import { differenceInDays, differenceInMonths, addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoJuros = 'simples' | 'compostos';
export type BaseJuros =
  | 'legal_1'        // 1% a.m. (CC art. 406)
  | 'selic'          // Taxa SELIC
  | 'cdi'            // CDI
  | 'contratual';    // Contractual rate

export type NaturezaObrigacao =
  | 'contratual'
  | 'extracontratual'
  | 'tributaria'
  | 'trabalhista'
  | 'fazenda_publica';

export interface JurosMoratoriosInput {
  valorPrincipal: number;
  dataVencimento: Date;
  dataCalculo: Date;
  tipoJuros: TipoJuros;
  baseJuros: BaseJuros;
  taxaContratual?: number; // Monthly rate if contractual
  naturezaObrigacao: NaturezaObrigacao;
  incluirCorrecao?: boolean; // Include monetary correction first
  indiceCorrecao?: 'inpc' | 'ipca' | 'igpm';
}

export interface JurosMoratoriosOutput {
  valorPrincipal: number;
  valorCorrigido: number;
  diasAtraso: number;
  mesesAtraso: number;
  taxaMensal: number;
  taxaAnual: number;
  valorJuros: number;
  valorTotal: number;
  evolucaoMensal: EvolucaoMensal[];
  fundamentacao: string;
}

export interface EvolucaoMensal {
  competencia: string;
  saldoInicial: number;
  taxaAplicada: number;
  jurosCalculados: number;
  saldoFinal: number;
}

// SELIC rates by year (simplified - would come from BACEN API)
const SELIC_ANUAL: Record<number, number> = {
  2024: 0.1175, // 11.75%
  2023: 0.1325,
  2022: 0.1375,
  2021: 0.0925,
  2020: 0.0450,
  2019: 0.0650,
};

/**
 * Calculate late payment interest
 */
export function calcularJurosMoratorios(input: JurosMoratoriosInput): JurosMoratoriosOutput {
  const {
    valorPrincipal,
    dataVencimento,
    dataCalculo,
    tipoJuros,
    baseJuros,
    taxaContratual = 1,
    naturezaObrigacao,
    incluirCorrecao = false,
    indiceCorrecao = 'ipca',
  } = input;

  // Calculate days and months overdue
  const diasAtraso = Math.max(0, differenceInDays(dataCalculo, dataVencimento));
  const mesesAtraso = Math.max(0, differenceInMonths(dataCalculo, dataVencimento));

  // Determine interest rate
  const { taxaMensal, taxaAnual } = determinarTaxa(baseJuros, taxaContratual, naturezaObrigacao);

  // Apply monetary correction if requested
  let valorCorrigido = valorPrincipal;
  if (incluirCorrecao) {
    const fatorCorrecao = calcularFatorCorrecao(dataVencimento, dataCalculo, indiceCorrecao);
    valorCorrigido = new Decimal(valorPrincipal).times(fatorCorrecao).toNumber();
  }

  // Calculate interest
  const { valorJuros, evolucaoMensal } = calcularJuros(
    valorCorrigido,
    dataVencimento,
    dataCalculo,
    tipoJuros,
    taxaMensal
  );

  const valorTotal = new Decimal(valorCorrigido).plus(valorJuros).toNumber();

  const fundamentacao = buildFundamentacao(
    naturezaObrigacao,
    baseJuros,
    tipoJuros,
    taxaMensal,
    taxaAnual
  );

  return {
    valorPrincipal,
    valorCorrigido,
    diasAtraso,
    mesesAtraso,
    taxaMensal,
    taxaAnual,
    valorJuros,
    valorTotal,
    evolucaoMensal,
    fundamentacao,
  };
}

/**
 * Determine interest rate based on type and obligation
 */
function determinarTaxa(
  baseJuros: BaseJuros,
  taxaContratual: number,
  naturezaObrigacao: NaturezaObrigacao
): { taxaMensal: number; taxaAnual: number } {
  switch (baseJuros) {
    case 'legal_1':
      // 1% monthly (CC art. 406)
      return { taxaMensal: 1, taxaAnual: 12 };

    case 'selic':
      // SELIC rate
      const selicAnual = SELIC_ANUAL[new Date().getFullYear()] || 0.1175;
      return {
        taxaMensal: (selicAnual / 12) * 100,
        taxaAnual: selicAnual * 100,
      };

    case 'cdi':
      // CDI (approximately 90% of SELIC)
      const cdiAnual = (SELIC_ANUAL[new Date().getFullYear()] || 0.1175) * 0.9;
      return {
        taxaMensal: (cdiAnual / 12) * 100,
        taxaAnual: cdiAnual * 100,
      };

    case 'contratual':
      return {
        taxaMensal: taxaContratual,
        taxaAnual: taxaContratual * 12,
      };

    default:
      return { taxaMensal: 1, taxaAnual: 12 };
  }
}

/**
 * Calculate interest (simple or compound)
 */
function calcularJuros(
  valorBase: number,
  dataInicio: Date,
  dataFim: Date,
  tipo: TipoJuros,
  taxaMensal: number
): { valorJuros: number; evolucaoMensal: EvolucaoMensal[] } {
  const evolucaoMensal: EvolucaoMensal[] = [];
  const taxaDecimal = new Decimal(taxaMensal).dividedBy(100);

  if (tipo === 'simples') {
    // Simple interest: J = P * r * t
    const meses = differenceInMonths(dataFim, dataInicio);
    const dias = differenceInDays(dataFim, dataInicio) % 30;
    const tempoTotal = meses + (dias / 30);

    const valorJuros = new Decimal(valorBase)
      .times(taxaDecimal)
      .times(tempoTotal)
      .toNumber();

    // Single entry for simple interest
    evolucaoMensal.push({
      competencia: `${format(dataInicio, 'MM/yyyy')} a ${format(dataFim, 'MM/yyyy')}`,
      saldoInicial: valorBase,
      taxaAplicada: taxaMensal * tempoTotal,
      jurosCalculados: valorJuros,
      saldoFinal: valorBase + valorJuros,
    });

    return { valorJuros, evolucaoMensal };
  } else {
    // Compound interest: monthly calculation
    let saldoAtual = new Decimal(valorBase);
    let dataAtual = new Date(dataInicio);
    let totalJuros = new Decimal(0);

    while (dataAtual < dataFim) {
      const saldoInicial = saldoAtual.toNumber();
      const jurosDoMes = saldoAtual.times(taxaDecimal);

      saldoAtual = saldoAtual.plus(jurosDoMes);
      totalJuros = totalJuros.plus(jurosDoMes);

      evolucaoMensal.push({
        competencia: format(dataAtual, 'MM/yyyy', { locale: ptBR }),
        saldoInicial,
        taxaAplicada: taxaMensal,
        jurosCalculados: jurosDoMes.toNumber(),
        saldoFinal: saldoAtual.toNumber(),
      });

      dataAtual = addMonths(dataAtual, 1);
    }

    return {
      valorJuros: totalJuros.toNumber(),
      evolucaoMensal,
    };
  }
}

/**
 * Calculate monetary correction factor
 */
function calcularFatorCorrecao(
  dataInicio: Date,
  dataFim: Date,
  indice: 'inpc' | 'ipca' | 'igpm'
): number {
  const meses = differenceInMonths(dataFim, dataInicio);

  // Simplified monthly rates (would come from BACEN API)
  const taxasMensais: Record<string, number> = {
    inpc: 0.004, // ~0.4% per month
    ipca: 0.0035,
    igpm: 0.005,
  };

  const taxaMensal = taxasMensais[indice];
  return Math.pow(1 + taxaMensal, meses);
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  natureza: NaturezaObrigacao,
  base: BaseJuros,
  tipo: TipoJuros,
  taxaMensal: number,
  taxaAnual: number
): string {
  let fundamentacao = '';

  switch (natureza) {
    case 'contratual':
      fundamentacao = `Juros moratórios em obrigação contratual, conforme art. 395 e 406 do Código Civil. `;
      break;
    case 'extracontratual':
      fundamentacao = `Juros moratórios em responsabilidade civil extracontratual, ` +
        `incidentes desde o evento danoso (Súmula 54/STJ). `;
      break;
    case 'tributaria':
      fundamentacao = `Juros moratórios sobre crédito tributário, conforme art. 161 do CTN. `;
      break;
    case 'trabalhista':
      fundamentacao = `Juros moratórios em crédito trabalhista, conforme art. 39 da Lei 8.177/91. `;
      break;
    case 'fazenda_publica':
      fundamentacao = `Juros moratórios contra a Fazenda Pública, conforme art. 1º-F da Lei 9.494/97. `;
      break;
  }

  switch (base) {
    case 'legal_1':
      fundamentacao += `Taxa de 1% ao mês conforme art. 406 do CC c/c art. 161, §1º do CTN. `;
      break;
    case 'selic':
      fundamentacao += `Taxa SELIC conforme art. 406 do CC (interpretação do STJ). `;
      break;
    case 'contratual':
      fundamentacao += `Taxa contratual de ${taxaMensal.toFixed(2)}% a.m. (${taxaAnual.toFixed(2)}% a.a.). `;
      break;
  }

  fundamentacao += tipo === 'simples'
    ? `Juros simples conforme cálculo linear.`
    : `Juros compostos com capitalização mensal.`;

  return fundamentacao;
}

/**
 * Calculate interest cap (usury limit)
 */
export function verificarLimiteUsura(taxaMensal: number): {
  valido: boolean;
  limiteAnual: number;
  taxaInformada: number;
  excesso?: number;
} {
  // Annual usury limit: 12% (Lei da Usura - Decreto 22.626/33)
  // Exception: financial institutions (regulated by BACEN)
  const limiteAnual = 12;
  const taxaAnual = taxaMensal * 12;

  return {
    valido: taxaAnual <= limiteAnual,
    limiteAnual,
    taxaInformada: taxaAnual,
    excesso: taxaAnual > limiteAnual ? taxaAnual - limiteAnual : undefined,
  };
}

/**
 * Calculate daily interest (pro rata die)
 */
export function calcularJurosDiario(
  valorPrincipal: number,
  taxaMensal: number,
  dias: number
): number {
  const taxaDiaria = new Decimal(taxaMensal).dividedBy(30).dividedBy(100);
  return new Decimal(valorPrincipal)
    .times(taxaDiaria)
    .times(dias)
    .toNumber();
}

/**
 * Convert annual to monthly rate
 */
export function converterTaxaAnualParaMensal(taxaAnual: number): number {
  // Equivalent monthly rate for compound interest
  return (Math.pow(1 + taxaAnual / 100, 1 / 12) - 1) * 100;
}

/**
 * Convert monthly to annual rate
 */
export function converterTaxaMensalParaAnual(taxaMensal: number): number {
  // Equivalent annual rate for compound interest
  return (Math.pow(1 + taxaMensal / 100, 12) - 1) * 100;
}
