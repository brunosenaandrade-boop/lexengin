/**
 * CPF/CNPJ Validation Tests
 * 20 tests covering all validation scenarios
 */

import { describe, it, expect } from 'vitest';
import {
  isValidCPF,
  isValidCNPJ,
  isValidCPFCNPJ,
  generateCPF,
  generateCNPJ,
  getCPFCNPJType,
  cleanCPFCNPJ,
} from '@/lib/utils/cpf-cnpj';

describe('CPF Validation', () => {
  // Test 1: Valid CPF without formatting
  it('should validate a valid CPF without formatting', () => {
    expect(isValidCPF('52998224725')).toBe(true);
  });

  // Test 2: Valid CPF with formatting
  it('should validate a valid CPF with formatting', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
  });

  // Test 3: Invalid CPF - wrong check digit
  it('should reject CPF with wrong check digit', () => {
    expect(isValidCPF('52998224726')).toBe(false);
  });

  // Test 4: Invalid CPF - all same digits
  it('should reject CPF with all same digits (111.111.111-11)', () => {
    expect(isValidCPF('11111111111')).toBe(false);
  });

  // Test 5: Invalid CPF - all zeros
  it('should reject CPF with all zeros', () => {
    expect(isValidCPF('00000000000')).toBe(false);
  });

  // Test 6: Invalid CPF - wrong length
  it('should reject CPF with wrong length', () => {
    expect(isValidCPF('1234567890')).toBe(false);
    expect(isValidCPF('123456789012')).toBe(false);
  });

  // Test 7: Invalid CPF - random invalid number
  it('should reject random invalid CPF', () => {
    expect(isValidCPF('12345678901')).toBe(false); // Invalid check digits
  });

  // Test 8: CPF with special characters should work
  it('should handle CPF with various separators', () => {
    expect(isValidCPF('529-982-247-25')).toBe(true);
  });
});

describe('CNPJ Validation', () => {
  // Test 9: Valid CNPJ without formatting
  it('should validate a valid CNPJ without formatting', () => {
    expect(isValidCNPJ('11444777000161')).toBe(true);
  });

  // Test 10: Valid CNPJ with formatting
  it('should validate a valid CNPJ with formatting', () => {
    expect(isValidCNPJ('11.444.777/0001-61')).toBe(true);
  });

  // Test 11: Invalid CNPJ - wrong check digit
  it('should reject CNPJ with wrong check digit', () => {
    expect(isValidCNPJ('11444777000162')).toBe(false);
  });

  // Test 12: Invalid CNPJ - all same digits
  it('should reject CNPJ with all same digits', () => {
    expect(isValidCNPJ('11111111111111')).toBe(false);
  });

  // Test 13: Invalid CNPJ - wrong length
  it('should reject CNPJ with wrong length', () => {
    expect(isValidCNPJ('1144477700016')).toBe(false);
    expect(isValidCNPJ('114447770001611')).toBe(false);
  });

  // Test 14: Valid CNPJ for common company
  it('should validate Petrobras CNPJ', () => {
    expect(isValidCNPJ('33.000.167/0001-01')).toBe(true);
  });
});

describe('CPF/CNPJ Auto-detection', () => {
  // Test 15: Auto-detect CPF
  it('should auto-detect and validate CPF', () => {
    expect(isValidCPFCNPJ('52998224725')).toBe(true);
  });

  // Test 16: Auto-detect CNPJ
  it('should auto-detect and validate CNPJ', () => {
    expect(isValidCPFCNPJ('11444777000161')).toBe(true);
  });

  // Test 17: Reject invalid length
  it('should reject invalid length for auto-detection', () => {
    expect(isValidCPFCNPJ('12345')).toBe(false);
  });
});

describe('CPF/CNPJ Generation', () => {
  // Test 18: Generate valid CPF
  it('should generate a valid CPF', () => {
    const cpf = generateCPF();
    expect(cpf).toHaveLength(11);
    expect(isValidCPF(cpf)).toBe(true);
  });

  // Test 19: Generate valid CNPJ
  it('should generate a valid CNPJ', () => {
    const cnpj = generateCNPJ();
    expect(cnpj).toHaveLength(14);
    expect(isValidCNPJ(cnpj)).toBe(true);
  });

  // Test 20: Generate multiple unique CPFs
  it('should generate unique CPFs', () => {
    const cpfs = new Set();
    for (let i = 0; i < 10; i++) {
      cpfs.add(generateCPF());
    }
    expect(cpfs.size).toBeGreaterThan(5); // At least 5 unique
  });
});

describe('CPF/CNPJ Utilities', () => {
  // Test 21: Get type CPF
  it('should identify CPF type', () => {
    expect(getCPFCNPJType('52998224725')).toBe('cpf');
  });

  // Test 22: Get type CNPJ
  it('should identify CNPJ type', () => {
    expect(getCPFCNPJType('11444777000161')).toBe('cnpj');
  });

  // Test 23: Get type unknown
  it('should return unknown for invalid length', () => {
    expect(getCPFCNPJType('12345')).toBe('unknown');
  });

  // Test 24: Clean CPF
  it('should clean CPF formatting', () => {
    expect(cleanCPFCNPJ('529.982.247-25')).toBe('52998224725');
  });

  // Test 25: Clean CNPJ
  it('should clean CNPJ formatting', () => {
    expect(cleanCPFCNPJ('11.444.777/0001-61')).toBe('11444777000161');
  });
});
