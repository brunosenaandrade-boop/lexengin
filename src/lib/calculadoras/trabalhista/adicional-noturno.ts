/**
 * Adicional Noturno Calculator
 * Calculates night shift premium according to CLT
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface AdicionalNoturnoInput {
  salarioBase: number;
  horasNoturnasMes: number; // Hours worked between 22h-5h
  percentualAdicional?: number; // Default 20% (CLT) or 25% (rural)
  tipoTrabalhador: 'urbano' | 'rural';
  incluirReflexos: boolean;
}

export interface AdicionalNoturnoOutput {
  valorHoraNormal: number;
  valorHoraNoturna: number;
  adicionalNoturno: number;
  horaNoturnaReduzida: number; // 52min30s = 1h
  horasNoturnasTotais: number;
  reflexos: {
    dsr: number;
    ferias: number;
    decimoTerceiro: number;
    fgts: number;
  };
  totalBruto: number;
  fundamentacao: string;
}

// Night hour reduction: 52min30s = 1h (CLT Art. 73, §1º)
const HORA_NOTURNA_REDUZIDA = 52.5 / 60; // 0.875

/**
 * Calculate night shift premium
 */
export function calcularAdicionalNoturno(input: AdicionalNoturnoInput): AdicionalNoturnoOutput {
  const {
    salarioBase,
    horasNoturnasMes,
    tipoTrabalhador,
    incluirReflexos,
  } = input;

  // Default percentages: 20% urban (CLT), 25% rural
  const percentualAdicional = input.percentualAdicional ??
    (tipoTrabalhador === 'urbano' ? 20 : 25);

  // Calculate hourly rate (220h/month standard)
  const valorHoraNormal = new Decimal(salarioBase).dividedBy(220).toNumber();

  // Night hour premium
  const adicionalDecimal = new Decimal(percentualAdicional).dividedBy(100);
  const valorHoraNoturna = new Decimal(valorHoraNormal)
    .times(new Decimal(1).plus(adicionalDecimal))
    .toNumber();

  // Apply hour reduction (7h night = 8h day)
  const horasNoturnasTotais = new Decimal(horasNoturnasMes)
    .dividedBy(HORA_NOTURNA_REDUZIDA)
    .toNumber();

  // Calculate night premium
  const adicionalNoturno = new Decimal(horasNoturnasMes)
    .times(valorHoraNormal)
    .times(adicionalDecimal)
    .toNumber();

  // Hour reduction value (difference between reduced and actual hours)
  const horaNoturnaReduzida = new Decimal(horasNoturnasTotais)
    .minus(horasNoturnasMes)
    .times(valorHoraNoturna)
    .toNumber();

  // Calculate reflexes
  let reflexos = {
    dsr: 0,
    ferias: 0,
    decimoTerceiro: 0,
    fgts: 0,
  };

  if (incluirReflexos) {
    const baseReflexo = new Decimal(adicionalNoturno).plus(horaNoturnaReduzida);

    // DSR (1/6 for 6-day week)
    reflexos.dsr = baseReflexo.dividedBy(6).toNumber();

    const baseComDsr = baseReflexo.plus(reflexos.dsr);

    // Vacation (1/12 + 1/3)
    reflexos.ferias = baseComDsr.dividedBy(12).times(new Decimal(4).dividedBy(3)).toNumber();

    // 13th salary (1/12)
    reflexos.decimoTerceiro = baseComDsr.dividedBy(12).toNumber();

    // FGTS (8%)
    reflexos.fgts = baseComDsr
      .plus(reflexos.ferias)
      .plus(reflexos.decimoTerceiro)
      .times(0.08)
      .toNumber();
  }

  const totalBruto = new Decimal(adicionalNoturno)
    .plus(horaNoturnaReduzida)
    .plus(reflexos.dsr)
    .plus(reflexos.ferias)
    .plus(reflexos.decimoTerceiro)
    .plus(reflexos.fgts)
    .toNumber();

  const fundamentacao = buildFundamentacao(tipoTrabalhador, percentualAdicional);

  return {
    valorHoraNormal,
    valorHoraNoturna,
    adicionalNoturno,
    horaNoturnaReduzida,
    horasNoturnasTotais,
    reflexos,
    totalBruto,
    fundamentacao,
  };
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(tipo: 'urbano' | 'rural', percentual: number): string {
  if (tipo === 'urbano') {
    return `Cálculo realizado conforme art. 73 da CLT. ` +
      `O trabalho noturno urbano (das 22h às 5h) é remunerado com adicional de ${percentual}% sobre a hora diurna. ` +
      `A hora noturna é computada como de 52 minutos e 30 segundos (art. 73, §1º, CLT), ` +
      `de modo que 7 horas noturnas equivalem a 8 horas diurnas.`;
  }

  return `Cálculo realizado conforme Lei 5.889/73. ` +
    `O trabalho noturno rural é remunerado com adicional de ${percentual}% sobre a hora diurna. ` +
    `Para a pecuária, considera-se noturno o trabalho das 20h às 4h; ` +
    `para a lavoura, das 21h às 5h.`;
}

/**
 * Calculate monthly night hours from schedule
 */
export function calcularHorasNoturnas(
  horaEntrada: string, // Format "HH:MM"
  horaSaida: string,
  diasTrabalhados: number
): number {
  const [entradaH, entradaM] = horaEntrada.split(':').map(Number);
  const [saidaH, saidaM] = horaSaida.split(':').map(Number);

  const entradaMinutos = entradaH * 60 + entradaM;
  const saidaMinutos = saidaH * 60 + saidaM;

  // Night period: 22:00 (1320 min) to 05:00 (300 min next day)
  const INICIO_NOTURNO = 22 * 60; // 1320
  const FIM_NOTURNO = 5 * 60; // 300

  let minutosNoturnos = 0;

  // Handle overnight shifts
  if (saidaMinutos < entradaMinutos) {
    // Overnight shift
    // Hours from entry to midnight
    if (entradaMinutos < INICIO_NOTURNO) {
      minutosNoturnos += (24 * 60) - INICIO_NOTURNO;
    } else {
      minutosNoturnos += (24 * 60) - entradaMinutos;
    }

    // Hours from midnight to exit
    if (saidaMinutos <= FIM_NOTURNO) {
      minutosNoturnos += saidaMinutos;
    } else {
      minutosNoturnos += FIM_NOTURNO;
    }
  } else {
    // Same day shift
    if (entradaMinutos >= INICIO_NOTURNO || saidaMinutos <= FIM_NOTURNO) {
      const inicio = Math.max(entradaMinutos, INICIO_NOTURNO);
      const fim = saidaMinutos <= FIM_NOTURNO ? saidaMinutos : 24 * 60;
      minutosNoturnos = fim - inicio;

      if (entradaMinutos < FIM_NOTURNO) {
        minutosNoturnos += Math.min(saidaMinutos, FIM_NOTURNO) - entradaMinutos;
      }
    }
  }

  const horasNoturnasDia = minutosNoturnos / 60;
  return horasNoturnasDia * diasTrabalhados;
}
