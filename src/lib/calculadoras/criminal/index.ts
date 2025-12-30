/**
 * Criminal (Criminal Law) Calculators
 * Exports all criminal law calculators
 */

export * from './dosimetria';
export * from './progressao';

// Explicit exports from detracao-penal to avoid conflicts with progressao
export {
  calcularDetracaoPenal,
  calcularRemicaoTrabalho,
  validarPeriodos,
  calcularTempoTotalPrisao,
  type TipoPrisao,
  type PeriodoPrisao,
  type DetracaoPenalInput,
  type DetracaoPenalOutput,
  type DetalhamentoPeriodo,
} from './detracao-penal';
