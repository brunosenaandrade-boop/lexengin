/**
 * RMI (Renda Mensal Inicial) Calculator
 * Calculates the Initial Monthly Income for INSS benefits
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoBeneficio =
  | 'aposentadoria_idade'
  | 'aposentadoria_tempo'
  | 'aposentadoria_especial'
  | 'aposentadoria_invalidez'
  | 'auxilio_doenca'
  | 'auxilio_acidente'
  | 'pensao_morte';

export interface SalarioContribuicao {
  competencia: Date;
  valor: number;
  indiceCorrecao?: number;
  valorCorrigido?: number;
}

export interface RMIInput {
  tipoBeneficio: TipoBeneficio;
  salariosContribuicao: SalarioContribuicao[];
  dataCalculo: Date;
  sexo: 'masculino' | 'feminino';
  tempoContribuicaoMeses: number;
  atividadeEspecial?: boolean;
  invalidezGrave?: boolean; // For disability
  multiplosVinculos?: boolean;
}

export interface RMIOutput {
  mediaSalariosCorrigidos: number;
  coeficiente: number;
  rmiCalculada: number;
  rmiAplicada: number;
  tetoINSS: number;
  pisoINSS: number;
  quantidadeSalarios: number;
  salariosMaioresDescartados: number;
  memoriaCalculo: MemoriaCalculoRMI;
  fundamentacao: string;
}

export interface MemoriaCalculoRMI {
  salariosCorrigidos: SalarioContribuicao[];
  somaTotal: number;
  media: number;
  aplicacaoCoeficiente: string;
}

const TETO_INSS_2024 = 7786.02;
const PISO_INSS_2024 = 1412.00;

// Simplified INPC correction factors (would normally come from API)
// These are approximate factors for demonstration
const INPC_ACUMULADO: Record<number, number> = {
  2024: 1.0000,
  2023: 1.0340,
  2022: 1.0920,
  2021: 1.1800,
  2020: 1.2350,
  2019: 1.2750,
  2018: 1.3200,
  2017: 1.3450,
  2016: 1.4200,
  2015: 1.5600,
  2014: 1.6100,
};

/**
 * Calculate RMI (Initial Monthly Income)
 */
export function calcularRMI(input: RMIInput): RMIOutput {
  const {
    tipoBeneficio,
    salariosContribuicao,
    dataCalculo,
    sexo,
    tempoContribuicaoMeses,
    invalidezGrave = false,
  } = input;

  // Step 1: Correct all salaries to current value using INPC
  const salariosCorrigidos = corrigirSalarios(salariosContribuicao, dataCalculo);

  // Step 2: Calculate average (EC 103/2019 - all salaries since July 1994)
  // No longer discards lowest 20%
  const somaTotal = salariosCorrigidos.reduce((acc, s) => acc + (s.valorCorrigido || s.valor), 0);
  const quantidadeSalarios = salariosCorrigidos.length;
  const mediaSalariosCorrigidos = quantidadeSalarios > 0
    ? new Decimal(somaTotal).dividedBy(quantidadeSalarios).toNumber()
    : 0;

  // Step 3: Calculate coefficient based on benefit type
  const coeficiente = calcularCoeficiente(
    tipoBeneficio,
    sexo,
    tempoContribuicaoMeses,
    invalidezGrave
  );

  // Step 4: Apply coefficient to average
  const rmiCalculada = new Decimal(mediaSalariosCorrigidos)
    .times(coeficiente)
    .dividedBy(100)
    .toNumber();

  // Step 5: Apply floor and ceiling
  const rmiAplicada = Math.max(
    PISO_INSS_2024,
    Math.min(TETO_INSS_2024, rmiCalculada)
  );

  const memoriaCalculo: MemoriaCalculoRMI = {
    salariosCorrigidos,
    somaTotal,
    media: mediaSalariosCorrigidos,
    aplicacaoCoeficiente: `${mediaSalariosCorrigidos.toFixed(2)} × ${coeficiente}% = ${rmiCalculada.toFixed(2)}`,
  };

  const fundamentacao = buildFundamentacao(tipoBeneficio, coeficiente, tempoContribuicaoMeses);

  return {
    mediaSalariosCorrigidos,
    coeficiente,
    rmiCalculada,
    rmiAplicada,
    tetoINSS: TETO_INSS_2024,
    pisoINSS: PISO_INSS_2024,
    quantidadeSalarios,
    salariosMaioresDescartados: 0, // EC 103/2019 doesn't discard anymore
    memoriaCalculo,
    fundamentacao,
  };
}

/**
 * Correct salaries using INPC
 */
function corrigirSalarios(
  salarios: SalarioContribuicao[],
  dataCalculo: Date
): SalarioContribuicao[] {
  const anoCalculo = dataCalculo.getFullYear();

  return salarios.map((s) => {
    const anoSalario = s.competencia.getFullYear();
    const indice = INPC_ACUMULADO[anoSalario] || 1;
    const fatorCalculo = INPC_ACUMULADO[anoCalculo] || 1;

    const indiceCorrecao = fatorCalculo / indice;
    const valorCorrigido = new Decimal(s.valor)
      .times(indiceCorrecao)
      .toDecimalPlaces(2)
      .toNumber();

    return {
      ...s,
      indiceCorrecao,
      valorCorrigido,
    };
  });
}

/**
 * Calculate coefficient based on benefit type
 */
function calcularCoeficiente(
  tipoBeneficio: TipoBeneficio,
  sexo: 'masculino' | 'feminino',
  tempoContribuicaoMeses: number,
  invalidezGrave: boolean
): number {
  const anosContribuicao = Math.floor(tempoContribuicaoMeses / 12);
  const tempoMinimo = sexo === 'masculino' ? 20 : 15;

  switch (tipoBeneficio) {
    case 'aposentadoria_idade':
    case 'aposentadoria_tempo':
    case 'aposentadoria_especial':
      // 60% + 2% per year above minimum
      const anosExcedentes = Math.max(0, anosContribuicao - tempoMinimo);
      return Math.min(100, 60 + (anosExcedentes * 2));

    case 'aposentadoria_invalidez':
      // 60% + 2% per year above minimum (or 100% if work accident or severe disease)
      if (invalidezGrave) {
        return 100;
      }
      const anosExcInv = Math.max(0, anosContribuicao - tempoMinimo);
      return Math.min(100, 60 + (anosExcInv * 2));

    case 'auxilio_doenca':
      // 91% of the calculation salary
      return 91;

    case 'auxilio_acidente':
      // 50% of the calculation salary
      return 50;

    case 'pensao_morte':
      // 50% + 10% per dependent (max 100%)
      // Simplified: assume 1 dependent = 60%
      return 60;

    default:
      return 60;
  }
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  tipoBeneficio: TipoBeneficio,
  coeficiente: number,
  tempoMeses: number
): string {
  const anosContribuicao = Math.floor(tempoMeses / 12);

  let base = `Cálculo de RMI conforme EC 103/2019 e Lei 8.213/91. `;

  base += `A média aritmética simples considera todos os salários de contribuição desde julho/1994. `;

  switch (tipoBeneficio) {
    case 'aposentadoria_idade':
    case 'aposentadoria_tempo':
      base += `O coeficiente de ${coeficiente}% é calculado como 60% base ` +
        `+ 2% para cada ano excedente ao mínimo (${anosContribuicao} anos de contribuição). `;
      break;
    case 'aposentadoria_invalidez':
      base += `Para aposentadoria por incapacidade permanente, aplica-se o coeficiente de ${coeficiente}%. ` +
        `Quando decorrente de acidente de trabalho ou doença grave, o coeficiente é de 100%. `;
      break;
    case 'auxilio_doenca':
      base += `O auxílio por incapacidade temporária corresponde a 91% do salário de benefício (art. 61, Lei 8.213/91). `;
      break;
    case 'auxilio_acidente':
      base += `O auxílio-acidente corresponde a 50% do salário de benefício (art. 86, Lei 8.213/91). `;
      break;
    case 'pensao_morte':
      base += `A pensão por morte corresponde a 50% + 10% por dependente até o limite de 100% (EC 103/2019). `;
      break;
  }

  base += `O valor está limitado entre o piso (salário mínimo) e o teto do INSS.`;

  return base;
}

/**
 * Simulate salary history
 */
export function simularHistoricoSalarios(
  salarioAtual: number,
  mesesContribuicao: number,
  crescimentoAnual: number = 0.03
): SalarioContribuicao[] {
  const salarios: SalarioContribuicao[] = [];
  const hoje = new Date();

  for (let i = 0; i < mesesContribuicao; i++) {
    const competencia = new Date(hoje);
    competencia.setMonth(competencia.getMonth() - i);

    // Apply retroactive growth reduction
    const anosAtras = i / 12;
    const fatorReducao = Math.pow(1 - crescimentoAnual, anosAtras);
    const valor = new Decimal(salarioAtual).times(fatorReducao).toNumber();

    salarios.push({
      competencia,
      valor: Math.max(PISO_INSS_2024, valor),
    });
  }

  return salarios.reverse();
}

/**
 * Calculate projected RMI based on current salary
 */
export function projetarRMI(
  salarioAtual: number,
  sexo: 'masculino' | 'feminino',
  tempoContribuicaoAtual: number,
  anosAteAposentadoria: number
): RMIOutput {
  const tempoFinal = tempoContribuicaoAtual + (anosAteAposentadoria * 12);
  const salarios = simularHistoricoSalarios(salarioAtual, Math.min(360, tempoFinal));

  return calcularRMI({
    tipoBeneficio: 'aposentadoria_idade',
    salariosContribuicao: salarios,
    dataCalculo: new Date(),
    sexo,
    tempoContribuicaoMeses: tempoFinal,
  });
}
