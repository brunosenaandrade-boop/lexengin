/**
 * Type Definitions Tests
 * 13 tests covering type safety and structure
 */

import { describe, it, expect } from 'vitest';
import type {
  User,
  Client,
  Case,
  Calculation,
  FGTSInput,
  FGTSOutput,
  FGTSBreakdownItem,
  CorrecaoMonetariaInput,
  DosimetriaInput,
  ProgressaoRegimenInput,
  CalculationType,
  IndexType,
} from '@/types';

describe('User Type', () => {
  // Test 78: User type structure
  it('should have correct User structure', () => {
    const user: User = {
      id: '123',
      email: 'test@test.com',
      name: 'Test User',
      role: 'advogado',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.role).toBe('advogado');
  });

  // Test 79: User optional fields
  it('should accept optional OAB fields', () => {
    const user: User = {
      id: '123',
      email: 'test@test.com',
      name: 'Test User',
      oabNumber: '123456',
      oabState: 'SP',
      role: 'advogado',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(user.oabNumber).toBe('123456');
    expect(user.oabState).toBe('SP');
  });
});

describe('Client Type', () => {
  // Test 80: Client PF type
  it('should accept PF client type', () => {
    const client: Client = {
      id: '123',
      officeId: '456',
      type: 'pf',
      name: 'João Silva',
      cpfCnpj: '12345678901',
      portalAccess: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(client.type).toBe('pf');
  });

  // Test 81: Client PJ type
  it('should accept PJ client type', () => {
    const client: Client = {
      id: '123',
      officeId: '456',
      type: 'pj',
      name: 'Empresa LTDA',
      cpfCnpj: '12345678000199',
      portalAccess: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(client.type).toBe('pj');
  });
});

describe('Case Type', () => {
  // Test 82: Case area types
  it('should accept valid area types', () => {
    const validAreas: Case['area'][] = [
      'trabalhista',
      'civel',
      'criminal',
      'familia',
      'previdenciario',
      'tributario',
      'outro',
    ];

    validAreas.forEach((area) => {
      const caseItem: Partial<Case> = { area };
      expect(caseItem.area).toBe(area);
    });
  });

  // Test 83: Case status types
  it('should accept valid status types', () => {
    const validStatuses: Case['status'][] = [
      'ativo',
      'arquivado',
      'encerrado',
      'suspenso',
    ];

    validStatuses.forEach((status) => {
      const caseItem: Partial<Case> = { status };
      expect(caseItem.status).toBe(status);
    });
  });
});

describe('Calculation Types', () => {
  // Test 84: CalculationType enum values
  it('should have all calculation types', () => {
    const types: CalculationType[] = [
      'fgts',
      'verbas-rescisorias',
      'horas-extras',
      'adicional-noturno',
      'ferias',
      'decimo-terceiro',
      'multa-fgts',
      'aviso-previo',
      'inss',
      'aposentadoria',
      'rmi',
      'revisao-vida-toda',
      'pensao-alimenticia',
      'divorcio',
      'guarda-compartilhada',
      'dosimetria',
      'progressao-regime',
      'detracao-penal',
      'correcao-monetaria',
      'juros-moratorios',
      'danos-morais',
      'liquidacao',
    ];

    expect(types).toHaveLength(22);
  });
});

describe('Index Types', () => {
  // Test 85: IndexType enum values
  it('should have all index types', () => {
    const types: IndexType[] = [
      'inpc',
      'ipca',
      'tr',
      'selic',
      'cdi',
      'igpm',
      'incc',
      'ufir',
    ];

    expect(types).toHaveLength(8);
  });
});

describe('FGTS Types', () => {
  // Test 86: FGTSInput structure
  it('should have correct FGTSInput structure', () => {
    const input: FGTSInput = {
      saldoInicial: 10000,
      dataInicio: new Date(),
      dataFim: new Date(),
      tipoCorrecao: 'TR',
    };

    expect(input.saldoInicial).toBe(10000);
    expect(input.tipoCorrecao).toBe('TR');
  });

  // Test 87: FGTSOutput structure
  it('should have correct FGTSOutput structure', () => {
    const output: FGTSOutput = {
      saldoFinal: 10500,
      correcaoMonetaria: 100,
      juros: 250,
      totalDepositos: 0,
      diferencaDevida: 0,
      breakdown: [],
    };

    expect(output.saldoFinal).toBe(10500);
    expect(output.breakdown).toEqual([]);
  });

  // Test 88: FGTSBreakdownItem structure
  it('should have correct FGTSBreakdownItem structure', () => {
    const item: FGTSBreakdownItem = {
      periodo: '01/2024',
      saldoInicial: 10000,
      deposito: 0,
      trAplicada: 0.0007,
      correcaoTR: 7,
      jurosAplicados: 0.0025,
      juros: 25,
      saldoFinal: 10032,
    };

    expect(item.periodo).toBe('01/2024');
    expect(item.saldoFinal).toBeGreaterThan(item.saldoInicial);
  });
});

describe('Dosimetria Types', () => {
  // Test 89: DosimetriaInput structure
  it('should have correct DosimetriaInput structure', () => {
    const input: DosimetriaInput = {
      penaBase: 6,
      unidadePena: 'anos',
      circunstanciasJudiciais: 0,
      agravantes: [],
      atenuantes: [],
      causasAumento: [],
      causasDiminuicao: [],
    };

    expect(input.penaBase).toBe(6);
    expect(input.unidadePena).toBe('anos');
  });
});

describe('Progressão Regime Types', () => {
  // Test 90: ProgressaoRegimenInput structure
  it('should have correct ProgressaoRegimenInput structure', () => {
    const input: ProgressaoRegimenInput = {
      penaTotal: 12,
      unidadePena: 'anos',
      regimeAtual: 'fechado',
      tipoCrime: 'comum',
      dataInicioExecucao: new Date(),
      reincidente: false,
    };

    expect(input.regimeAtual).toBe('fechado');
    expect(input.tipoCrime).toBe('comum');
  });
});
