/**
 * Tipos espelhando exatamente as respostas dos serviços Go do backend.
 * Mantemos camelCase no frontend onde fizer sentido, mas como vários
 * endpoints já devolvem snake_case, optamos por preservar o shape original
 * para evitar transformação em massa. Telas que precisam de propriedade
 * "humana" usam selector no useQuery.
 */

// --- Auth ---

export type LoginResponse = {
  statusCode: number;
  method: string;
  message: string;
  data: {
    token: string;
    refresh_token: string;
  };
};

export type RegisterPayload = {
  name: string;
  email: string;
  username: string;
  password: string;
  company_name: string;
};

export type RegisterResponse = {
  data: {
    ID: string;
    TenantID: string;
    Name: string;
    Email: string;
    Username: string;
    CreatedAt: string;
    UpdatedAt: string;
  };
};

export type Me = {
  ID: string;
  TenantID: string;
  Name: string;
  Email: string;
  Username: string;
  CreatedAt: string;
  UpdatedAt: string;
};

// --- Device manager ---

export type TemplateField = {
  field_id?: string;
  name: string;
  type: string;
  required: boolean;
};

export type Template = {
  template_id: string;
  name: string;
  description: string;
  tenant_id?: string;
  created_by?: string;
  fields?: TemplateField[];
};

export type CreateTemplatePayload = {
  name: string;
  description?: string;
  fields: TemplateField[];
};

export type Device = {
  device_id: string;
  device_name: string;
  device_status: "ONLINE" | "OFFLINE" | string;
  mqtt_topic: string;
  template_id: string;
  template_name?: string;
  tenant_id?: string;
  user_id?: string;
};

export type CreateDevicePayload = {
  device_name: string;
  template_id: string;
  device_status?: string;
};

export type UpdateDevicePayload = {
  device_name?: string;
  template_id?: string;
  device_status?: string;
};

export type Actuator = {
  actuator_id: string;
  name: string;
  command_topic: string;
  payload_schema?: Record<string, unknown> | null;
  device_id?: string;
};

export type CreateActuatorPayload = {
  name: string;
  command_topic: string;
  payload_schema?: Record<string, unknown>;
};

// --- Rule engine ---

export type Scenario = {
  scenario_id: string;
  name: string;
  description: string;
  tenant_id?: string;
};

export type CreateScenarioPayload = {
  name: string;
  description?: string;
};

export type Rule = {
  rule_id: string;
  tenant_id?: string;
  scenario_id?: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_condition: string;
};

export type CreateRulePayload = {
  name: string;
  description?: string;
  trigger_condition: string;
  scenario_id?: string;
};

export type UpdateRulePayload = Partial<CreateRulePayload> & {
  is_active?: boolean;
};

export type RuleAction = {
  action_id: string;
  rule_id?: string;
  actuator_id: string;
  payload_template: string;
  command_topic?: string;
};

export type CreateActionPayload = {
  actuator_id: string;
  payload_template: string;
};

export type ScenarioDevice = {
  device_id: string;
  name: string;
  topic: string;
};

// --- Calendar ---

export type CalendarEvent = {
  event_id: string;
  scenario_id?: string;
  google_event_id?: string;
  synced_to_google: boolean;
  summary: string;
  description?: string;
  start: string;
  end: string;
  created_at: string;
};

export type CreateCalendarEventPayload = {
  summary: string;
  description?: string;
  scenario_id?: string;
  start: string;
  end: string;
};

// --- Telemetry ---

export type TelemetryRow = {
  time: string;
  event_id: string;
  topic: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type AggregationBucket = {
  bucket: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  samples: number;
};

export type AggregationResponse = {
  data: AggregationBucket[];
  field: string;
  bucket: string;
};

// --- Gateway ---

export type CreateAclPayload = {
  tenant_id: string;
  username: string;
  topic: string;
  action: string;
  permission: string;
};

export type HistoryEntry = {
  id: number;
  observation: string;
  type: "error" | "warning" | "info" | "success" | string;
  username: string;
  topic: string;
  created_at: string;
  updated_at: string;
};

// --- Stream WebSocket envelope (publicado pelo gateway-emqx) ---

export type TelemetryEnvelope = {
  event_id: string;
  device_id: string;
  template_id: string;
  tenant_id: string;
  schema_version: number;
  topic: string;
  timestamp: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
};
