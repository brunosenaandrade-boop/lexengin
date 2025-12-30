/**
 * Aposentadoria Calculator
 * Calculates retirement eligibility and benefits after EC 103/2019
 */

import Decimal from 'decimal.js';
import { differenceInYears, differenceInMonths, addYears, addMonths } from 'date-fns';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoAposentadoria =
  | 'idade'
  | 'tempo_contribuicao'
  | 'especial'
  | 'professor'
  | 'deficiencia';

export type Sexo = 'masculino' | 'feminino';

export type RegimePrevidenciario = 'rgps' | 'rpps';

export interface AposentadoriaInput {
  dataNascimento: Date;
  sexo: Sexo;
  tipoAposentadoria: TipoAposentadoria;
  regime: RegimePrevidenciario;
  tempoContribuicaoMeses: number;
  dataInicioContribuicao?: Date;
  mediaSalariosContribuicao: number;
  carenciaCompleta: boolean; // 180 contributions minimum
  atividadeEspecial?: {
    tipo: '15_anos' | '20_anos' | '25_anos';
    tempoMeses: number;
  };
}

export interface AposentadoriaOutput {
  elegivel: boolean;
  motivoInelegibilidade?: string;
  tipoAposentadoria: TipoAposentadoria;
  idadeAtual: number;
  idadeMinima: number;
  idadeFaltante: number;
  tempoContribuicaoAnos: number;
  tempoMinimoAnos: number;
  tempoFaltanteMeses: number;
  dataElegibilidade: Date | null;
  coeficienteCalculo: number;
  valorEstimadoBeneficio: number;
  tetoINSS: number;
  regrasTransicao: RegraTransicao[];
  fundamentacao: string;
}

export interface RegraTransicao {
  nome: string;
  requisitos: string[];
  dataElegibilidade: Date | null;
  elegivel: boolean;
}

const TETO_INSS_2024 = 7786.02;
const PISO_INSS_2024 = 1412.00;

// Rules after EC 103/2019 (Reforma da Previdência)
const REQUISITOS_POS_REFORMA = {
  idade: {
    masculino: { idade: 65, contribuicao: 20 * 12 }, // 65 years, 20 years contribution
    feminino: { idade: 62, contribuicao: 15 * 12 }, // 62 years, 15 years contribution
  },
  tempo_contribuicao: {
    masculino: { idade: 65, contribuicao: 35 * 12 },
    feminino: { idade: 62, contribuicao: 30 * 12 },
  },
  professor: {
    masculino: { idade: 60, contribuicao: 25 * 12 },
    feminino: { idade: 57, contribuicao: 25 * 12 },
  },
  especial: {
    '15_anos': { idade: 55, contribuicao: 15 * 12 },
    '20_anos': { idade: 58, contribuicao: 20 * 12 },
    '25_anos': { idade: 60, contribuicao: 25 * 12 },
  },
};

/**
 * Calculate retirement eligibility and benefit
 */
export function calcularAposentadoria(input: AposentadoriaInput): AposentadoriaOutput {
  const {
    dataNascimento,
    sexo,
    tipoAposentadoria,
    tempoContribuicaoMeses,
    mediaSalariosContribuicao,
    carenciaCompleta,
    atividadeEspecial,
  } = input;

  const hoje = new Date();
  const idadeAtual = differenceInYears(hoje, dataNascimento);
  const tempoContribuicaoAnos = Math.floor(tempoContribuicaoMeses / 12);

  // Get requirements based on type
  let idadeMinima: number;
  let tempoMinimoMeses: number;

  if (tipoAposentadoria === 'especial' && atividadeEspecial) {
    const reqEspecial = REQUISITOS_POS_REFORMA.especial[atividadeEspecial.tipo];
    idadeMinima = reqEspecial.idade;
    tempoMinimoMeses = reqEspecial.contribuicao;
  } else if (tipoAposentadoria === 'professor') {
    idadeMinima = REQUISITOS_POS_REFORMA.professor[sexo].idade;
    tempoMinimoMeses = REQUISITOS_POS_REFORMA.professor[sexo].contribuicao;
  } else {
    const reqBase = REQUISITOS_POS_REFORMA[tipoAposentadoria] ||
      REQUISITOS_POS_REFORMA.idade;
    idadeMinima = reqBase[sexo].idade;
    tempoMinimoMeses = reqBase[sexo].contribuicao;
  }

  const tempoMinimoAnos = Math.floor(tempoMinimoMeses / 12);

  // Check eligibility
  const idadeFaltante = Math.max(0, idadeMinima - idadeAtual);
  const tempoFaltanteMeses = Math.max(0, tempoMinimoMeses - tempoContribuicaoMeses);

  const elegivelIdade = idadeAtual >= idadeMinima;
  const elegivelTempo = tempoContribuicaoMeses >= tempoMinimoMeses;
  const elegivel = elegivelIdade && elegivelTempo && carenciaCompleta;

  let motivoInelegibilidade: string | undefined;
  if (!elegivel) {
    const motivos: string[] = [];
    if (!elegivelIdade) {
      motivos.push(`faltam ${idadeFaltante} anos para atingir a idade mínima de ${idadeMinima} anos`);
    }
    if (!elegivelTempo) {
      const anosFaltantes = Math.ceil(tempoFaltanteMeses / 12);
      motivos.push(`faltam ${tempoFaltanteMeses} meses (${anosFaltantes} anos) de contribuição`);
    }
    if (!carenciaCompleta) {
      motivos.push('carência de 180 contribuições não atingida');
    }
    motivoInelegibilidade = motivos.join('; ');
  }

  // Calculate eligibility date
  let dataElegibilidade: Date | null = null;
  if (!elegivel) {
    const dataIdadeMinima = addYears(dataNascimento, idadeMinima);
    const dataTempoMinimo = addMonths(hoje, tempoFaltanteMeses);
    dataElegibilidade = dataIdadeMinima > dataTempoMinimo ? dataIdadeMinima : dataTempoMinimo;
  } else {
    dataElegibilidade = hoje;
  }

  // Calculate benefit coefficient (EC 103/2019)
  // 60% + 2% per year above minimum (men: 20 years, women: 15 years)
  const anosExcedentes = tempoContribuicaoAnos - (sexo === 'masculino' ? 20 : 15);
  const coeficienteBase = 60;
  const coeficienteAdicional = Math.max(0, anosExcedentes * 2);
  const coeficienteCalculo = Math.min(100, coeficienteBase + coeficienteAdicional);

  // Calculate estimated benefit
  const beneficioCalculado = new Decimal(mediaSalariosContribuicao)
    .times(coeficienteCalculo)
    .dividedBy(100)
    .toNumber();

  // Apply floor and ceiling
  const valorEstimadoBeneficio = Math.max(
    PISO_INSS_2024,
    Math.min(TETO_INSS_2024, beneficioCalculado)
  );

  // Transition rules
  const regrasTransicao = calcularRegrasTransicao(input, hoje);

  const fundamentacao = buildFundamentacao(
    tipoAposentadoria,
    sexo,
    coeficienteCalculo,
    tempoContribuicaoAnos
  );

  return {
    elegivel,
    motivoInelegibilidade,
    tipoAposentadoria,
    idadeAtual,
    idadeMinima,
    idadeFaltante,
    tempoContribuicaoAnos,
    tempoMinimoAnos,
    tempoFaltanteMeses,
    dataElegibilidade,
    coeficienteCalculo,
    valorEstimadoBeneficio,
    tetoINSS: TETO_INSS_2024,
    regrasTransicao,
    fundamentacao,
  };
}

/**
 * Calculate transition rules eligibility
 */
function calcularRegrasTransicao(input: AposentadoriaInput, hoje: Date): RegraTransicao[] {
  const { dataNascimento, sexo, tempoContribuicaoMeses } = input;
  const idadeAtual = differenceInYears(hoje, dataNascimento);
  const regras: RegraTransicao[] = [];

  // Rule 1: Progressive age (pedágio)
  const idadeProgressiva = sexo === 'masculino' ? 63 : 58; // Increases 6 months/year
  regras.push({
    nome: 'Idade Progressiva',
    requisitos: [
      `Idade mínima: ${idadeProgressiva} anos (aumenta 6 meses/ano)`,
      `Tempo contribuição: ${sexo === 'masculino' ? 35 : 30} anos`,
    ],
    dataElegibilidade: null,
    elegivel: idadeAtual >= idadeProgressiva &&
      tempoContribuicaoMeses >= (sexo === 'masculino' ? 420 : 360),
  });

  // Rule 2: Points (pontos)
  const pontosMinimos = sexo === 'masculino' ? 101 : 91; // Increases 1 point/year
  const pontosAtuais = idadeAtual + Math.floor(tempoContribuicaoMeses / 12);
  regras.push({
    nome: 'Pontos (Idade + Tempo)',
    requisitos: [
      `Pontos mínimos: ${pontosMinimos} (aumenta 1 ponto/ano até 105/100)`,
      `Tempo contribuição: ${sexo === 'masculino' ? 35 : 30} anos`,
      `Pontos atuais: ${pontosAtuais}`,
    ],
    dataElegibilidade: null,
    elegivel: pontosAtuais >= pontosMinimos &&
      tempoContribuicaoMeses >= (sexo === 'masculino' ? 420 : 360),
  });

  // Rule 3: 100% toll (pedágio 100%)
  regras.push({
    nome: 'Pedágio 100%',
    requisitos: [
      `Idade mínima: ${sexo === 'masculino' ? 60 : 57} anos`,
      `Tempo contribuição: ${sexo === 'masculino' ? 35 : 30} anos`,
      'Pedágio: 100% do tempo faltante em 13/11/2019',
    ],
    dataElegibilidade: null,
    elegivel: false, // Would need historical data
  });

  // Rule 4: 50% toll (pedágio 50%)
  regras.push({
    nome: 'Pedágio 50%',
    requisitos: [
      'Faltavam menos de 2 anos para aposentar em 13/11/2019',
      'Pedágio: 50% do tempo faltante',
      'Sem idade mínima',
    ],
    dataElegibilidade: null,
    elegivel: false, // Would need historical data
  });

  return regras;
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  tipo: TipoAposentadoria,
  sexo: Sexo,
  coeficiente: number,
  anosContribuicao: number
): string {
  let base = `Cálculo realizado conforme EC 103/2019 (Reforma da Previdência). `;

  base += `Para ${tipo === 'idade' ? 'aposentadoria por idade' : tipo === 'tempo_contribuicao' ? 'aposentadoria por tempo de contribuição' : tipo === 'especial' ? 'aposentadoria especial' : tipo === 'professor' ? 'aposentadoria de professor' : 'aposentadoria'}, ` +
    `${sexo === 'masculino' ? 'homens' : 'mulheres'} precisam cumprir os requisitos de idade e tempo de contribuição. `;

  base += `O coeficiente de cálculo é de ${coeficiente}% (60% + 2% por ano excedente ao mínimo). `;

  if (anosContribuicao >= 40) {
    base += `Com ${anosContribuicao} anos de contribuição, atinge-se o coeficiente máximo de 100%. `;
  }

  base += `O benefício está limitado ao teto do INSS de R$ ${TETO_INSS_2024.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ` +
    `e ao piso de R$ ${PISO_INSS_2024.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (salário mínimo).`;

  return base;
}

/**
 * Calculate years until retirement
 */
export function calcularTempoRestante(
  dataNascimento: Date,
  sexo: Sexo,
  tempoContribuicaoMeses: number
): { mesesParaIdade: number; mesesParaTempo: number; mesesTotal: number } {
  const hoje = new Date();
  const idadeAtual = differenceInYears(hoje, dataNascimento);
  const idadeMinima = sexo === 'masculino' ? 65 : 62;
  const tempoMinimo = sexo === 'masculino' ? 240 : 180; // 20 or 15 years

  const mesesParaIdade = Math.max(0, (idadeMinima - idadeAtual) * 12);
  const mesesParaTempo = Math.max(0, tempoMinimo - tempoContribuicaoMeses);
  const mesesTotal = Math.max(mesesParaIdade, mesesParaTempo);

  return { mesesParaIdade, mesesParaTempo, mesesTotal };
}
