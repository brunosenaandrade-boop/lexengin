/**
 * LexEngine Calculators
 * Main index file exporting all legal calculators
 *
 * Total: 21 calculators across 5 areas of law
 *
 * TRABALHISTA (7):
 * - FGTS: Correção de saldo FGTS
 * - Verbas Rescisórias: Cálculo de rescisão contratual
 * - Horas Extras: Adicional de horas extras
 * - Adicional Noturno: Adicional de 20%/25%
 * - Férias: Férias + 1/3 constitucional
 * - Décimo Terceiro: 13º salário
 * - Aviso Prévio: Proporcional ao tempo de serviço
 *
 * PREVIDENCIÁRIO (4):
 * - INSS: Cálculo de contribuição
 * - Aposentadoria: Elegibilidade e valor
 * - RMI: Renda Mensal Inicial
 * - Revisão Vida Toda: Inclusão de contribuições pré-1994
 *
 * FAMÍLIA (3):
 * - Pensão Alimentícia: Cálculo e atualização
 * - Divórcio: Partilha de bens
 * - Guarda Compartilhada: Divisão de despesas
 *
 * CRIMINAL (3):
 * - Dosimetria: Cálculo trifásico da pena
 * - Progressão de Regime: Tempo para progressão
 * - Detração Penal: Desconto de pena
 *
 * CÍVEL (4):
 * - Correção Monetária: Atualização de valores
 * - Juros Moratórios: Cálculo de juros
 * - Danos Morais: Estimativa de indenização
 * - Liquidação: Cálculo de sentença
 */

// Trabalhista
export * from './trabalhista';

// Previdenciário
export * from './previdenciario';

// Família
export * from './familia';

// Criminal
export * from './criminal';

// Cível
export * from './civel';

// Note: Calculator input/output types should be imported directly from '@/types'
// The calculator modules export functions, the types are defined in src/types/index.ts
