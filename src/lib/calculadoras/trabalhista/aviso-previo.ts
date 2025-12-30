/**
 * Aviso Prévio Calculator
 * Calculates notice period according to CLT and Law 12.506/2011
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoAviso = 'trabalhado' | 'indenizado' | 'cumprido_parcialmente';
export type TipoDispensa = 'empregador' | 'empregado';

export interface AvisoPrevioInput {
  salarioBase: number;
  tipoAviso: TipoAviso;
  tipoDispensa: TipoDispensa;
  anosCompletos: number; // Years of service
  mediaComissoes?: number;
  mediaHorasExtras?: number;
  mediaAdicionalNoturno?: number;
  mediaOutrasVerbas?: number;
  diasCumpridos?: number; // For partially worked notice
}

export interface AvisoPrevioOutput {
  diasTotais: number;
  diasBase: number;
  diasAdicionais: number;
  valorDia: number;
  valorTotal: number;
  valorIndenizado: number;
  projecaoFerias: number;
  projecao13: number;
  projecaoFGTS: number;
  dataTermino: Date;
  reducaoJornada: ReducaoJornada;
  fundamentacao: string;
}

export interface ReducaoJornada {
  tipo: '2_horas_dia' | '7_dias_corridos';
  descricao: string;
}

/**
 * Calculate notice period days according to Law 12.506/2011
 * 30 days base + 3 days per year of service (max 90 days total)
 */
function calcularDiasAviso(anosCompletos: number): { total: number; base: number; adicionais: number } {
  const diasBase = 30;
  const diasAdicionais = Math.min(60, anosCompletos * 3);
  const total = diasBase + diasAdicionais;

  return {
    total: Math.min(90, total),
    base: diasBase,
    adicionais: diasAdicionais,
  };
}

/**
 * Calculate notice period value
 */
export function calcularAvisoPrevio(input: AvisoPrevioInput): AvisoPrevioOutput {
  const {
    salarioBase,
    tipoAviso,
    tipoDispensa,
    anosCompletos,
    mediaComissoes = 0,
    mediaHorasExtras = 0,
    mediaAdicionalNoturno = 0,
    mediaOutrasVerbas = 0,
    diasCumpridos = 0,
  } = input;

  // Calculate total notice days
  const { total: diasTotais, base: diasBase, adicionais: diasAdicionais } = calcularDiasAviso(anosCompletos);

  // Base calculation salary
  const salarioCalculo = new Decimal(salarioBase)
    .plus(mediaComissoes)
    .plus(mediaHorasExtras)
    .plus(mediaAdicionalNoturno)
    .plus(mediaOutrasVerbas);

  // Daily value
  const valorDia = salarioCalculo.dividedBy(30).toNumber();

  // Total notice value
  const valorTotal = new Decimal(valorDia).times(diasTotais).toNumber();

  // Calculate indemnified value based on type
  let valorIndenizado = 0;
  let diasEfetivos = diasTotais;

  switch (tipoAviso) {
    case 'trabalhado':
      // No indemnification needed
      valorIndenizado = 0;
      break;

    case 'indenizado':
      // Full indemnification
      if (tipoDispensa === 'empregador') {
        // Employer pays the employee
        valorIndenizado = valorTotal;
      } else {
        // Employee who quits without notice must compensate employer
        valorIndenizado = new Decimal(valorDia).times(30).toNumber(); // Only 30 days
      }
      break;

    case 'cumprido_parcialmente':
      // Partial notice - pay remaining days
      diasEfetivos = Math.max(0, diasTotais - diasCumpridos);
      valorIndenizado = new Decimal(valorDia).times(diasEfetivos).toNumber();
      break;
  }

  // Projections (notice period counts for all labor calculations)
  const projecaoFerias = new Decimal(salarioCalculo)
    .times(diasTotais)
    .dividedBy(360)
    .times(new Decimal(4).dividedBy(3)) // Include 1/3
    .toNumber();

  const projecao13 = new Decimal(salarioCalculo)
    .times(diasTotais)
    .dividedBy(360)
    .toNumber();

  const projecaoFGTS = new Decimal(salarioCalculo)
    .plus(projecaoFerias)
    .plus(projecao13)
    .times(0.08)
    .toNumber();

  // Calculate end date
  const hoje = new Date();
  const dataTermino = new Date(hoje);
  dataTermino.setDate(dataTermino.getDate() + diasTotais);

  // Working hours reduction options (CLT Art. 488)
  const reducaoJornada: ReducaoJornada = tipoDispensa === 'empregador'
    ? {
        tipo: '2_horas_dia',
        descricao: 'Redução de 2 horas diárias ou 7 dias corridos no final do aviso (escolha do empregado)',
      }
    : {
        tipo: '7_dias_corridos',
        descricao: 'Sem direito a redução de jornada (pedido de demissão)',
      };

  const fundamentacao = buildFundamentacao(tipoAviso, tipoDispensa, diasTotais, anosCompletos);

  return {
    diasTotais,
    diasBase,
    diasAdicionais,
    valorDia,
    valorTotal,
    valorIndenizado,
    projecaoFerias,
    projecao13,
    projecaoFGTS,
    dataTermino,
    reducaoJornada,
    fundamentacao,
  };
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  tipoAviso: TipoAviso,
  tipoDispensa: TipoDispensa,
  diasTotais: number,
  anos: number
): string {
  let base = `Cálculo realizado conforme art. 487 da CLT e Lei 12.506/2011. `;

  // Explain the proportional calculation
  if (anos > 0) {
    base += `Considerando ${anos} ano${anos > 1 ? 's' : ''} completo${anos > 1 ? 's' : ''} de serviço, ` +
      `o aviso prévio é de ${diasTotais} dias (30 dias base + ${anos * 3} dias proporcionais). `;
  } else {
    base += `Aviso prévio de 30 dias (período mínimo legal). `;
  }

  switch (tipoAviso) {
    case 'trabalhado':
      base += `Aviso prévio trabalhado: o empregado cumpre o período com direito a redução de 2 horas diárias ` +
        `ou 7 dias corridos no final (art. 488, CLT). `;
      break;
    case 'indenizado':
      if (tipoDispensa === 'empregador') {
        base += `Aviso prévio indenizado: o empregador dispensa o trabalho e paga o valor correspondente. `;
      } else {
        base += `Aviso prévio não cumprido: o empregado que pede demissão sem cumprir o aviso ` +
          `autoriza o desconto do valor equivalente a 30 dias (art. 487, §2º, CLT). `;
      }
      break;
    case 'cumprido_parcialmente':
      base += `Aviso prévio cumprido parcialmente: os dias restantes são indenizados. `;
      break;
  }

  base += `O período de aviso prévio integra o tempo de serviço para todos os efeitos legais (art. 487, §1º, CLT).`;

  return base;
}

/**
 * Calculate notice period table for all years
 */
export function gerarTabelaAvisoPrevio(maxAnos: number = 20): Array<{
  anos: number;
  diasBase: number;
  diasAdicionais: number;
  diasTotais: number;
}> {
  const tabela = [];

  for (let anos = 0; anos <= maxAnos; anos++) {
    const { total, base, adicionais } = calcularDiasAviso(anos);
    tabela.push({
      anos,
      diasBase: base,
      diasAdicionais: adicionais,
      diasTotais: total,
    });

    // Stop if max reached
    if (total >= 90) break;
  }

  return tabela;
}

/**
 * Validate notice period rules
 */
export function validarAvisoPrevio(input: AvisoPrevioInput): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (input.salarioBase <= 0) {
    erros.push('Salário base deve ser maior que zero');
  }

  if (input.anosCompletos < 0) {
    erros.push('Anos de serviço não pode ser negativo');
  }

  if (input.tipoAviso === 'cumprido_parcialmente') {
    const { total } = calcularDiasAviso(input.anosCompletos);
    if ((input.diasCumpridos ?? 0) > total) {
      erros.push(`Dias cumpridos não pode exceder ${total} dias`);
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

/**
 * Calculate projected termination date
 */
export function calcularDataTermino(dataNotificacao: Date, anosServico: number): Date {
  const { total } = calcularDiasAviso(anosServico);
  const dataTermino = new Date(dataNotificacao);
  dataTermino.setDate(dataTermino.getDate() + total);
  return dataTermino;
}
