import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Format a number as Brazilian currency (BRL)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value).replace(/\u00A0/g, ' '); // Replace non-breaking space with regular space
}

/**
 * Parse a Brazilian currency string to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned);
}

/**
 * Format a number with Brazilian decimal separator
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number as percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format a date in Brazilian format
 */
export function formatDate(date: Date | string, pattern: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, pattern, { locale: ptBR });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm");
}

/**
 * Format a date in month/year format
 */
export function formatMonthYear(date: Date | string): string {
  return formatDate(date, 'MMMM/yyyy');
}

/**
 * Format CPF (Brazilian individual taxpayer ID)
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Format CNPJ (Brazilian company taxpayer ID)
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Format CPF or CNPJ based on length
 */
export function formatCPFCNPJ(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) return formatCPF(cleaned);
  if (cleaned.length === 14) return formatCNPJ(cleaned);
  return value;
}

/**
 * Format phone number (Brazilian format)
 */
export function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  // Remove country code if present
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    cleaned = cleaned.substring(2);
  }

  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Format CEP (Brazilian postal code)
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return cep;
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Format case number (CNJ format)
 */
export function formatCaseNumber(caseNumber: string): string {
  const cleaned = caseNumber.replace(/\D/g, '');
  if (cleaned.length !== 20) return caseNumber;
  return cleaned.replace(
    /(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/,
    '$1-$2.$3.$4.$5.$6'
  );
}

/**
 * Format OAB number
 */
export function formatOAB(oab: string, state: string): string {
  const cleaned = oab.replace(/\D/g, '');
  // Format with dots for thousands
  const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `OAB/${state.toUpperCase()} ${formatted}`;
}

/**
 * Format time duration in hours and minutes
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Convert number to words (Portuguese)
 */
export function numberToWords(value: number): string {
  // Simplified implementation - for production, use a library
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (value === 0) return 'zero';
  if (value === 100) return 'cem';

  // For simplicity, only handle up to 999
  if (value > 999) return value.toString();

  const h = Math.floor(value / 100);
  const t = Math.floor((value % 100) / 10);
  const u = value % 10;

  const parts: string[] = [];

  if (h > 0) parts.push(hundreds[h]);

  if (t === 1) {
    parts.push(teens[u]);
  } else {
    if (t > 0) parts.push(tens[t]);
    if (u > 0) parts.push(units[u]);
  }

  return parts.join(' e ');
}

/**
 * Format currency to words (Portuguese)
 */
export function currencyToWords(value: number): string {
  const reais = Math.floor(value);
  const centavos = Math.round((value - reais) * 100);

  let result = '';

  if (reais > 0) {
    result = `${numberToWords(reais)} ${reais === 1 ? 'real' : 'reais'}`;
  }

  if (centavos > 0) {
    if (result) result += ' e ';
    result += `${numberToWords(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  }

  return result || 'zero reais';
}
