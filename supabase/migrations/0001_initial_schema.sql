-- =====================================================
-- LEXENGINE DATABASE SCHEMA
-- PostgreSQL (Supabase)
-- Migration: 0001_initial_schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================
-- USERS AND AUTH
-- ===================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    oab_number VARCHAR(20),
    oab_state CHAR(2),
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'advogado', -- advogado, admin, estagiario
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    address TEXT,
    city VARCHAR(100),
    state CHAR(2),
    cep VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS office_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'membro', -- admin, membro, estagiario
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(office_id, user_id)
);

-- ===================
-- CLIENTS
-- ===================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL, -- pf, pj
    name VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(18),
    rg VARCHAR(20),
    birth_date DATE,
    email VARCHAR(255),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state CHAR(2),
    cep VARCHAR(10),
    notes TEXT,
    portal_access BOOLEAN DEFAULT FALSE,
    portal_password_hash TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===================
-- CASES (PROCESSOS)
-- ===================

CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id),
    case_number VARCHAR(30), -- Número CNJ
    court VARCHAR(100), -- Tribunal/Vara
    court_type VARCHAR(50), -- TJ, TRF, TST, STJ, STF
    state CHAR(2),
    area VARCHAR(50), -- trabalhista, civel, criminal, familia, previdenciario
    subject TEXT, -- Assunto
    value DECIMAL(15,2), -- Valor da causa
    status VARCHAR(30) DEFAULT 'ativo', -- ativo, arquivado, encerrado, suspenso

    -- Partes
    client_role VARCHAR(20), -- autor, reu, terceiro
    opposing_party VARCHAR(255), -- Parte contrária
    opposing_lawyer VARCHAR(255),
    opposing_oab VARCHAR(20),

    -- Datas
    filing_date DATE, -- Data de distribuição
    last_movement_date TIMESTAMP,
    next_deadline DATE,

    -- Monitoramento
    monitoring_enabled BOOLEAN DEFAULT TRUE,
    monitoring_source VARCHAR(20), -- pje, esaj, projudi, manual
    external_id VARCHAR(100), -- ID no sistema do tribunal

    notes TEXT,
    created_by UUID REFERENCES users(id),
    responsible_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    date TIMESTAMP NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(20), -- api, manual
    external_id VARCHAR(100),
    is_deadline BOOLEAN DEFAULT FALSE,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_deadlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP NOT NULL,
    due_time TIME,
    type VARCHAR(30), -- prazo, audiencia, pericia, reuniao, outro
    status VARCHAR(20) DEFAULT 'pendente', -- pendente, concluido, cancelado
    reminder_days INTEGER DEFAULT 3,
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- peticao, contrato, procuracao, documento, outros
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================
-- CALCULATIONS
-- ===================

CREATE TABLE IF NOT EXISTS calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    case_id UUID REFERENCES cases(id),

    type VARCHAR(50) NOT NULL, -- fgts, inss, pensao, divorcio, dosimetria, etc
    name VARCHAR(255),

    -- Dados de entrada e saída (JSON)
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    breakdown JSONB, -- Memória de cálculo detalhada

    -- Índices utilizados
    indices_used JSONB,

    -- PDF gerado
    pdf_path TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================
-- FINANCIAL
-- ===================

CREATE TABLE IF NOT EXISTS financial_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL, -- receita, despesa
    color VARCHAR(7), -- Hex color
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id),
    client_id UUID REFERENCES clients(id),

    description VARCHAR(255) NOT NULL,
    type VARCHAR(30), -- inicial, exito, hora, fixo, custas

    amount DECIMAL(15,2) NOT NULL,
    due_date DATE,
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pendente', -- pendente, pago, cancelado, atrasado

    payment_method VARCHAR(30), -- pix, boleto, cartao, dinheiro, transferencia
    receipt_path TEXT,
    notes TEXT,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id),
    category_id UUID REFERENCES financial_categories(id),

    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,

    reimbursable BOOLEAN DEFAULT FALSE, -- Cliente reembolsa
    reimbursed BOOLEAN DEFAULT FALSE,

    receipt_path TEXT,
    notes TEXT,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================
-- DOCUMENTS AND TEMPLATES
-- ===================

CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id), -- NULL = template global

    name VARCHAR(255) NOT NULL,
    category VARCHAR(50), -- peticao, contrato, procuracao, notificacao
    area VARCHAR(50), -- trabalhista, civel, criminal, familia

    content TEXT NOT NULL, -- HTML/Markdown com variáveis
    variables JSONB, -- Lista de variáveis disponíveis

    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    template_id UUID REFERENCES document_templates(id),
    case_id UUID REFERENCES cases(id),
    client_id UUID REFERENCES clients(id),

    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,

    -- IA
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_model VARCHAR(50),
    ai_prompt TEXT,

    file_path TEXT, -- PDF gerado

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================
-- EVENTS & AGENDA
-- ===================

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id),
    client_id UUID REFERENCES clients(id),

    title VARCHAR(255) NOT NULL,
    description TEXT,

    type VARCHAR(30), -- audiencia, reuniao, prazo, pericia, compromisso

    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    all_day BOOLEAN DEFAULT FALSE,

    location TEXT,
    video_link TEXT,

    reminder_minutes INTEGER DEFAULT 60,

    google_event_id VARCHAR(100),

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pendente', -- pendente, confirmado, recusado
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================
-- NOTIFICATIONS
-- ===================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL, -- prazo, movimento, pagamento, sistema
    title VARCHAR(255) NOT NULL,
    message TEXT,

    reference_type VARCHAR(50), -- case, deadline, fee, document
    reference_id UUID,

    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================
-- ECONOMIC INDICES (CACHE)
-- ===================

CREATE TABLE IF NOT EXISTS economic_indices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL, -- inpc, ipca, tr, selic, cdi, igpm
    reference_date DATE NOT NULL,
    value DECIMAL(10,6) NOT NULL,
    accumulated_12m DECIMAL(10,6),
    accumulated_year DECIMAL(10,6),
    source VARCHAR(50),
    fetched_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(type, reference_date)
);

CREATE TABLE IF NOT EXISTS minimum_wages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_date DATE NOT NULL,
    end_date DATE,
    value DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inss_ceilings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(year)
);

-- ===================
-- PLANS AND SUBSCRIPTIONS
-- ===================

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    interval VARCHAR(20) DEFAULT 'month', -- month, year

    max_users INTEGER,
    max_cases INTEGER,
    max_calculations INTEGER,
    max_storage_gb INTEGER,

    features JSONB,

    stripe_price_id VARCHAR(100),

    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id),

    status VARCHAR(20) DEFAULT 'active', -- active, canceled, past_due, trialing

    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================
-- AUDIT LOG
-- ===================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id),
    user_id UUID REFERENCES users(id),

    action VARCHAR(50) NOT NULL, -- create, update, delete, view, export
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,

    old_data JSONB,
    new_data JSONB,

    ip_address VARCHAR(45),
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX IF NOT EXISTS idx_cases_office ON cases(office_id);
CREATE INDEX IF NOT EXISTS idx_cases_client ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_case_movements_case ON case_movements(case_id);
CREATE INDEX IF NOT EXISTS idx_case_movements_date ON case_movements(date);
CREATE INDEX IF NOT EXISTS idx_case_deadlines_due ON case_deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_calculations_office ON calculations(office_id);
CREATE INDEX IF NOT EXISTS idx_calculations_type ON calculations(type);
CREATE INDEX IF NOT EXISTS idx_fees_office ON fees(office_id);
CREATE INDEX IF NOT EXISTS idx_fees_status ON fees(status);
CREATE INDEX IF NOT EXISTS idx_fees_due ON fees(due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_economic_indices_type_date ON economic_indices(type, reference_date);
CREATE INDEX IF NOT EXISTS idx_clients_office ON clients(office_id);
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj ON clients(cpf_cnpj);

-- ===================
-- ROW LEVEL SECURITY (RLS)
-- ===================

ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ===================
-- RLS POLICIES
-- ===================

-- Users can see their own offices
CREATE POLICY "Users can view own offices" ON offices
    FOR SELECT USING (
        owner_id = auth.uid() OR
        id IN (SELECT office_id FROM office_members WHERE user_id = auth.uid())
    );

-- Users can view their office members
CREATE POLICY "Users can view office members" ON office_members
    FOR SELECT USING (
        office_id IN (SELECT office_id FROM office_members WHERE user_id = auth.uid())
    );

-- Users can view their office clients
CREATE POLICY "Users can view office clients" ON clients
    FOR SELECT USING (
        office_id IN (SELECT office_id FROM office_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert office clients" ON clients
    FOR INSERT WITH CHECK (
        office_id IN (SELECT office_id FROM office_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update office clients" ON clients
    FOR UPDATE USING (
        office_id IN (SELECT office_id FROM office_members WHERE user_id = auth.uid())
    );

-- Users can view their office cases
CREATE POLICY "Users can view office cases" ON cases
    FOR SELECT USING (
        office_id IN (SELECT office_id FROM office_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert office cases" ON cases
    FOR INSERT WITH CHECK (
        office_id IN (SELECT office_id FROM office_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update office cases" ON cases
    FOR UPDATE USING (
        office_id IN (SELECT office_id FROM office_members WHERE user_id = auth.uid())
    );

-- Users can view their calculations
CREATE POLICY "Users can view calculations" ON calculations
    FOR SELECT USING (
        user_id = auth.uid() OR
        office_id IN (SELECT office_id FROM office_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert calculations" ON calculations
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        office_id IN (SELECT office_id FROM office_members WHERE user_id = auth.uid())
    );

-- Users can view their notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- ===================
-- FUNCTIONS
-- ===================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===================
-- SEED DATA
-- ===================

-- Insert default plans
INSERT INTO plans (name, price, interval, max_users, max_cases, max_calculations, max_storage_gb, features, active)
VALUES
    ('Starter', 0, 'month', 1, 10, 50, 1, '{"calculadoras": true, "processos": true, "clientes": true}', true),
    ('Professional', 99.90, 'month', 5, 100, 500, 10, '{"calculadoras": true, "processos": true, "clientes": true, "documentos": true, "whatsapp": true}', true),
    ('Enterprise', 299.90, 'month', NULL, NULL, NULL, 100, '{"calculadoras": true, "processos": true, "clientes": true, "documentos": true, "whatsapp": true, "api": true, "suporte_prioritario": true}', true)
ON CONFLICT DO NOTHING;

-- Insert minimum wages history
INSERT INTO minimum_wages (start_date, end_date, value)
VALUES
    ('2024-01-01', '2024-12-31', 1412.00),
    ('2023-01-01', '2023-12-31', 1320.00),
    ('2022-01-01', '2022-12-31', 1212.00),
    ('2021-01-01', '2021-12-31', 1100.00),
    ('2020-01-01', '2020-12-31', 1045.00)
ON CONFLICT DO NOTHING;

-- Insert INSS ceilings
INSERT INTO inss_ceilings (year, value)
VALUES
    (2024, 7786.02),
    (2023, 7507.49),
    (2022, 7087.22),
    (2021, 6433.57),
    (2020, 6101.06)
ON CONFLICT DO NOTHING;
