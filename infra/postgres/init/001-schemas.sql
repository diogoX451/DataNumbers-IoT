CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS gateway;
CREATE SCHEMA IF NOT EXISTS device_manager;
CREATE SCHEMA IF NOT EXISTS data_management;

CREATE TABLE IF NOT EXISTS auth.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'historys_type' AND typnamespace = 'gateway'::regnamespace) THEN
        CREATE TYPE gateway.historys_type AS ENUM ('error', 'warning', 'info', 'success');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS gateway.historys (
    id SERIAL PRIMARY KEY,
    observation VARCHAR(255) NOT NULL,
    type gateway.historys_type NOT NULL,
    username VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gateway.acls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_management.devices_data (
    id BIGSERIAL,
    time TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID,
    event_id UUID,
    device_id UUID,
    template_id UUID,
    schema_version INTEGER NOT NULL DEFAULT 1,
    topic VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (id, time)
);

SELECT create_hypertable('data_management.devices_data', 'time', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS device_manager.device_templates (
    template_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_manager.template_fields (
    field_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES device_manager.device_templates(template_id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_manager.devices (
    device_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    template_id UUID NOT NULL REFERENCES device_manager.device_templates(template_id),
    device_name VARCHAR(255) NOT NULL,
    device_status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
    mqtt_topic VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_manager.actuators (
    actuator_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES device_manager.devices(device_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    command_topic VARCHAR(255) NOT NULL,
    payload_schema JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SCHEMA IF NOT EXISTS automation;

CREATE TABLE IF NOT EXISTS automation.rules (
    rule_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
    scenario_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    -- Expressão govaluate (ex.: "temperatura > 25 && umidade < 50").
    -- Era JSONB mas o engine usa string; trocar para TEXT alinha código e schema.
    trigger_condition TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bancos pré-existentes podem ter trigger_condition como JSONB; converter.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'automation'
          AND table_name = 'rules'
          AND column_name = 'trigger_condition'
          AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE automation.rules
        ALTER COLUMN trigger_condition TYPE TEXT USING trigger_condition::text;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS automation.scenarios (
    scenario_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation.scenario_devices (
    scenario_id UUID REFERENCES automation.scenarios(scenario_id) ON DELETE CASCADE,
    device_id UUID REFERENCES device_manager.devices(device_id) ON DELETE CASCADE,
    PRIMARY KEY (scenario_id, device_id)
);

ALTER TABLE automation.rules ADD CONSTRAINT fk_scenario FOREIGN KEY (scenario_id) REFERENCES automation.scenarios(scenario_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS automation.rule_actions (
    action_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id UUID NOT NULL REFERENCES automation.rules(rule_id) ON DELETE CASCADE,
    actuator_id UUID NOT NULL REFERENCES device_manager.actuators(actuator_id),
    -- Template com placeholders (${payload.x}) interpolados em runtime; não é
    -- JSON válido antes da interpolação. Armazenamos como TEXT.
    payload_template TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'automation'
          AND table_name = 'rule_actions'
          AND column_name = 'payload_template'
          AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE automation.rule_actions
        ALTER COLUMN payload_template TYPE TEXT USING payload_template::text;
    END IF;
END
$$;

-- Evento de calendário interno (não sincronizado com Google): dispara
-- automation.rules por trigger_condition, do mesmo jeito que telemetria de
-- sensor dispara. Ver rule-engine/cmd/api/main.go (subscribe calendar.event.create).
CREATE TABLE IF NOT EXISTS automation.calendar_events (
    event_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES automation.scenarios(scenario_id) ON DELETE SET NULL,
    summary VARCHAR(255) NOT NULL,
    description TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_id ON automation.calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_starts_at ON automation.calendar_events(starts_at);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON auth.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acls_tenant_id ON gateway.acls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_data_tenant_id ON data_management.devices_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_templates_tenant_id ON device_manager.device_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_tenant_id ON device_manager.devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_templates_created_by ON device_manager.device_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON device_manager.template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON device_manager.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_template_id ON device_manager.devices(template_id);
