/**
 * Formatters Tests
 * 25 tests covering all formatting utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
  formatDate,
  formatPercentage,
  formatOAB,
  formatCaseNumber,
  parseCurrency,
} from '@/lib/utils/formatters';

describe('Currency Formatting', () => {
  // Test 26: Format positive currency
  it('should format positive currency in BRL', () => {
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
  });

  // Test 27: Format zero currency
  it('should format zero currency', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  // Test 28: Format large currency
  it('should format large currency values', () => {
    expect(formatCurrency(1234567.89)).toBe('R$ 1.234.567,89');
  });

  // Test 29: Format negative currency
  it('should format negative currency', () => {
    const result = formatCurrency(-1234.56);
    expect(result).toContain('1.234,56');
  });

  // Test 30: Format currency with many decimals
  it('should round currency to 2 decimals', () => {
    expect(formatCurrency(1234.567)).toBe('R$ 1.234,57');
  });

  // Test 31: Parse currency string
  it('should parse currency string to number', () => {
    expect(parseCurrency('R$ 1.234,56')).toBe(1234.56);
  });

  // Test 32: Parse currency without symbol
  it('should parse currency without R$ symbol', () => {
    expect(parseCurrency('1.234,56')).toBe(1234.56);
  });
});

describe('Document Formatting', () => {
  // Test 33: Format CPF
  it('should format CPF correctly', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25');
  });

  // Test 34: Format already formatted CPF
  it('should handle already formatted CPF', () => {
    expect(formatCPF('529.982.247-25')).toBe('529.982.247-25');
  });

  // Test 35: Format CNPJ
  it('should format CNPJ correctly', () => {
    expect(formatCNPJ('11444777000161')).toBe('11.444.777/0001-61');
  });

  // Test 36: Format already formatted CNPJ
  it('should handle already formatted CNPJ', () => {
    expect(formatCNPJ('11.444.777/0001-61')).toBe('11.444.777/0001-61');
  });

  // Test 37: Format partial CPF
  it('should handle partial CPF', () => {
    const result = formatCPF('529');
    expect(result).toContain('529');
  });
});

describe('Phone Formatting', () => {
  // Test 38: Format mobile phone (11 digits)
  it('should format mobile phone with 11 digits', () => {
    expect(formatPhone('11999887766')).toBe('(11) 99988-7766');
  });

  // Test 39: Format landline phone (10 digits)
  it('should format landline phone with 10 digits', () => {
    expect(formatPhone('1133445566')).toBe('(11) 3344-5566');
  });

  // Test 40: Format phone with country code
  it('should handle phone with country code', () => {
    const result = formatPhone('5511999887766');
    expect(result).toContain('99988-7766');
  });
});

describe('Address Formatting', () => {
  // Test 41: Format CEP
  it('should format CEP correctly', () => {
    expect(formatCEP('01310100')).toBe('01310-100');
  });

  // Test 42: Format CEP with hyphen
  it('should handle CEP already formatted', () => {
    expect(formatCEP('01310-100')).toBe('01310-100');
  });
});

describe('Date Formatting', () => {
  // Test 43: Format date default (dd/MM/yyyy)
  it('should format date in Brazilian format', () => {
    const date = new Date(2024, 11, 28); // Dec 28, 2024
    expect(formatDate(date)).toBe('28/12/2024');
  });

  // Test 44: Format date with custom format
  it('should format date with custom format', () => {
    const date = new Date(2024, 11, 28);
    expect(formatDate(date, 'MM/yyyy')).toBe('12/2024');
  });

  // Test 45: Format date from string
  it('should format date from ISO string', () => {
    expect(formatDate('2024-12-28')).toBe('28/12/2024');
  });
});

describe('Percentage Formatting', () => {
  // Test 46: Format percentage
  it('should format percentage correctly', () => {
    expect(formatPercentage(15.5)).toBe('15,50%');
  });

  // Test 47: Format percentage with custom decimals
  it('should format percentage with custom decimals', () => {
    expect(formatPercentage(15.5678, 4)).toBe('15,5678%');
  });

  // Test 48: Format zero percentage
  it('should format zero percentage', () => {
    expect(formatPercentage(0)).toBe('0,00%');
  });

  // Test 49: Format small percentage
  it('should format small percentage', () => {
    expect(formatPercentage(0.0025, 4)).toBe('0,0025%');
  });
});

describe('Legal Formatting', () => {
  // Test 50: Format OAB number
  it('should format OAB number', () => {
    expect(formatOAB('123456', 'SP')).toBe('OAB/SP 123.456');
  });

  // Test 51: Format case number (CNJ)
  it('should format CNJ case number', () => {
    const caseNum = '00012345620248260100';
    expect(formatCaseNumber(caseNum)).toBe('0001234-56.2024.8.26.0100');
  });

  // Test 52: Format already formatted case number
  it('should handle already formatted case number', () => {
    const caseNum = '0001234-56.2024.8.26.0100';
    expect(formatCaseNumber(caseNum)).toBe('0001234-56.2024.8.26.0100');
  });
});
