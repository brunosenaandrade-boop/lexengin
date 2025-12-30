/**
 * Divórcio - Partilha de Bens Calculator
 * Calculates asset division in divorce proceedings
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type RegimeBens =
  | 'comunhao_parcial'
  | 'comunhao_universal'
  | 'separacao_total'
  | 'separacao_obrigatoria'
  | 'participacao_final_aquestos';

export type TipoBem =
  | 'imovel'
  | 'veiculo'
  | 'investimento'
  | 'empresa'
  | 'moveis'
  | 'outros';

export type OrigemBem =
  | 'adquirido_na_constancia' // Acquired during marriage
  | 'sub_rogacao' // Substitution of personal asset
  | 'heranca' // Inheritance
  | 'doacao' // Donation
  | 'anterior_casamento'; // Prior to marriage

export interface BemPartilha {
  id: string;
  descricao: string;
  tipo: TipoBem;
  origem: OrigemBem;
  valorAtual: number;
  valorAquisicao?: number;
  dataAquisicao?: Date;
  proprietario: 'conjuge_a' | 'conjuge_b' | 'ambos';
  onus?: number; // Mortgages, liens
  observacoes?: string;
}

export interface DividaPartilha {
  id: string;
  descricao: string;
  valor: number;
  responsavel: 'conjuge_a' | 'conjuge_b' | 'ambos';
  vinculadaBem?: string; // Linked to asset ID
}

export interface DivorcioInput {
  regimeBens: RegimeBens;
  dataCasamento: Date;
  dataSeparacao: Date;
  bens: BemPartilha[];
  dividas: DividaPartilha[];
  pensaoConjugal?: {
    valor: number;
    duracao: number; // months
    pagador: 'conjuge_a' | 'conjuge_b';
  };
}

export interface DivorcioOutput {
  patrimonioTotal: number;
  patrimonioLiquido: number;
  dividaTotal: number;
  partilha: {
    conjugeA: PartilhaConjuge;
    conjugeB: PartilhaConjuge;
  };
  bensExcluidos: BemPartilha[];
  bensComunicaveis: BemPartilha[];
  diferenca: number;
  tornaDevida?: {
    devedor: 'conjuge_a' | 'conjuge_b';
    valor: number;
  };
  fundamentacao: string;
}

export interface PartilhaConjuge {
  bensParticulares: BemPartilha[];
  bensComunhao: BemPartilha[];
  valorParticulares: number;
  valorComunhao: number;
  dividasAssumidas: DividaPartilha[];
  valorDividas: number;
  totalLiquido: number;
}

/**
 * Calculate divorce asset division
 */
export function calcularPartilhaDivorcio(input: DivorcioInput): DivorcioOutput {
  const { regimeBens, dataCasamento, bens, dividas, pensaoConjugal } = input;

  // Separate communicable and excluded assets
  const { comunicaveis, excluidos } = classificarBens(bens, regimeBens, dataCasamento);

  // Calculate totals
  const patrimonioTotal = bens.reduce((acc, bem) => acc + (bem.valorAtual - (bem.onus || 0)), 0);
  const dividaTotal = dividas
    .filter(d => d.responsavel === 'ambos')
    .reduce((acc, d) => acc + d.valor, 0);

  const patrimonioLiquido = patrimonioTotal - dividaTotal;

  // Calculate individual shares
  const partilhaA = calcularPartilhaConjuge('conjuge_a', comunicaveis, excluidos, dividas, regimeBens);
  const partilhaB = calcularPartilhaConjuge('conjuge_b', comunicaveis, excluidos, dividas, regimeBens);

  // Calculate communal assets division (50/50 for most regimes)
  const totalComunhao = comunicaveis.reduce((acc, bem) => acc + (bem.valorAtual - (bem.onus || 0)), 0);
  const dividaComunhao = dividas
    .filter(d => d.responsavel === 'ambos')
    .reduce((acc, d) => acc + d.valor, 0);

  const metadeComunhao = (totalComunhao - dividaComunhao) / 2;

  partilhaA.valorComunhao = metadeComunhao;
  partilhaB.valorComunhao = metadeComunhao;

  partilhaA.totalLiquido = partilhaA.valorParticulares + partilhaA.valorComunhao - partilhaA.valorDividas;
  partilhaB.totalLiquido = partilhaB.valorParticulares + partilhaB.valorComunhao - partilhaB.valorDividas;

  // Calculate difference and torna (compensation)
  const diferenca = Math.abs(partilhaA.totalLiquido - partilhaB.totalLiquido);
  let tornaDevida: { devedor: 'conjuge_a' | 'conjuge_b'; valor: number } | undefined;

  if (diferenca > 100) { // Threshold for torna
    tornaDevida = {
      devedor: partilhaA.totalLiquido > partilhaB.totalLiquido ? 'conjuge_a' : 'conjuge_b',
      valor: diferenca / 2,
    };
  }

  const fundamentacao = buildFundamentacao(regimeBens, comunicaveis.length, excluidos.length);

  return {
    patrimonioTotal,
    patrimonioLiquido,
    dividaTotal,
    partilha: {
      conjugeA: partilhaA,
      conjugeB: partilhaB,
    },
    bensExcluidos: excluidos,
    bensComunicaveis: comunicaveis,
    diferenca,
    tornaDevida,
    fundamentacao,
  };
}

/**
 * Classify assets as communicable or excluded based on regime
 */
function classificarBens(
  bens: BemPartilha[],
  regime: RegimeBens,
  dataCasamento: Date
): { comunicaveis: BemPartilha[]; excluidos: BemPartilha[] } {
  const comunicaveis: BemPartilha[] = [];
  const excluidos: BemPartilha[] = [];

  for (const bem of bens) {
    const ehComunicavel = verificarComunicabilidade(bem, regime, dataCasamento);

    if (ehComunicavel) {
      comunicaveis.push(bem);
    } else {
      excluidos.push(bem);
    }
  }

  return { comunicaveis, excluidos };
}

/**
 * Check if asset is communicable based on regime
 */
function verificarComunicabilidade(
  bem: BemPartilha,
  regime: RegimeBens,
  dataCasamento: Date
): boolean {
  switch (regime) {
    case 'comunhao_universal':
      // All assets are communicable except those excluded by law
      return bem.origem !== 'heranca' &&
        bem.origem !== 'doacao' &&
        !bem.descricao.toLowerCase().includes('gravado com cláusula');

    case 'comunhao_parcial':
      // Only assets acquired during marriage (aquestos) are communicable
      if (bem.origem === 'anterior_casamento' ||
          bem.origem === 'heranca' ||
          bem.origem === 'doacao' ||
          bem.origem === 'sub_rogacao') {
        return false;
      }
      // Check if acquired after marriage
      if (bem.dataAquisicao && bem.dataAquisicao < dataCasamento) {
        return false;
      }
      return true;

    case 'separacao_total':
    case 'separacao_obrigatoria':
      // No assets are communicable
      return false;

    case 'participacao_final_aquestos':
      // Similar to partial communion at dissolution
      return bem.origem === 'adquirido_na_constancia';

    default:
      return false;
  }
}

/**
 * Calculate individual spouse share
 */
function calcularPartilhaConjuge(
  conjuge: 'conjuge_a' | 'conjuge_b',
  comunicaveis: BemPartilha[],
  excluidos: BemPartilha[],
  dividas: DividaPartilha[],
  regime: RegimeBens
): PartilhaConjuge {
  // Personal assets (excluded from communion)
  const bensParticulares = excluidos.filter(b =>
    b.proprietario === conjuge || b.proprietario === 'ambos'
  );

  const valorParticulares = bensParticulares.reduce(
    (acc, bem) => acc + (bem.valorAtual - (bem.onus || 0)),
    0
  );

  // Communal assets (to be divided)
  const bensComunhao = comunicaveis.filter(b =>
    b.proprietario === 'ambos' ||
    b.proprietario === conjuge ||
    regime === 'comunhao_universal'
  );

  // Individual debts
  const dividasIndividuais = dividas.filter(d => d.responsavel === conjuge);
  const valorDividas = dividasIndividuais.reduce((acc, d) => acc + d.valor, 0);

  return {
    bensParticulares,
    bensComunhao,
    valorParticulares,
    valorComunhao: 0, // Calculated later
    dividasAssumidas: dividasIndividuais,
    valorDividas,
    totalLiquido: 0, // Calculated later
  };
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  regime: RegimeBens,
  totalComunicaveis: number,
  totalExcluidos: number
): string {
  let base = `Partilha de bens realizada conforme arts. 1.639 a 1.688 do Código Civil. `;

  switch (regime) {
    case 'comunhao_universal':
      base += `No regime de comunhão universal de bens (art. 1.667 CC), ` +
        `comunicam-se todos os bens presentes e futuros dos cônjuges, ` +
        `exceto os excluídos por lei (art. 1.668 CC). `;
      break;
    case 'comunhao_parcial':
      base += `No regime de comunhão parcial de bens (art. 1.658 CC), ` +
        `comunicam-se os bens adquiridos na constância do casamento (aquestos). ` +
        `Excluem-se os bens particulares de cada cônjuge (art. 1.659 CC). `;
      break;
    case 'separacao_total':
      base += `No regime de separação convencional de bens (art. 1.687 CC), ` +
        `cada cônjuge conserva a propriedade exclusiva de seus bens. `;
      break;
    case 'separacao_obrigatoria':
      base += `No regime de separação obrigatória de bens (art. 1.641 CC), ` +
        `aplica-se a Súmula 377/STF quanto aos bens adquiridos pelo esforço comum. `;
      break;
    case 'participacao_final_aquestos':
      base += `No regime de participação final nos aquestos (art. 1.672 CC), ` +
        `cada cônjuge possui patrimônio próprio e, na dissolução, ` +
        `tem direito à metade dos bens adquiridos pelo casal. `;
      break;
  }

  base += `Foram identificados ${totalComunicaveis} bens comunicáveis ` +
    `e ${totalExcluidos} bens excluídos da comunhão.`;

  return base;
}

/**
 * Validate property regime based on marriage date and spouse ages
 */
export function validarRegimeBens(
  dataCasamento: Date,
  idadeA: number,
  idadeB: number,
  regimeEscolhido: RegimeBens
): { valido: boolean; regimeObrigatorio?: RegimeBens; motivo?: string } {
  // Mandatory separation for people over 70 (since 2010) or 60 (before 2010)
  const limiteIdade = dataCasamento >= new Date('2010-12-07') ? 70 : 60;

  if (idadeA >= limiteIdade || idadeB >= limiteIdade) {
    if (regimeEscolhido !== 'separacao_obrigatoria') {
      return {
        valido: false,
        regimeObrigatorio: 'separacao_obrigatoria',
        motivo: `Separação obrigatória de bens para pessoas com ${limiteIdade}+ anos (art. 1.641, II, CC)`,
      };
    }
  }

  return { valido: true };
}

/**
 * Calculate spousal alimony
 */
export function calcularPensaoConjugal(
  rendaExConjuge: number,
  rendaRequerente: number,
  duracaoCasamento: number, // years
  idadeRequerente: number
): {
  cabivel: boolean;
  valorSugerido: number;
  duracaoSugerida: number;
  motivo: string;
} {
  // Check eligibility
  const diferencaRenda = rendaExConjuge - rendaRequerente;

  if (diferencaRenda <= 0) {
    return {
      cabivel: false,
      valorSugerido: 0,
      duracaoSugerida: 0,
      motivo: 'Requerente possui renda igual ou superior ao ex-cônjuge',
    };
  }

  // Calculate suggested value (typically 20-30% of the difference)
  const percentual = idadeRequerente > 50 ? 0.30 : 0.20;
  const valorSugerido = diferencaRenda * percentual;

  // Duration: typically 1/3 of marriage duration or until reintegration in job market
  const duracaoSugerida = Math.max(12, Math.min(duracaoCasamento * 4, 60)); // 1-5 years

  return {
    cabivel: true,
    valorSugerido,
    duracaoSugerida,
    motivo: `Diferença de renda significativa justifica alimentos transitórios`,
  };
}
