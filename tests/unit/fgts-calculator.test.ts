/**
 * FGTS Calculator Tests
 * 25 tests covering all calculation scenarios
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Decimal from 'decimal.js';

// Mock the indices fetcher
vi.mock('@/lib/calculadoras/indices/fetcher', () => ({
  getMonthsBetween: vi.fn((start: Date, end: Date) => {
    const months: Date[] = [];
    const current = new Date(start);
    current.setDate(1);

    while (current <= end) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }),
  getTRFromStatic: vi.fn(() => 0.0007), // 0.07% monthly TR (mock)
}));

import {
  calcularFGTS,
  calcularMultaFGTS,
  calcularDepositoMensal,
  validateFGTSInput,
  generateFGTSReportData,
} from '@/lib/calculadoras/trabalhista/fgts';

describe('FGTS Calculator - Basic Calculations', () => {
  // Test 53: Calculate FGTS with simple values
  it('should calculate FGTS balance correctly', () => {
    const result = calcularFGTS({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 0, 31),
      tipoCorrecao: 'TR',
    });

    expect(result.saldoFinal).toBeGreaterThan(10000);
    expect(result.correcaoMonetaria).toBeGreaterThan(0);
    expect(result.juros).toBeGreaterThan(0);
  });

  // Test 54: Calculate with monthly deposits
  it('should include monthly deposits in calculation', () => {
    const result = calcularFGTS({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30), // 6 months
      depositosMensais: 500,
      tipoCorrecao: 'TR',
    });

    expect(result.totalDepositos).toBe(3000); // 6 * 500
    expect(result.saldoFinal).toBeGreaterThan(13000);
  });

  // Test 55: Calculate without deposits
  it('should work without monthly deposits', () => {
    const result = calcularFGTS({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 0, 31),
      tipoCorrecao: 'TR',
    });

    expect(result.totalDepositos).toBe(0);
  });

  // Test 56: Calculate with zero initial balance
  it('should calculate with zero initial balance', () => {
    const result = calcularFGTS({
      saldoInicial: 0,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 0, 31),
      depositosMensais: 1000,
      tipoCorrecao: 'TR',
    });

    expect(result.saldoFinal).toBeGreaterThan(0);
    expect(result.totalDepositos).toBe(1000);
  });

  // Test 57: Verify 3% annual interest rate
  it('should apply 3% annual interest (0.25% monthly)', () => {
    const result = calcularFGTS({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 0, 31),
      tipoCorrecao: 'TR',
    });

    // Monthly interest should be approximately 0.25% of balance
    const expectedMonthlyInterest = 10000 * 0.0025;
    expect(result.juros).toBeCloseTo(expectedMonthlyInterest, -1);
  });
});

describe('FGTS Calculator - TR+SELIC Mode', () => {
  // Test 58: Calculate with TR+SELIC
  it('should calculate difference with TR+SELIC', () => {
    const result = calcularFGTS({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      tipoCorrecao: 'TR_SELIC',
    });

    expect(result.diferencaDevida).toBeGreaterThan(0);
  });

  // Test 59: Compare TR vs TR+SELIC
  it('should have higher values with TR+SELIC', () => {
    const trResult = calcularFGTS({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      tipoCorrecao: 'TR',
    });

    const selicResult = calcularFGTS({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      tipoCorrecao: 'TR_SELIC',
    });

    expect(selicResult.diferencaDevida).toBeGreaterThan(0);
    expect(trResult.diferencaDevida).toBe(0);
  });
});

describe('FGTS Calculator - Breakdown', () => {
  // Test 60: Verify breakdown has correct number of entries
  it('should have breakdown entry for each month', () => {
    const result = calcularFGTS({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30), // 6 months
      tipoCorrecao: 'TR',
    });

    expect(result.breakdown.length).toBe(6);
  });

  // Test 61: Verify breakdown structure
  it('should have correct breakdown structure', () => {
    const result = calcularFGTS({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 0, 31),
      tipoCorrecao: 'TR',
    });

    const item = result.breakdown[0];
    expect(item).toHaveProperty('periodo');
    expect(item).toHaveProperty('saldoInicial');
    expect(item).toHaveProperty('deposito');
    expect(item).toHaveProperty('trAplicada');
    expect(item).toHaveProperty('correcaoTR');
    expect(item).toHaveProperty('juros');
    expect(item).toHaveProperty('saldoFinal');
  });

  // Test 62: Verify breakdown continuity
  it('should have continuous balance between months', () => {
    const result = calcularFGTS({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 2, 31), // 3 months
      tipoCorrecao: 'TR',
    });

    for (let i = 1; i < result.breakdown.length; i++) {
      expect(result.breakdown[i].saldoInicial).toBeCloseTo(
        result.breakdown[i - 1].saldoFinal,
        2
      );
    }
  });
});

describe('FGTS 40% Penalty', () => {
  // Test 63: Calculate 40% penalty
  it('should calculate 40% penalty correctly', () => {
    expect(calcularMultaFGTS(10000)).toBe(4000);
  });

  // Test 64: Calculate penalty with decimals
  it('should handle decimal values', () => {
    expect(calcularMultaFGTS(10000.50)).toBeCloseTo(4000.20, 2);
  });

  // Test 65: Calculate penalty for zero
  it('should return zero for zero balance', () => {
    expect(calcularMultaFGTS(0)).toBe(0);
  });
});

describe('Monthly Deposit Calculation', () => {
  // Test 66: Calculate 8% deposit
  it('should calculate 8% monthly deposit', () => {
    expect(calcularDepositoMensal(3000)).toBe(240);
  });

  // Test 67: Calculate deposit for minimum wage
  it('should calculate deposit for minimum wage', () => {
    expect(calcularDepositoMensal(1412)).toBeCloseTo(112.96, 2);
  });

  // Test 68: Calculate deposit with decimals
  it('should handle decimal salaries', () => {
    expect(calcularDepositoMensal(3500.75)).toBeCloseTo(280.06, 2);
  });
});

describe('FGTS Input Validation', () => {
  // Test 69: Valid input
  it('should return no errors for valid input', () => {
    const errors = validateFGTSInput({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      tipoCorrecao: 'TR',
    });

    expect(errors).toHaveLength(0);
  });

  // Test 70: Missing initial balance
  it('should error for missing initial balance', () => {
    const errors = validateFGTSInput({
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      tipoCorrecao: 'TR',
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('Saldo'))).toBe(true);
  });

  // Test 71: Negative initial balance
  it('should error for negative initial balance', () => {
    const errors = validateFGTSInput({
      saldoInicial: -1000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      tipoCorrecao: 'TR',
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  // Test 72: End date before start date
  it('should error when end date is before start date', () => {
    const errors = validateFGTSInput({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 5, 30),
      dataFim: new Date(2024, 0, 1),
      tipoCorrecao: 'TR',
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('anterior'))).toBe(true);
  });

  // Test 73: Invalid correction type
  it('should error for invalid correction type', () => {
    const errors = validateFGTSInput({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      tipoCorrecao: 'INVALID' as any,
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  // Test 74: Negative monthly deposits
  it('should error for negative monthly deposits', () => {
    const errors = validateFGTSInput({
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      depositosMensais: -100,
      tipoCorrecao: 'TR',
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('FGTS Report Generation', () => {
  // Test 75: Generate report data
  it('should generate complete report data', () => {
    const input = {
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      tipoCorrecao: 'TR' as const,
    };

    const output = calcularFGTS(input);
    const report = generateFGTSReportData(input, output);

    expect(report).toHaveProperty('titulo');
    expect(report).toHaveProperty('dataCalculo');
    expect(report).toHaveProperty('parametros');
    expect(report).toHaveProperty('resultados');
    expect(report).toHaveProperty('memoriaCalculo');
    expect(report).toHaveProperty('fundamentacao');
  });

  // Test 76: Report includes all parameters
  it('should include all input parameters in report', () => {
    const input = {
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      depositosMensais: 500,
      tipoCorrecao: 'TR' as const,
    };

    const output = calcularFGTS(input);
    const report = generateFGTSReportData(input, output);

    expect(report.parametros['Saldo Inicial']).toBe(10000);
    expect(report.parametros['Depósitos Mensais']).toBe(500);
  });

  // Test 77: Report includes all results
  it('should include all output values in report', () => {
    const input = {
      saldoInicial: 10000,
      dataInicio: new Date(2024, 0, 1),
      dataFim: new Date(2024, 5, 30),
      tipoCorrecao: 'TR' as const,
    };

    const output = calcularFGTS(input);
    const report = generateFGTSReportData(input, output);

    expect(report.resultados['Saldo Final']).toBe(output.saldoFinal);
    expect(report.resultados['Correção Monetária (TR)']).toBe(output.correcaoMonetaria);
    expect(report.resultados['Juros (3% a.a.)']).toBe(output.juros);
  });
});
