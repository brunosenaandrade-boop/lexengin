/**
 * Economic Indices Fetcher
 * Fetches economic indices from BACEN (Brazilian Central Bank) API
 */

import { IndexType, EconomicIndex } from '@/types';

// BACEN SGS (Sistema Gerenciador de Séries) API endpoint
const BACEN_API_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

// Series codes for BACEN API
const SERIES_CODES: Record<IndexType, number> = {
  inpc: 188,      // INPC - Índice Nacional de Preços ao Consumidor
  ipca: 433,      // IPCA - Índice Nacional de Preços ao Consumidor Amplo
  tr: 226,        // TR - Taxa Referencial
  selic: 4189,    // SELIC - Taxa básica de juros
  cdi: 4391,      // CDI - Certificado de Depósito Interbancário
  igpm: 189,      // IGP-M - Índice Geral de Preços do Mercado
  incc: 192,      // INCC - Índice Nacional da Construção Civil
  ufir: 0,        // UFIR - Extinta em 2000, usar dados históricos
};

interface BACENResponse {
  data: string;
  valor: string;
}

/**
 * Fetch a single index from BACEN API
 */
export async function fetchIndex(
  type: IndexType,
  startDate: Date,
  endDate: Date
): Promise<EconomicIndex[]> {
  const seriesCode = SERIES_CODES[type];

  if (!seriesCode) {
    throw new Error(`Invalid index type: ${type}`);
  }

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const url = `${BACEN_API_BASE}.${seriesCode}/dados?formato=json&dataInicial=${formatDate(startDate)}&dataFinal=${formatDate(endDate)}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`BACEN API error: ${response.status}`);
    }

    const data: BACENResponse[] = await response.json();

    return data.map((item) => {
      const [day, month, year] = item.data.split('/');
      const referenceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      return {
        id: `${type}-${item.data}`,
        type,
        referenceDate,
        value: parseFloat(item.valor.replace(',', '.')),
        source: 'BACEN',
        fetchedAt: new Date(),
      };
    });
  } catch (error) {
    console.error(`Error fetching ${type} index:`, error);
    throw error;
  }
}

/**
 * Get TR (Taxa Referencial) for a specific month
 */
export async function getTRMensal(date: Date): Promise<number> {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const indices = await fetchIndex('tr', startDate, endDate);

  if (indices.length === 0) {
    return 0; // TR has been 0 for many years
  }

  // Sum all daily TR values for the month
  return indices.reduce((sum, idx) => sum + idx.value, 0) / 100;
}

/**
 * Get INPC for a specific month
 */
export async function getINPCMensal(date: Date): Promise<number> {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const indices = await fetchIndex('inpc', startDate, endDate);

  if (indices.length === 0) {
    throw new Error(`INPC not found for ${date.toISOString()}`);
  }

  return indices[0].value / 100;
}

/**
 * Get IPCA for a specific month
 */
export async function getIPCAMensal(date: Date): Promise<number> {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const indices = await fetchIndex('ipca', startDate, endDate);

  if (indices.length === 0) {
    throw new Error(`IPCA not found for ${date.toISOString()}`);
  }

  return indices[0].value / 100;
}

/**
 * Get SELIC for a specific period
 */
export async function getSELIC(startDate: Date, endDate: Date): Promise<number> {
  const indices = await fetchIndex('selic', startDate, endDate);

  if (indices.length === 0) {
    return 0;
  }

  // Return accumulated SELIC for the period
  return indices.reduce((acc, idx) => acc * (1 + idx.value / 100), 1) - 1;
}

/**
 * Calculate accumulated index for a period
 */
export async function getAccumulatedIndex(
  type: IndexType,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const indices = await fetchIndex(type, startDate, endDate);

  if (indices.length === 0) {
    return 0;
  }

  // Calculate accumulated percentage
  return indices.reduce((acc, idx) => acc * (1 + idx.value / 100), 1) - 1;
}

/**
 * Get correction factor for a period
 */
export async function getCorrectionFactor(
  type: IndexType,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const accumulated = await getAccumulatedIndex(type, startDate, endDate);
  return 1 + accumulated;
}

/**
 * Get all months between two dates
 */
export function getMonthsBetween(startDate: Date, endDate: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Static TR data for historical calculations (TR has been ~0 since 2017)
 */
export const TR_HISTORICA: Record<string, number> = {
  '2024-01': 0.0989,
  '2024-02': 0.0707,
  '2024-03': 0.0587,
  '2024-04': 0.0759,
  '2024-05': 0.0924,
  '2024-06': 0.0767,
  '2024-07': 0.0751,
  '2024-08': 0.0694,
  '2024-09': 0.0755,
  '2024-10': 0.0892,
  '2024-11': 0.0714,
  '2024-12': 0.0803,
  // Valores históricos anteriores são geralmente 0 ou muito próximos de 0
};

/**
 * Get TR from static data (fallback when API is unavailable)
 */
export function getTRFromStatic(date: Date): number {
  const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  return (TR_HISTORICA[key] ?? 0) / 100;
}

/**
 * Minimum wages history
 */
export const SALARIO_MINIMO: Record<number, number> = {
  2024: 1412.00,
  2023: 1320.00,
  2022: 1212.00,
  2021: 1100.00,
  2020: 1045.00,
  2019: 998.00,
  2018: 954.00,
  2017: 937.00,
  2016: 880.00,
  2015: 788.00,
  2014: 724.00,
  2013: 678.00,
  2012: 622.00,
  2011: 545.00,
  2010: 510.00,
};

/**
 * INSS ceiling history
 */
export const TETO_INSS: Record<number, number> = {
  2024: 7786.02,
  2023: 7507.49,
  2022: 7087.22,
  2021: 6433.57,
  2020: 6101.06,
  2019: 5839.45,
  2018: 5645.80,
  2017: 5531.31,
  2016: 5189.82,
  2015: 4663.75,
};

/**
 * Get minimum wage for a specific year
 */
export function getSalarioMinimo(year: number): number {
  return SALARIO_MINIMO[year] ?? SALARIO_MINIMO[2024];
}

/**
 * Get INSS ceiling for a specific year
 */
export function getTetoINSS(year: number): number {
  return TETO_INSS[year] ?? TETO_INSS[2024];
}
