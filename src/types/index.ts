// =====================================================
// LEXENGINE - TYPE DEFINITIONS
// =====================================================

// ===================
// USER & AUTH
// ===================

export interface User {
  id: string;
  email: string;
  name: string;
  oabNumber?: string;
  oabState?: string;
  phone?: string;
  avatarUrl?: string;
  role: 'advogado' | 'admin' | 'estagiario';
  createdAt: Date;
  updatedAt: Date;
}

export interface Office {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  ownerId: string;
  createdAt: Date;
}

export interface OfficeMember {
  id: string;
  officeId: string;
  userId: string;
  role: 'admin' | 'membro' | 'estagiario';
  createdAt: Date;
}

// ===================
// CLIENTS
// ===================

export interface Client {
  id: string;
  officeId: string;
  type: 'pf' | 'pj';
  name: string;
  cpfCnpj?: string;
  rg?: string;
  birthDate?: Date;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  notes?: string;
  portalAccess: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===================
// CASES (PROCESSOS)
// ===================

export interface Case {
  id: string;
  officeId: string;
  clientId?: string;
  caseNumber?: string;
  court?: string;
  courtType?: 'TJ' | 'TRF' | 'TST' | 'TRT' | 'STJ' | 'STF';
  state?: string;
  area: 'trabalhista' | 'civel' | 'criminal' | 'familia' | 'previdenciario' | 'tributario' | 'outro';
  subject?: string;
  value?: number;
  status: 'ativo' | 'arquivado' | 'encerrado' | 'suspenso';
  clientRole?: 'autor' | 'reu' | 'terceiro';
  opposingParty?: string;
  opposingLawyer?: string;
  opposingOab?: string;
  filingDate?: Date;
  lastMovementDate?: Date;
  nextDeadline?: Date;
  monitoringEnabled: boolean;
  monitoringSource?: 'pje' | 'esaj' | 'projudi' | 'manual';
  externalId?: string;
  notes?: string;
  createdBy: string;
  responsibleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseMovement {
  id: string;
  caseId: string;
  date: Date;
  description: string;
  source: 'api' | 'manual';
  externalId?: string;
  isDeadline: boolean;
  notified: boolean;
  createdAt: Date;
}

export interface CaseDeadline {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  dueDate: Date;
  dueTime?: string;
  type: 'prazo' | 'audiencia' | 'pericia' | 'reuniao' | 'outro';
  status: 'pendente' | 'concluido' | 'cancelado';
  reminderDays: number;
  completedAt?: Date;
  completedBy?: string;
  createdAt: Date;
}

// ===================
// CALCULATIONS
// ===================

export interface Calculation {
  id: string;
  officeId: string;
  userId: string;
  caseId?: string;
  type: CalculationType;
  name?: string;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  breakdown?: CalculationBreakdown[];
  indicesUsed?: IndexUsage[];
  pdfPath?: string;
  createdAt: Date;
}

export type CalculationType =
  | 'fgts'
  | 'verbas-rescisorias'
  | 'horas-extras'
  | 'adicional-noturno'
  | 'ferias'
  | 'decimo-terceiro'
  | 'multa-fgts'
  | 'aviso-previo'
  | 'inss'
  | 'aposentadoria'
  | 'rmi'
  | 'revisao-vida-toda'
  | 'pensao-alimenticia'
  | 'divorcio'
  | 'guarda-compartilhada'
  | 'dosimetria'
  | 'progressao-regime'
  | 'detracao-penal'
  | 'correcao-monetaria'
  | 'juros-moratorios'
  | 'danos-morais'
  | 'liquidacao';

export interface CalculationBreakdown {
  periodo: string;
  descricao: string;
  valorBase: number;
  indice?: number;
  correcao?: number;
  juros?: number;
  valorFinal: number;
}

export interface IndexUsage {
  type: IndexType;
  startDate: string;
  endDate: string;
  source: string;
}

// ===================
// ECONOMIC INDICES
// ===================

export type IndexType = 'inpc' | 'ipca' | 'tr' | 'selic' | 'cdi' | 'igpm' | 'incc' | 'ufir';

export interface EconomicIndex {
  id: string;
  type: IndexType;
  referenceDate: Date;
  value: number;
  accumulated12m?: number;
  accumulatedYear?: number;
  source: string;
  fetchedAt: Date;
}

export interface MinimumWage {
  id: string;
  startDate: Date;
  endDate?: Date;
  value: number;
}

export interface INSSCeiling {
  id: string;
  year: number;
  value: number;
}

// ===================
// FINANCIAL
// ===================

export interface Fee {
  id: string;
  officeId: string;
  caseId?: string;
  clientId?: string;
  description: string;
  type: 'inicial' | 'exito' | 'hora' | 'fixo' | 'custas';
  amount: number;
  dueDate?: Date;
  paidDate?: Date;
  status: 'pendente' | 'pago' | 'cancelado' | 'atrasado';
  paymentMethod?: 'pix' | 'boleto' | 'cartao' | 'dinheiro' | 'transferencia';
  receiptPath?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  officeId: string;
  caseId?: string;
  categoryId?: string;
  description: string;
  amount: number;
  date: Date;
  reimbursable: boolean;
  reimbursed: boolean;
  receiptPath?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

// ===================
// DOCUMENTS
// ===================

export interface DocumentTemplate {
  id: string;
  officeId?: string;
  name: string;
  category: 'peticao' | 'contrato' | 'procuracao' | 'notificacao' | 'outro';
  area?: string;
  content: string;
  variables?: DocumentVariable[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface DocumentVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required: boolean;
}

export interface GeneratedDocument {
  id: string;
  officeId: string;
  templateId?: string;
  caseId?: string;
  clientId?: string;
  name: string;
  content: string;
  aiGenerated: boolean;
  aiModel?: string;
  aiPrompt?: string;
  filePath?: string;
  createdBy: string;
  createdAt: Date;
}

// ===================
// EVENTS & AGENDA
// ===================

export interface Event {
  id: string;
  officeId: string;
  caseId?: string;
  clientId?: string;
  title: string;
  description?: string;
  type: 'audiencia' | 'reuniao' | 'prazo' | 'pericia' | 'compromisso';
  startTime: Date;
  endTime?: Date;
  allDay: boolean;
  location?: string;
  videoLink?: string;
  reminderMinutes: number;
  googleEventId?: string;
  createdBy: string;
  createdAt: Date;
}

// ===================
// NOTIFICATIONS
// ===================

export interface Notification {
  id: string;
  userId: string;
  type: 'prazo' | 'movimento' | 'pagamento' | 'sistema';
  title: string;
  message?: string;
  referenceType?: string;
  referenceId?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

// ===================
// API RESPONSE TYPES
// ===================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===================
// FORM INPUT TYPES
// ===================

export interface FGTSInput {
  saldoInicial: number;
  dataInicio: Date;
  dataFim: Date;
  depositosMensais?: number;
  tipoCorrecao: 'TR' | 'TR_SELIC';
}

export interface FGTSOutput {
  saldoFinal: number;
  correcaoMonetaria: number;
  juros: number;
  totalDepositos: number;
  diferencaDevida: number;
  breakdown: FGTSBreakdownItem[];
}

export interface FGTSBreakdownItem {
  periodo: string;
  saldoInicial: number;
  deposito: number;
  trAplicada: number;
  correcaoTR: number;
  jurosAplicados: number;
  juros: number;
  saldoFinal: number;
}

export interface CorrecaoMonetariaInput {
  valorOriginal: number;
  dataInicio: Date;
  dataFim: Date;
  indice: IndexType;
  incluirJuros: boolean;
  taxaJuros?: number;
  tipoJuros?: 'simples' | 'composto';
}

export interface CorrecaoMonetariaOutput {
  valorOriginal: number;
  valorCorrigido: number;
  correcaoMonetaria: number;
  juros: number;
  valorTotal: number;
  fatorCorrecao: number;
  breakdown: CorrecaoBreakdownItem[];
}

export interface CorrecaoBreakdownItem {
  periodo: string;
  indice: number;
  fatorAcumulado: number;
  valorCorrigido: number;
  juros?: number;
}

export interface DosimetriaInput {
  penaBase: number;
  unidadePena: 'anos' | 'meses' | 'dias';
  circunstanciasJudiciais: number; // -3 a +3
  agravantes: AgravanteFator[];
  atenuantes: AtenuanteFator[];
  causasAumento: CausaFator[];
  causasDiminuicao: CausaFator[];
}

export interface AgravanteFator {
  descricao: string;
  fator: number; // 0.16666... (1/6)
}

export interface AtenuanteFator {
  descricao: string;
  fator: number; // 0.16666... (1/6)
}

export interface CausaFator {
  descricao: string;
  fracao: string; // "1/3", "1/2", "2/3"
}

export interface DosimetriaOutput {
  penaBase: number;
  penaIntermediaria: number;
  penaDefinitiva: number;
  regimeInicial: 'fechado' | 'semiaberto' | 'aberto';
  detalhamento: DosimetriaDetalhamento;
}

export interface DosimetriaDetalhamento {
  fase1: {
    penaBase: number;
    circunstancias: number;
    resultado: number;
  };
  fase2: {
    penaAnterior: number;
    agravantes: number;
    atenuantes: number;
    resultado: number;
  };
  fase3: {
    penaAnterior: number;
    aumentos: number;
    diminuicoes: number;
    resultado: number;
  };
}

export interface ProgressaoRegimenInput {
  penaTotal: number;
  unidadePena: 'anos' | 'meses' | 'dias';
  regimeAtual: 'fechado' | 'semiaberto' | 'aberto';
  tipoCrime: 'comum' | 'hediondo' | 'hediondo_reincidente';
  dataInicioExecucao: Date;
  diasRemidos?: number;
  reincidente: boolean;
}

export interface ProgressaoRegimenOutput {
  dataProgressao: Date;
  diasRestantes: number;
  fracaoExigida: string;
  diasCumpridos: number;
  diasNecessarios: number;
  proximoRegime: 'semiaberto' | 'aberto' | 'livramento';
}
