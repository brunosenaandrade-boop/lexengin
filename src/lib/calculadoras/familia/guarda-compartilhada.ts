/**
 * Guarda Compartilhada - Child Expenses Calculator
 * Calculates shared custody expenses and responsibilities
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type TipoGuarda = 'compartilhada' | 'unilateral' | 'alternada';

export type CategoriaDespesa =
  | 'alimentacao'
  | 'educacao'
  | 'saude'
  | 'vestuario'
  | 'transporte'
  | 'lazer'
  | 'moradia'
  | 'extras';

export interface DespesaFilho {
  id: string;
  categoria: CategoriaDespesa;
  descricao: string;
  valorMensal: number;
  fixa: boolean;
  pagador?: 'genitor_a' | 'genitor_b' | 'proporcional';
}

export interface GuardaCompartilhadaInput {
  tipoGuarda: TipoGuarda;
  quantidadeFilhos: number;
  idadesFilhos: number[];
  rendaGenitorA: number;
  rendaGenitorB: number;
  diasComGenitorA: number; // Days per month with parent A
  diasComGenitorB: number; // Days per month with parent B
  despesasFilhos: DespesaFilho[];
  residenciaPrincipal: 'genitor_a' | 'genitor_b';
}

export interface GuardaCompartilhadaOutput {
  tipoGuarda: TipoGuarda;
  proporcoesRenda: {
    genitorA: number;
    genitorB: number;
  };
  proporcoesTempo: {
    genitorA: number;
    genitorB: number;
  };
  despesasTotais: number;
  divisaoDespesas: {
    genitorA: DivisaoDespesasGenitor;
    genitorB: DivisaoDespesasGenitor;
  };
  diferenca: number;
  pagamentoCompensatorio?: {
    pagador: 'genitor_a' | 'genitor_b';
    valor: number;
  };
  detalhamentoCategorias: DetalhamentoCategoria[];
  fundamentacao: string;
}

export interface DivisaoDespesasGenitor {
  despesasFixas: number;
  despesasProporcionais: number;
  total: number;
  percentual: number;
}

export interface DetalhamentoCategoria {
  categoria: CategoriaDespesa;
  valor: number;
  genitorA: number;
  genitorB: number;
}

/**
 * Calculate shared custody expense division
 */
export function calcularGuardaCompartilhada(input: GuardaCompartilhadaInput): GuardaCompartilhadaOutput {
  const {
    tipoGuarda,
    rendaGenitorA,
    rendaGenitorB,
    diasComGenitorA,
    diasComGenitorB,
    despesasFilhos,
    residenciaPrincipal,
  } = input;

  const rendaTotal = rendaGenitorA + rendaGenitorB;
  const diasTotais = diasComGenitorA + diasComGenitorB;

  // Calculate proportions
  const propRenda = {
    genitorA: rendaTotal > 0 ? (rendaGenitorA / rendaTotal) * 100 : 50,
    genitorB: rendaTotal > 0 ? (rendaGenitorB / rendaTotal) * 100 : 50,
  };

  const propTempo = {
    genitorA: diasTotais > 0 ? (diasComGenitorA / diasTotais) * 100 : 50,
    genitorB: diasTotais > 0 ? (diasComGenitorB / diasTotais) * 100 : 50,
  };

  // Calculate total expenses
  const despesasTotais = despesasFilhos.reduce((acc, d) => acc + d.valorMensal, 0);

  // Divide expenses
  const divisaoA = calcularDivisaoGenitor(
    'genitor_a',
    despesasFilhos,
    propRenda.genitorA / 100,
    tipoGuarda
  );

  const divisaoB = calcularDivisaoGenitor(
    'genitor_b',
    despesasFilhos,
    propRenda.genitorB / 100,
    tipoGuarda
  );

  // Category breakdown
  const detalhamentoCategorias = calcularDetalhamentoCategorias(
    despesasFilhos,
    propRenda.genitorA / 100,
    propRenda.genitorB / 100
  );

  // Calculate compensatory payment
  const diferenca = Math.abs(divisaoA.total - divisaoB.total);
  let pagamentoCompensatorio: { pagador: 'genitor_a' | 'genitor_b'; valor: number } | undefined;

  // In shared custody, usually the higher earner compensates
  if (diferenca > 50 && rendaGenitorA !== rendaGenitorB) {
    const maiorRenda = rendaGenitorA > rendaGenitorB ? 'genitor_a' : 'genitor_b';
    const valorCompensacao = calcularCompensacao(
      rendaGenitorA,
      rendaGenitorB,
      divisaoA.total,
      divisaoB.total,
      tipoGuarda
    );

    if (valorCompensacao > 0) {
      pagamentoCompensatorio = {
        pagador: maiorRenda,
        valor: valorCompensacao,
      };
    }
  }

  const fundamentacao = buildFundamentacao(tipoGuarda, propRenda, propTempo);

  return {
    tipoGuarda,
    proporcoesRenda: propRenda,
    proporcoesTempo: propTempo,
    despesasTotais,
    divisaoDespesas: {
      genitorA: divisaoA,
      genitorB: divisaoB,
    },
    diferenca,
    pagamentoCompensatorio,
    detalhamentoCategorias,
    fundamentacao,
  };
}

/**
 * Calculate expense division for a parent
 */
function calcularDivisaoGenitor(
  genitor: 'genitor_a' | 'genitor_b',
  despesas: DespesaFilho[],
  proporcaoRenda: number,
  tipoGuarda: TipoGuarda
): DivisaoDespesasGenitor {
  let despesasFixas = 0;
  let despesasProporcionais = 0;

  for (const despesa of despesas) {
    if (despesa.pagador === genitor) {
      // This parent is responsible for this fixed expense
      despesasFixas += despesa.valorMensal;
    } else if (despesa.pagador === 'proporcional' || despesa.pagador === undefined) {
      // Proportional division
      if (tipoGuarda === 'compartilhada') {
        despesasProporcionais += new Decimal(despesa.valorMensal)
          .times(proporcaoRenda)
          .toNumber();
      } else if (tipoGuarda === 'alternada') {
        // 50/50 in alternating custody
        despesasProporcionais += despesa.valorMensal / 2;
      }
    }
  }

  const total = despesasFixas + despesasProporcionais;
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valorMensal, 0);
  const percentual = totalDespesas > 0 ? (total / totalDespesas) * 100 : 0;

  return {
    despesasFixas,
    despesasProporcionais,
    total,
    percentual,
  };
}

/**
 * Calculate category breakdown
 */
function calcularDetalhamentoCategorias(
  despesas: DespesaFilho[],
  propA: number,
  propB: number
): DetalhamentoCategoria[] {
  const categorias: Record<CategoriaDespesa, { valor: number; a: number; b: number }> = {
    alimentacao: { valor: 0, a: 0, b: 0 },
    educacao: { valor: 0, a: 0, b: 0 },
    saude: { valor: 0, a: 0, b: 0 },
    vestuario: { valor: 0, a: 0, b: 0 },
    transporte: { valor: 0, a: 0, b: 0 },
    lazer: { valor: 0, a: 0, b: 0 },
    moradia: { valor: 0, a: 0, b: 0 },
    extras: { valor: 0, a: 0, b: 0 },
  };

  for (const despesa of despesas) {
    const cat = categorias[despesa.categoria];
    cat.valor += despesa.valorMensal;

    if (despesa.pagador === 'genitor_a') {
      cat.a += despesa.valorMensal;
    } else if (despesa.pagador === 'genitor_b') {
      cat.b += despesa.valorMensal;
    } else {
      cat.a += despesa.valorMensal * propA;
      cat.b += despesa.valorMensal * propB;
    }
  }

  return Object.entries(categorias)
    .filter(([_, v]) => v.valor > 0)
    .map(([categoria, valores]) => ({
      categoria: categoria as CategoriaDespesa,
      valor: valores.valor,
      genitorA: valores.a,
      genitorB: valores.b,
    }));
}

/**
 * Calculate compensatory payment
 */
function calcularCompensacao(
  rendaA: number,
  rendaB: number,
  despesaA: number,
  despesaB: number,
  tipoGuarda: TipoGuarda
): number {
  const rendaTotal = rendaA + rendaB;
  const proporcaoIdealA = rendaA / rendaTotal;
  const proporcaoIdealB = rendaB / rendaTotal;

  const despesaTotal = despesaA + despesaB;
  const idealA = despesaTotal * proporcaoIdealA;
  const idealB = despesaTotal * proporcaoIdealB;

  // If A is paying less than their fair share
  if (despesaA < idealA && rendaA > rendaB) {
    return idealA - despesaA;
  }

  // If B is paying less than their fair share
  if (despesaB < idealB && rendaB > rendaA) {
    return idealB - despesaB;
  }

  return 0;
}

/**
 * Build legal fundamentation
 */
function buildFundamentacao(
  tipoGuarda: TipoGuarda,
  propRenda: { genitorA: number; genitorB: number },
  propTempo: { genitorA: number; genitorB: number }
): string {
  let base = `Cálculo realizado conforme arts. 1.583 a 1.590 do Código Civil ` +
    `e Lei 13.058/2014 (Lei da Guarda Compartilhada). `;

  switch (tipoGuarda) {
    case 'compartilhada':
      base += `Na guarda compartilhada, ambos os genitores exercem conjuntamente ` +
        `os poderes e deveres inerentes ao poder familiar (art. 1.583, §1º, CC). ` +
        `A divisão das despesas deve observar a capacidade econômica de cada genitor. `;
      break;
    case 'alternada':
      base += `Na guarda alternada, a criança reside alternadamente ` +
        `com cada um dos genitores por períodos equivalentes. `;
      break;
    case 'unilateral':
      base += `Na guarda unilateral, as despesas extraordinárias ` +
        `devem ser divididas proporcionalmente às rendas. `;
      break;
  }

  base += `Proporção de renda: Genitor A ${propRenda.genitorA.toFixed(1)}%, ` +
    `Genitor B ${propRenda.genitorB.toFixed(1)}%. `;
  base += `Proporção de tempo com os filhos: Genitor A ${propTempo.genitorA.toFixed(1)}%, ` +
    `Genitor B ${propTempo.genitorB.toFixed(1)}%.`;

  return base;
}

/**
 * Get default expense list by child age
 */
export function getDespesasPadrao(idade: number): DespesaFilho[] {
  const base: DespesaFilho[] = [
    { id: '1', categoria: 'alimentacao', descricao: 'Alimentação mensal', valorMensal: 600, fixa: true },
    { id: '2', categoria: 'saude', descricao: 'Plano de saúde', valorMensal: 400, fixa: true },
    { id: '3', categoria: 'vestuario', descricao: 'Vestuário', valorMensal: 200, fixa: false },
    { id: '4', categoria: 'lazer', descricao: 'Lazer e atividades', valorMensal: 300, fixa: false },
  ];

  if (idade >= 3 && idade < 6) {
    base.push({
      id: '5',
      categoria: 'educacao',
      descricao: 'Escola/Creche',
      valorMensal: 800,
      fixa: true,
    });
  } else if (idade >= 6 && idade < 14) {
    base.push(
      { id: '5', categoria: 'educacao', descricao: 'Escola', valorMensal: 1200, fixa: true },
      { id: '6', categoria: 'educacao', descricao: 'Material escolar', valorMensal: 100, fixa: false },
      { id: '7', categoria: 'transporte', descricao: 'Transporte escolar', valorMensal: 400, fixa: true }
    );
  } else if (idade >= 14) {
    base.push(
      { id: '5', categoria: 'educacao', descricao: 'Escola', valorMensal: 1500, fixa: true },
      { id: '6', categoria: 'educacao', descricao: 'Cursinho/Reforço', valorMensal: 500, fixa: false },
      { id: '7', categoria: 'transporte', descricao: 'Transporte', valorMensal: 300, fixa: true }
    );
  }

  return base;
}

/**
 * Calculate visitation schedule
 */
export function calcularRegimeConvivencia(
  tipoGuarda: TipoGuarda,
  residenciaPrincipal: 'genitor_a' | 'genitor_b'
): {
  diasSemana: { genitorA: number[]; genitorB: number[] };
  finaisSemana: string;
  ferias: string;
  datasEspeciais: string;
} {
  if (tipoGuarda === 'alternada') {
    return {
      diasSemana: { genitorA: [0, 1, 2, 3], genitorB: [4, 5, 6] }, // Alternating weeks
      finaisSemana: 'Alternados a cada semana',
      ferias: 'Divididas igualmente (15 dias cada)',
      datasEspeciais: 'Alternadas anualmente (Natal, Ano Novo, aniversários)',
    };
  }

  if (tipoGuarda === 'compartilhada') {
    const principal = residenciaPrincipal === 'genitor_a' ? 'A' : 'B';
    const visitante = residenciaPrincipal === 'genitor_a' ? 'B' : 'A';

    return {
      diasSemana: residenciaPrincipal === 'genitor_a'
        ? { genitorA: [1, 2, 3, 4], genitorB: [5, 6, 0] }
        : { genitorA: [5, 6, 0], genitorB: [1, 2, 3, 4] },
      finaisSemana: `Alternados (Genitor ${visitante} tem fins de semana alternados)`,
      ferias: 'Divididas igualmente',
      datasEspeciais: 'Alternadas anualmente',
    };
  }

  // Unilateral
  return {
    diasSemana: residenciaPrincipal === 'genitor_a'
      ? { genitorA: [1, 2, 3, 4, 5], genitorB: [] }
      : { genitorA: [], genitorB: [1, 2, 3, 4, 5] },
    finaisSemana: 'Genitor não guardião: fins de semana alternados',
    ferias: 'Genitor não guardião: 15 dias consecutivos',
    datasEspeciais: 'Alternadas anualmente',
  };
}
