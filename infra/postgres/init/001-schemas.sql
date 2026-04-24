CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS gateway;
CREATE SCHEMA IF NOT EXISTS device_manager;
CREATE SCHEMA IF NOT EXISTS data_management;

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
    user_id UUID NOT NULL,
    template_id UUID NOT NULL REFERENCES device_manager.device_templates(template_id),
    device_name VARCHAR(255) NOT NULL,
    device_status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
    mqtt_topic VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_templates_created_by ON device_manager.device_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON device_manager.template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON device_manager.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_template_id ON device_manager.devices(template_id);
