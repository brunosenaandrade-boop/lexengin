/**
 * Liquidação de Sentença Calculator
 * Calculates sentence liquidation with monetary correction, interest, and fees
 */

import Decimal from 'decimal.js';
import { differenceInMonths, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoProcesso =
  | 'civel'
  | 'trabalhista'
  | 'fazenda_publica'
  | 'previdenciario'
  | 'familia';

export type IndiceCorrecao = 'inpc' | 'ipca' | 'igpm' | 'tr' | 'selic' | 'ipca_e';
export type TipoJuros = 'simples' | 'compostos';

export interface ParcelaLiquidacao {
  descricao: string;
  valorOriginal: number;
  dataVencimento: Date;
  principal?: boolean;
  incluirCorrecao?: boolean;
  incluirJuros?: boolean;
}

export interface LiquidacaoInput {
  tipoProcesso: TipoProcesso;
  parcelas: ParcelaLiquidacao[];
  dataCalculo: Date;
  indiceCorrecao: IndiceCorrecao;
  tipoJuros: TipoJuros;
  taxaJuros: number; // Monthly rate
  dataInicioJuros?: Date; // Custom date for interest start
  honorariosAdvocaticios: number; // Percentage
  honorariosSucumbencia: number; // Percentage
  custasProcessuais?: number;
  multaArt475J?: boolean; // 10% fine for non-payment (CPC art. 523)
}

export interface LiquidacaoOutput {
  resumo: ResumoLiquidacao;
  parcelasCalculadas: ParcelaCalculada[];
  memoriaCalculo: MemoriaCalculoLiquidacao;
  fundamentacao: string;
}

export interface ResumoLiquidacao {
  valorOriginalTotal: number;
  correcaoMonetaria: number;
  juros: number;
  subtotal: number;
  honorariosAdvocaticios: number;
  honorariosSucumbencia: number;
  custasProcessuais: number;
  multaArt475J: number;
  valorTotal: number;
}

export interface ParcelaCalculada {
  descricao: string;
  valorOriginal: number;
  dataVencimento: string;
  mesesCorrecao: number;
  indiceAcumulado: number;
  valorCorrigido: number;
  mesesJuros: number;
  taxaJurosAcumulada: number;
  valorJuros: number;
  valorFinal: number;
}

export interface MemoriaCalculoLiquidacao {
  linhas: string[];
  formulas: string[];
  observacoes: string[];
}

// Simplified monthly correction rates (would come from BACEN API)
const INDICES_MENSAIS: Record<IndiceCorrecao, number> = {
  inpc: 0.004,
  ipca: 0.0035,
  igpm: 0.005,
  tr: 0.001,
  selic: 0.01,
  ipca_e: 0.0035,
};

/**
 * Calculate sentence liquidation
 */
export function calcularLiquidacao(input: LiquidacaoInput): LiquidacaoOutput {
  const {
    tipoProcesso,
    parcelas,
    dataCalculo,
    indiceCorrecao,
    tipoJuros,
    taxaJuros,
    dataInicioJuros,
    honorariosAdvocaticios,
    honorariosSucumbencia,
    custasProcessuais = 0,
    multaArt475J = false,
  } = input;

  const parcelasCalculadas: ParcelaCalculada[] = [];
  const memoriaCalculo: MemoriaCalculoLiquidacao = {
    linhas: [],
    formulas: [],
    observacoes: [],
  };

  let valorOriginalTotal = new Decimal(0);
  let correcaoTotal = new Decimal(0);
  let jurosTotal = new Decimal(0);

  memoriaCalculo.linhas.push(`MEMÓRIA DE CÁLCULO - LIQUIDAÇÃO DE SENTENÇA`);
  memoriaCalculo.linhas.push(`Data do cálculo: ${format(dataCalculo, 'dd/MM/yyyy', { locale: ptBR })}`);
  memoriaCalculo.linhas.push(`Índice de correção: ${indiceCorrecao.toUpperCase()}`);
  memoriaCalculo.linhas.push(`Taxa de juros: ${taxaJuros}% a.m. (${tipoJuros})`);
  memoriaCalculo.linhas.push(`---`);

  for (const parcela of parcelas) {
    const mesesCorrecao = differenceInMonths(dataCalculo, parcela.dataVencimento);
    const dataBaseJuros = dataInicioJuros || parcela.dataVencimento;
    const mesesJuros = differenceInMonths(dataCalculo, dataBaseJuros);

    // Calculate monetary correction
    const taxaMensal = INDICES_MENSAIS[indiceCorrecao];
    const indiceAcumulado = Math.pow(1 + taxaMensal, mesesCorrecao);
    const valorCorrigido = new Decimal(parcela.valorOriginal).times(indiceAcumulado);
    const correcao = valorCorrigido.minus(parcela.valorOriginal);

    // Calculate interest
    let valorJuros = new Decimal(0);
    let taxaJurosAcumulada = 0;

    if (parcela.incluirJuros !== false) {
      if (tipoJuros === 'simples') {
        taxaJurosAcumulada = (taxaJuros / 100) * mesesJuros;
        valorJuros = valorCorrigido.times(taxaJurosAcumulada);
      } else {
        taxaJurosAcumulada = Math.pow(1 + taxaJuros / 100, mesesJuros) - 1;
        valorJuros = valorCorrigido.times(taxaJurosAcumulada);
      }
    }

    const valorFinal = valorCorrigido.plus(valorJuros);

    parcelasCalculadas.push({
      descricao: parcela.descricao,
      valorOriginal: parcela.valorOriginal,
      dataVencimento: format(parcela.dataVencimento, 'dd/MM/yyyy', { locale: ptBR }),
      mesesCorrecao,
      indiceAcumulado,
      valorCorrigido: valorCorrigido.toNumber(),
      mesesJuros,
      taxaJurosAcumulada: taxaJurosAcumulada * 100,
      valorJuros: valorJuros.toNumber(),
      valorFinal: valorFinal.toNumber(),
    });

    // Update totals
    valorOriginalTotal = valorOriginalTotal.plus(parcela.valorOriginal);
    correcaoTotal = correcaoTotal.plus(correcao);
    jurosTotal = jurosTotal.plus(valorJuros);

    // Add to memory
    memoriaCalculo.linhas.push(`${parcela.descricao}:`);
    memoriaCalculo.linhas.push(`  Valor original: R$ ${parcela.valorOriginal.toFixed(2)}`);
    memoriaCalculo.linhas.push(`  Correção (${mesesCorrecao} meses): R$ ${correcao.toFixed(2)}`);
    memoriaCalculo.linhas.push(`  Juros (${mesesJuros} meses): R$ ${valorJuros.toFixed(2)}`);
    memoriaCalculo.linhas.push(`  Total parcela: R$ ${valorFinal.toFixed(2)}`);
    memoriaCalculo.linhas.push(``);
  }

  // Calculate subtotal
  const subtotal = valorOriginalTotal.plus(correcaoTotal).plus(jurosTotal);

  // Calculate fees
  const honorariosAdv = subtotal.times(honorariosAdvocaticios / 100);
  const honorariosSuc = subtotal.times(honorariosSucumbencia / 100);

  // Calculate penalty (art. 523 CPC - 10% for non-payment within 15 days)
  let multa = new Decimal(0);
  if (multaArt475J) {
    multa = subtotal.times(0.10);
    memoriaCalculo.observacoes.push(
      `Multa de 10% aplicada conforme art. 523, §1º do CPC (não pagamento no prazo de 15 dias)`
    );
  }

  // Calculate total
  const valorTotal = subtotal
    .plus(honorariosAdv)
    .plus(honorariosSuc)
    .plus(custasProcessuais)
    .plus(multa);

  const resumo: ResumoLiquidacao = {
    valorOriginalTotal: valorOriginalTotal.toNumber(),
    correcaoMonetaria: correcaoTotal.toNumber(),
    juros: jurosTotal.toNumber(),
    subtotal: subtotal.toNumber(),
    honorariosAdvocaticios: honorariosAdv.toNumber(),
    honorariosSucumbencia: honorariosSuc.toNumber(),
    custasProcessuais,
    multaArt475J: multa.toNumber(),
    valorTotal: valorTotal.toNumber(),
  };

  // Add summary to memory
  memoriaCalculo.linhas.push(`RESUMO:`);
  memoriaCalculo.linhas.push(`  Principal + Correção + Juros: R$ ${subtotal.toFixed(2)}`);
  memoriaCalculo.linhas.push(`  Honorários advocatícios (${honorariosAdvocaticios}%): R$ ${honorariosAdv.toFixed(2)}`);
  memoriaCalculo.linhas.push(`  Honorários sucumbenciais (${honorariosSucumbencia}%): R$ ${honorariosSuc.toFixed(2)}`);
  if (custasProcessuais > 0) {
    memoriaCalculo.linhas.push(`  Custas processuais: R$ ${custasProcessuais.toFixed(2)}`);
  }
  if (multa.greaterThan(0)) {
    memoriaCalculo.linhas.push(`  Multa art. 523 CPC (10%): R$ ${multa.toFixed(2)}`);
  }
  memoriaCalculo.linhas.push(`  TOTAL: R$ ${valorTotal.toFixed(2)}`);

  const fundamentacao = buildFundamentacao(tipoProcesso, indiceCorrecao, taxaJuros);

  return {
    resumo,
    parcelasCalculadas,
    memoriaCalculo,
    fundamentacao,
  };
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  tipoProcesso: TipoProcesso,
  indice: IndiceCorrecao,
  taxaJuros: number
): string {
  let base = `Liquidação de sentença conforme arts. 509 a 512 do CPC. `;

  switch (tipoProcesso) {
    case 'civel':
      base += `Correção monetária pelo ${indice.toUpperCase()} e juros de ${taxaJuros}% a.m. ` +
        `conforme art. 406 do CC. `;
      break;
    case 'trabalhista':
      base += `Correção monetária e juros conforme art. 39 da Lei 8.177/91 ` +
        `e Lei 13.467/2017 (Reforma Trabalhista). ` +
        `Após decisão do STF (ADC 58 e 59), aplica-se IPCA-E + juros da poupança na fase pré-judicial ` +
        `e taxa SELIC na fase judicial. `;
      break;
    case 'fazenda_publica':
      base += `Correção e juros conforme art. 1º-F da Lei 9.494/97 (redação da Lei 11.960/09). ` +
        `Aplicação da TR para correção e juros da poupança (após declaração de inconstitucionalidade ` +
        `pelo STF, aplica-se IPCA-E para correção). `;
      break;
    case 'previdenciario':
      base += `Correção pelo INPC (art. 41-A da Lei 8.213/91) e juros de 1% a.m. ` +
        `desde a citação (Súmula 204/STJ). `;
      break;
    case 'familia':
      base += `Correção monetária desde cada vencimento e juros de 1% a.m. ` +
        `desde a citação (art. 405, CC). `;
      break;
  }

  base += `Os honorários advocatícios são devidos nos termos do art. 85 do CPC.`;

  return base;
}

/**
 * Calculate correction index for period
 */
export function calcularIndiceAcumulado(
  dataInicio: Date,
  dataFim: Date,
  indice: IndiceCorrecao
): { indiceAcumulado: number; meses: number } {
  const meses = differenceInMonths(dataFim, dataInicio);
  const taxaMensal = INDICES_MENSAIS[indice];
  const indiceAcumulado = Math.pow(1 + taxaMensal, meses);

  return { indiceAcumulado, meses };
}

/**
 * Create installment plan
 */
export function calcularParcelamento(
  valorTotal: number,
  quantidadeParcelas: number,
  taxaJuros: number = 0
): Array<{ parcela: number; valor: number; juros: number; total: number }> {
  const parcelas = [];

  if (taxaJuros === 0) {
    // Simple division without interest
    const valorParcela = valorTotal / quantidadeParcelas;
    for (let i = 1; i <= quantidadeParcelas; i++) {
      parcelas.push({
        parcela: i,
        valor: valorParcela,
        juros: 0,
        total: valorParcela,
      });
    }
  } else {
    // Price table (constant installments)
    const taxa = taxaJuros / 100;
    const fator = (taxa * Math.pow(1 + taxa, quantidadeParcelas)) /
      (Math.pow(1 + taxa, quantidadeParcelas) - 1);
    const valorParcela = valorTotal * fator;

    let saldoDevedor = valorTotal;
    for (let i = 1; i <= quantidadeParcelas; i++) {
      const juros = saldoDevedor * taxa;
      const amortizacao = valorParcela - juros;
      saldoDevedor -= amortizacao;

      parcelas.push({
        parcela: i,
        valor: amortizacao,
        juros,
        total: valorParcela,
      });
    }
  }

  return parcelas;
}

/**
 * Validate liquidation against sentence limits
 */
export function validarLimitesSentenca(
  valorLiquidado: number,
  valorSentenca: number,
  tolerancia: number = 0.05
): { valido: boolean; diferenca: number; percentual: number } {
  const diferenca = valorLiquidado - valorSentenca;
  const percentual = (diferenca / valorSentenca) * 100;

  return {
    valido: Math.abs(percentual) <= tolerancia * 100,
    diferenca,
    percentual,
  };
}

/**
 * Generate executive calculation for enforcement
 */
export function gerarCalculoExecutivo(liquidacao: LiquidacaoOutput): string {
  const { resumo, memoriaCalculo } = liquidacao;

  let texto = `CÁLCULO PARA EXECUÇÃO\n\n`;
  texto += memoriaCalculo.linhas.join('\n');

  texto += `\n\nVALOR PARA EXPEDIÇÃO DE MANDADO: R$ ${resumo.valorTotal.toFixed(2)}`;
  texto += `\n\n(${valorPorExtenso(resumo.valorTotal)})`;

  return texto;
}

/**
 * Convert value to words (simplified)
 */
function valorPorExtenso(valor: number): string {
  // Simplified - would use a proper library
  return `${new Decimal(valor).toFixed(2).replace('.', ' reais e ')} centavos`;
}
