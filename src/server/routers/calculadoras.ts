/**
 * Calculadoras Router
 * API endpoints for all legal calculators
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { calcularFGTS, validateFGTSInput, generateFGTSReportData } from '@/lib/calculadoras/trabalhista/fgts';
import { calcularINSS } from '@/lib/calculadoras/previdenciario/inss';
import { calcularAposentadoria } from '@/lib/calculadoras/previdenciario/aposentadoria';
import { calcularPensaoAlimenticia } from '@/lib/calculadoras/familia/pensao-alimenticia';
import { TRPCError } from '@trpc/server';

// Input schemas
const fgtsInputSchema = z.object({
  saldoInicial: z.number().min(0, 'Saldo inicial deve ser maior ou igual a zero'),
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
  depositosMensais: z.number().min(0).optional(),
  tipoCorrecao: z.enum(['TR', 'TR_SELIC']).default('TR'),
});

const correcaoMonetariaInputSchema = z.object({
  valorOriginal: z.number().min(0.01, 'Valor deve ser maior que zero'),
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
  indice: z.enum(['inpc', 'ipca', 'tr', 'selic', 'cdi', 'igpm', 'incc']),
  incluirJuros: z.boolean().default(false),
  taxaJuros: z.number().min(0).max(100).optional(),
  tipoJuros: z.enum(['simples', 'composto']).optional(),
});

const dosimetriaInputSchema = z.object({
  penaBase: z.number().min(0),
  unidadePena: z.enum(['anos', 'meses', 'dias']),
  circunstanciasJudiciais: z.number().min(-3).max(3),
  agravantes: z.array(z.object({
    descricao: z.string(),
    fator: z.number().min(0).max(1),
  })),
  atenuantes: z.array(z.object({
    descricao: z.string(),
    fator: z.number().min(0).max(1),
  })),
  causasAumento: z.array(z.object({
    descricao: z.string(),
    fracao: z.string(),
  })),
  causasDiminuicao: z.array(z.object({
    descricao: z.string(),
    fracao: z.string(),
  })),
});

const progressaoRegimenInputSchema = z.object({
  penaTotal: z.number().min(0),
  unidadePena: z.enum(['anos', 'meses', 'dias']),
  regimeAtual: z.enum(['fechado', 'semiaberto', 'aberto']),
  tipoCrime: z.enum(['comum', 'hediondo', 'hediondo_reincidente']),
  dataInicioExecucao: z.coerce.date(),
  diasRemidos: z.number().min(0).optional(),
  reincidente: z.boolean(),
});

const inssInputSchema = z.object({
  salarioBruto: z.number().min(0.01, 'Salário deve ser maior que zero'),
  tipoContribuinte: z.enum(['empregado', 'domestico', 'contribuinte_individual', 'facultativo', 'mei', 'segurado_especial']),
  planoContribuicao: z.enum(['normal', 'simplificado', 'baixa_renda']).optional(),
  competencia: z.coerce.date(),
  incluirPatronal: z.boolean().optional(),
});

const aposentadoriaInputSchema = z.object({
  dataNascimento: z.coerce.date(),
  sexo: z.enum(['masculino', 'feminino']),
  tipoAposentadoria: z.enum(['idade', 'tempo_contribuicao', 'especial', 'professor', 'deficiencia']),
  regime: z.enum(['rgps', 'rpps']),
  tempoContribuicaoMeses: z.number().min(0),
  mediaSalariosContribuicao: z.number().min(0),
  carenciaCompleta: z.boolean(),
  atividadeEspecial: z.object({
    tipo: z.enum(['15_anos', '20_anos', '25_anos']),
    tempoMeses: z.number().min(0),
  }).optional(),
});

const pensaoAlimenticiaInputSchema = z.object({
  tipoPensao: z.enum(['percentual_renda', 'valor_fixo', 'salarios_minimos', 'misto']),
  rendaMensalAlimentante: z.number().min(0.01, 'Renda deve ser maior que zero'),
  tipoRenda: z.enum(['empregado', 'autonomo', 'empresario', 'aposentado', 'desempregado']),
  percentualPensao: z.number().min(0).max(100).optional(),
  valorFixo: z.number().min(0).optional(),
  quantidadeSalariosMinimos: z.number().min(0).optional(),
  dataFixacao: z.coerce.date(),
  dataCalculo: z.coerce.date(),
  indiceCorrecao: z.enum(['inpc', 'ipca', 'igpm', 'salario_minimo']),
  incluirDecimoTerceiro: z.boolean(),
  incluirFerias: z.boolean(),
  incluirPLR: z.boolean(),
  quantidadeFilhos: z.number().min(1),
  necessidadesEspeciais: z.boolean().optional(),
});

export const calculadorasRouter = createTRPCRouter({
  // ==================
  // TRABALHISTA
  // ==================

  /**
   * Calculate FGTS correction
   */
  fgts: publicProcedure
    .input(fgtsInputSchema)
    .mutation(async ({ input }) => {
      // Validate dates
      if (input.dataInicio > input.dataFim) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Data de início deve ser anterior à data de fim',
        });
      }

      const result = calcularFGTS({
        saldoInicial: input.saldoInicial,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        depositosMensais: input.depositosMensais,
        tipoCorrecao: input.tipoCorrecao,
      });

      return result;
    }),

  /**
   * Generate FGTS PDF report
   */
  fgtsPDF: protectedProcedure
    .input(fgtsInputSchema)
    .mutation(async ({ input }) => {
      const result = calcularFGTS({
        saldoInicial: input.saldoInicial,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        depositosMensais: input.depositosMensais,
        tipoCorrecao: input.tipoCorrecao,
      });

      const reportData = generateFGTSReportData(
        {
          saldoInicial: input.saldoInicial,
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
          depositosMensais: input.depositosMensais,
          tipoCorrecao: input.tipoCorrecao,
        },
        result
      );

      return reportData;
    }),

  // ==================
  // PREVIDENCIÁRIO
  // ==================

  /**
   * Calculate INSS contribution
   */
  inss: publicProcedure
    .input(inssInputSchema)
    .mutation(async ({ input }) => {
      const result = calcularINSS({
        salarioBruto: input.salarioBruto,
        tipoContribuinte: input.tipoContribuinte,
        planoContribuicao: input.planoContribuicao,
        competencia: input.competencia,
        incluirPatronal: input.incluirPatronal,
      });

      return result;
    }),

  /**
   * Calculate retirement eligibility
   */
  aposentadoria: publicProcedure
    .input(aposentadoriaInputSchema)
    .mutation(async ({ input }) => {
      const result = calcularAposentadoria({
        dataNascimento: input.dataNascimento,
        sexo: input.sexo,
        tipoAposentadoria: input.tipoAposentadoria,
        regime: input.regime,
        tempoContribuicaoMeses: input.tempoContribuicaoMeses,
        mediaSalariosContribuicao: input.mediaSalariosContribuicao,
        carenciaCompleta: input.carenciaCompleta,
        atividadeEspecial: input.atividadeEspecial,
      });

      return result;
    }),

  // ==================
  // FAMÍLIA
  // ==================

  /**
   * Calculate alimony
   */
  pensaoAlimenticia: publicProcedure
    .input(pensaoAlimenticiaInputSchema)
    .mutation(async ({ input }) => {
      const result = calcularPensaoAlimenticia({
        tipoPensao: input.tipoPensao,
        rendaMensalAlimentante: input.rendaMensalAlimentante,
        tipoRenda: input.tipoRenda,
        percentualPensao: input.percentualPensao,
        valorFixo: input.valorFixo,
        quantidadeSalariosMinimos: input.quantidadeSalariosMinimos,
        dataFixacao: input.dataFixacao,
        dataCalculo: input.dataCalculo,
        indiceCorrecao: input.indiceCorrecao,
        incluirDecimoTerceiro: input.incluirDecimoTerceiro,
        incluirFerias: input.incluirFerias,
        incluirPLR: input.incluirPLR,
        quantidadeFilhos: input.quantidadeFilhos,
        necessidadesEspeciais: input.necessidadesEspeciais,
      });

      return result;
    }),

  // ==================
  // CORREÇÃO MONETÁRIA
  // ==================

  /**
   * Calculate monetary correction
   */
  correcaoMonetaria: publicProcedure
    .input(correcaoMonetariaInputSchema)
    .mutation(async ({ input }) => {
      if (input.dataInicio > input.dataFim) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Data de início deve ser anterior à data de fim',
        });
      }

      // TODO: Implement full correction calculation
      // For now, return a simplified calculation
      const meses = Math.ceil(
        (input.dataFim.getTime() - input.dataInicio.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      // Simplified estimation (real implementation should fetch actual indices)
      const taxaMediaMensal = 0.005; // 0.5% average monthly
      const fatorCorrecao = Math.pow(1 + taxaMediaMensal, meses);
      const valorCorrigido = input.valorOriginal * fatorCorrecao;
      const correcaoMonetaria = valorCorrigido - input.valorOriginal;

      let juros = 0;
      if (input.incluirJuros && input.taxaJuros) {
        const taxaMensal = input.taxaJuros / 100 / 12;
        if (input.tipoJuros === 'composto') {
          juros = valorCorrigido * (Math.pow(1 + taxaMensal, meses) - 1);
        } else {
          juros = valorCorrigido * taxaMensal * meses;
        }
      }

      return {
        valorOriginal: input.valorOriginal,
        valorCorrigido,
        correcaoMonetaria,
        juros,
        valorTotal: valorCorrigido + juros,
        fatorCorrecao,
        breakdown: [],
      };
    }),

  // ==================
  // CRIMINAL
  // ==================

  /**
   * Calculate sentencing (dosimetria)
   */
  dosimetria: publicProcedure
    .input(dosimetriaInputSchema)
    .mutation(async ({ input }) => {
      // Convert penalty to days for calculation
      let penaEmDias = input.penaBase;
      if (input.unidadePena === 'anos') {
        penaEmDias = input.penaBase * 365;
      } else if (input.unidadePena === 'meses') {
        penaEmDias = input.penaBase * 30;
      }

      // Phase 1: Base penalty + judicial circumstances
      const aumentoCircunstancias = penaEmDias * (input.circunstanciasJudiciais / 8);
      const fase1 = penaEmDias + aumentoCircunstancias;

      // Phase 2: Aggravating and mitigating factors
      const totalAgravantes = input.agravantes.reduce((sum, a) => sum + a.fator, 0);
      const totalAtenuantes = input.atenuantes.reduce((sum, a) => sum + a.fator, 0);
      const diferencaFase2 = fase1 * (totalAgravantes - totalAtenuantes);
      const fase2 = fase1 + diferencaFase2;

      // Phase 3: Increase and decrease causes
      const parseFracao = (fracao: string): number => {
        const [num, den] = fracao.split('/').map(Number);
        return num / den;
      };

      const totalAumentos = input.causasAumento.reduce((sum, c) => sum + parseFracao(c.fracao), 0);
      const totalDiminuicoes = input.causasDiminuicao.reduce((sum, c) => sum + parseFracao(c.fracao), 0);
      const fase3 = fase2 * (1 + totalAumentos - totalDiminuicoes);

      // Determine initial regime
      let regimeInicial: 'fechado' | 'semiaberto' | 'aberto' = 'aberto';
      const penaAnos = fase3 / 365;

      if (penaAnos > 8) {
        regimeInicial = 'fechado';
      } else if (penaAnos > 4) {
        regimeInicial = 'semiaberto';
      }

      // Convert back to original unit
      let penaDefinitiva = fase3;
      if (input.unidadePena === 'anos') {
        penaDefinitiva = fase3 / 365;
      } else if (input.unidadePena === 'meses') {
        penaDefinitiva = fase3 / 30;
      }

      return {
        penaBase: input.penaBase,
        penaIntermediaria: input.unidadePena === 'anos' ? fase2 / 365 : input.unidadePena === 'meses' ? fase2 / 30 : fase2,
        penaDefinitiva,
        regimeInicial,
        detalhamento: {
          fase1: {
            penaBase: input.penaBase,
            circunstancias: input.circunstanciasJudiciais,
            resultado: input.unidadePena === 'anos' ? fase1 / 365 : input.unidadePena === 'meses' ? fase1 / 30 : fase1,
          },
          fase2: {
            penaAnterior: input.unidadePena === 'anos' ? fase1 / 365 : input.unidadePena === 'meses' ? fase1 / 30 : fase1,
            agravantes: totalAgravantes,
            atenuantes: totalAtenuantes,
            resultado: input.unidadePena === 'anos' ? fase2 / 365 : input.unidadePena === 'meses' ? fase2 / 30 : fase2,
          },
          fase3: {
            penaAnterior: input.unidadePena === 'anos' ? fase2 / 365 : input.unidadePena === 'meses' ? fase2 / 30 : fase2,
            aumentos: totalAumentos,
            diminuicoes: totalDiminuicoes,
            resultado: penaDefinitiva,
          },
        },
      };
    }),

  /**
   * Calculate regime progression
   */
  progressaoRegime: publicProcedure
    .input(progressaoRegimenInputSchema)
    .mutation(async ({ input }) => {
      // Convert penalty to days
      let penaTotalDias = input.penaTotal;
      if (input.unidadePena === 'anos') {
        penaTotalDias = input.penaTotal * 365;
      } else if (input.unidadePena === 'meses') {
        penaTotalDias = input.penaTotal * 30;
      }

      // Determine fraction required for progression
      let fracao: number;
      let fracaoStr: string;

      if (input.tipoCrime === 'hediondo_reincidente') {
        fracao = 0.6; // 3/5
        fracaoStr = '3/5';
      } else if (input.tipoCrime === 'hediondo') {
        fracao = 0.4; // 2/5
        fracaoStr = '2/5';
      } else if (input.reincidente) {
        fracao = 0.25; // 1/4
        fracaoStr = '1/4';
      } else {
        fracao = 1 / 6;
        fracaoStr = '1/6';
      }

      // Calculate days needed
      const diasNecessarios = Math.ceil(penaTotalDias * fracao);
      const diasRemidos = input.diasRemidos ?? 0;

      // Calculate days served
      const hoje = new Date();
      const diasCumpridos = Math.floor(
        (hoje.getTime() - input.dataInicioExecucao.getTime()) / (1000 * 60 * 60 * 24)
      ) + diasRemidos;

      // Calculate remaining days
      const diasRestantes = Math.max(0, diasNecessarios - diasCumpridos);

      // Calculate progression date
      const dataProgressao = new Date(input.dataInicioExecucao);
      dataProgressao.setDate(dataProgressao.getDate() + diasNecessarios - diasRemidos);

      // Determine next regime
      let proximoRegime: 'semiaberto' | 'aberto' | 'livramento' = 'semiaberto';
      if (input.regimeAtual === 'semiaberto') {
        proximoRegime = 'aberto';
      } else if (input.regimeAtual === 'aberto') {
        proximoRegime = 'livramento';
      }

      return {
        dataProgressao,
        diasRestantes,
        fracaoExigida: fracaoStr,
        diasCumpridos,
        diasNecessarios,
        proximoRegime,
      };
    }),

  // ==================
  // SAVE CALCULATION
  // ==================

  /**
   * Save a calculation to the database
   */
  save: protectedProcedure
    .input(z.object({
      type: z.string(),
      name: z.string().optional(),
      caseId: z.string().uuid().optional(),
      inputData: z.record(z.string(), z.unknown()),
      outputData: z.record(z.string(), z.unknown()),
      breakdown: z.array(z.record(z.string(), z.unknown())).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      // Get user's office
      const { data: member } = await supabase
        .from('office_members')
        .select('office_id')
        .eq('user_id', user.id)
        .single();

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuário não pertence a nenhum escritório',
        });
      }

      const { data, error } = await supabase
        .from('calculations')
        .insert({
          office_id: member.office_id,
          user_id: user.id,
          case_id: input.caseId,
          type: input.type,
          name: input.name,
          input_data: input.inputData,
          output_data: input.outputData,
          breakdown: input.breakdown,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return data;
    }),

  /**
   * List saved calculations
   */
  list: protectedProcedure
    .input(z.object({
      type: z.string().optional(),
      caseId: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      // Get user's office
      const { data: member } = await supabase
        .from('office_members')
        .select('office_id')
        .eq('user_id', user.id)
        .single();

      if (!member) {
        return { data: [], total: 0 };
      }

      let query = supabase
        .from('calculations')
        .select('*', { count: 'exact' })
        .eq('office_id', member.office_id)
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.type) {
        query = query.eq('type', input.type);
      }

      if (input.caseId) {
        query = query.eq('case_id', input.caseId);
      }

      const { data, count, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return { data: data ?? [], total: count ?? 0 };
    }),
});
