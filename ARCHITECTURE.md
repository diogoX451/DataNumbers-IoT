# DataNumbers-IoT — Arquitetura e Detalhes Técnicos

> Documento técnico exaustivo. Para visão geral rápida, ver [README.md](README.md).
> Para detalhes do frontend, ver [datanumbers-iot-web/README.md](datanumbers-iot-web/README.md).

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Stack tecnológica](#2-stack-tecnológica)
3. [Topologia](#3-topologia)
4. [Esquema do banco](#4-esquema-do-banco)
5. [Contratos NATS](#5-contratos-nats)
6. [Serviços Go](#6-serviços-go)
   - [6.1 auth-api](#61-auth-api)
   - [6.2 device-manager](#62-device-manager)
   - [6.3 gateway-emqx](#63-gateway-emqx)
   - [6.4 data-management](#64-data-management)
   - [6.5 rule-engine](#65-rule-engine)
7. [Frontend (datanumbers-iot-web)](#7-frontend-datanumbers-iot-web)
8. [Infraestrutura compartilhada](#8-infraestrutura-compartilhada)
9. [Fluxos end-to-end](#9-fluxos-end-to-end)
10. [Autenticação e multi-tenancy](#10-autenticação-e-multi-tenancy)
11. [Como rodar](#11-como-rodar)
12. [Portas, URLs e variáveis de ambiente](#12-portas-urls-e-variáveis-de-ambiente)
13. [Decisões técnicas](#13-decisões-técnicas)
14. [Pendências e roadmap](#14-pendências-e-roadmap)
15. [Apêndice: estrutura de diretórios](#15-apêndice-estrutura-de-diretórios)

---

## 1. Visão geral

**DataNumbers-IoT** é uma plataforma IoT multi-tenant cuja arquitetura central
é uma malha de microsserviços Go interligados por **NATS JetStream**, com
**EMQX** como ingress MQTT, **PostgreSQL + TimescaleDB** como banco único
(schemas por domínio) e um **frontend Vite/React** como console operacional.

**Casos de uso suportados:**

- Cadastrar dispositivos IoT que se comunicam via MQTT.
- Definir templates (schema dos dados que cada tipo de hardware manda).
- Agrupar dispositivos em **spaces** (ambientes lógicos).
- Definir **regras** SE/ENTÃO que disparam ações em **atuadores** quando a
  telemetria satisfaz uma condição.
- Consumir telemetria histórica do TimescaleDB e ao vivo via WebSocket.

**Não está no escopo (ainda):**

- Disparo manual de atuadores via UI (só via regra).
- Validação cruzada entre `payload_template` e `payload_schema`.
- Audit log de execução de regras.
- LoRa/gateway físico além de MQTT puro.

---

## 2. Stack tecnológica

| Camada | Tecnologia | Notas |
|---|---|---|
| Linguagem backend | Go 1.24.3 | 5 módulos unidos por `go.work` |
| Banco | PostgreSQL 16 + TimescaleDB | `timescale/timescaledb:latest-pg16` |
| Time-series | TimescaleDB hypertable | `data_management.devices_data` |
| Cache / sessão | Redis 7 | Auth-api guarda tokens; device-manager guarda metadata para enriquecimento |
| Broker de mensagens | NATS 2.10 + JetStream | streams `IOT_TELEMETRY`, subjects `iot.*` e `device.*`/`template.*` |
| MQTT broker | EMQX 5.3 | TCP 1883, WS 8083, MQTTS 8883, dashboard 18083 |
| HTTP API gateway | nginx alpine | Proxy reverso + CORS + WS upgrade |
| Frontend | Vite 6 + React 19 + TS strict | TanStack Router (file-based) + TanStack Query |
| Estilos frontend | Tailwind 3 + CSS custom properties | Tema light/dark por `[data-theme]` |
| Containers | Docker Compose v2 | 11 serviços |

### Bibliotecas Go por serviço

| Serviço | Libs notáveis |
|---|---|
| auth-api | `gin`, `gorm`, `golang-jwt/jwt/v5`, `gofrs/uuid`, `redis/go-redis/v9`, `gorm.io/driver/postgres`, `joho/godotenv` |
| device-manager | `database/sql` + `jackc/pgx/v5/stdlib`, `nats-io/nats.go`, `redis/go-redis/v9`, `golang-jwt/jwt/v5` |
| gateway-emqx | `gin`, `pgxpool`, `eclipse/paho.mqtt.golang`, `nats-io/nats.go`, `gorilla/websocket`, `go.uber.org/dig`, `xeipuuv/gojsonschema`, `golang-jwt/jwt/v5`, `redis/go-redis/v9`, `google.golang.org/grpc` |
| data-management | `database/sql` + pgx, `nats-io/nats.go`, `golang-jwt/jwt/v5` |
| rule-engine | `database/sql` + pgx, `nats-io/nats.go`, `Knetic/govaluate`, `golang-jwt/jwt/v5` |

---

## 3. Topologia

```
                       ┌────────────────────────────┐
                       │     Browser (frontend)     │
                       │  http://localhost:3030     │
                       └─────────────┬──────────────┘
                                     │ HTTP (CORS) + WS
                                     ▼
                       ┌────────────────────────────┐
                       │   nginx (API gateway)       │
                       │   :8080                     │
                       └──┬──────┬───┬───┬─────┬─────┘
                          │      │   │   │     │ /api/stream (WS)
                          ▼      ▼   ▼   ▼     ▼
                     /auth  /devices /rules /data  ─┐
                          │      │   │   │          │
                          ▼      ▼   ▼   ▼          │
                ┌───────────────────────────────────┴───┐
                │  Microsserviços Go (rede docker)      │
                │                                       │
                │  auth-api :3000   device-manager :3001│
                │  gateway-emqx :3002 data-management :3003
                │  rule-engine :3004                     │
                └──┬──────────┬──────┬──────────────┬───┘
                   │          │      │              │
            JWT │ pgx │  MQTT │ Paho  │ NATS         │
                   │          │      │              │
                   ▼          ▼      ▼              ▼
            ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
            │ Redis   │ │Postgres │ │  EMQX   │ │  NATS   │
            │ :6379   │ │+Timesc. │ │  :1883  │ │ +JetStrm│
            │         │ │ :5432   │ │         │ │  :4222  │
            └─────────┘ └─────────┘ └─────────┘ └─────────┘
                                          ▲
                                          │ MQTT pub/sub
                                          │
                                 ┌────────┴────────┐
                                 │  Dispositivos   │
                                 │  ESP32, etc.    │
                                 └─────────────────┘
```

### docker-compose: 11 serviços

| Serviço | Imagem | Porta host | Healthcheck |
|---|---|---|---|
| postgres | timescale/timescaledb:latest-pg16 | 5432 | `pg_isready` |
| redis | redis:7-alpine | 6380 | `redis-cli ping` |
| nats | nats:2.10-alpine | 4222, 8222 | `/healthz` |
| nats-ui | klinux/nats-ui:latest | 3131 | `/healthz` |
| emqx | emqx:5.3.0 | 1883, 8083, 8084, 8883, 18083 | `emqx ctl status` |
| auth-api | local build | 3000 | `/auth/verify-token` → 401 |
| device-manager | local build | 3001 | — |
| gateway-emqx | local build | 3002, 5051 (gRPC) | — |
| data-management | local build | 3003 | — |
| rule-engine | local build | 3004 | — |
| nginx | nginx:alpine | 8080 | — |
| web | local build (Vite + nginx) | 3030 | `wget /healthz` |

Total: **12 contêineres** (`web` foi adicionado depois do plano inicial).

Volumes nomeados: `postgres-data`, `nats-data`, `emqx-data`, `certs-data`
(este último compartilhado entre auth-api e os serviços que precisam da
chave pública JWT).

---

## 4. Esquema do banco

Arquivo: [infra/postgres/init/001-schemas.sql](infra/postgres/init/001-schemas.sql)

Extensões: `pgcrypto`, `timescaledb`.

### Schemas

| Schema | Domínio |
|---|---|
| `auth` | tenants e usuários |
| `gateway` | ACLs MQTT e audit (`historys`) |
| `device_manager` | templates, devices, actuators |
| `data_management` | hypertable de telemetria |
| `automation` | rules, scenarios, scenario_devices, rule_actions |

### Tabelas

#### `auth.tenants`
```sql
id          UUID PK (gen_random_uuid)
name        VARCHAR(255) UNIQUE NOT NULL
created_at, updated_at TIMESTAMP
```

#### `auth.users`
```sql
id          UUID PK
tenant_id   UUID FK → tenants.id ON DELETE CASCADE
name, email (UNIQUE), username (UNIQUE), password
created_at, updated_at
```

#### `gateway.historys`
```sql
id          SERIAL PK
observation VARCHAR(255)
type        ENUM(error, warning, info, success)
username, topic VARCHAR(255)
created_at, updated_at
```

#### `gateway.acls`
```sql
id          UUID PK
tenant_id   UUID FK → tenants.id ON DELETE CASCADE
username, action, topic, permission VARCHAR
created_at, updated_at
INDEX idx_acls_tenant_id
```

#### `device_manager.device_templates`
```sql
template_id  UUID PK
tenant_id    UUID FK → tenants.id
template_name, description, created_by UUID
created_at, updated_at TIMESTAMPTZ
```

#### `device_manager.template_fields`
```sql
field_id     UUID PK
template_id  UUID FK ON DELETE CASCADE
field_name, field_type VARCHAR
required     BOOLEAN
```

#### `device_manager.devices`
```sql
device_id    UUID PK (gen_random_uuid)
tenant_id    UUID FK
user_id      UUID NOT NULL
template_id  UUID FK
device_name, device_status, mqtt_topic VARCHAR
mqtt_topic   UNIQUE  (gerado server-side, nunca aceitar do cliente)
created_at, updated_at
```

#### `device_manager.actuators`
```sql
actuator_id    UUID PK
device_id      UUID FK ON DELETE CASCADE
name, command_topic VARCHAR
payload_schema JSONB
```

#### `data_management.devices_data` (hypertable)
```sql
id              BIGSERIAL
time            TIMESTAMPTZ NOT NULL
tenant_id, event_id, device_id, template_id UUID (NULLABLE — NULLIF)
schema_version  INT DEFAULT 1
topic           VARCHAR
payload         JSONB
metadata        JSONB DEFAULT '{}'
PRIMARY KEY (id, time)
-- create_hypertable('data_management.devices_data', 'time')
```

#### `automation.scenarios`
```sql
scenario_id    UUID PK
tenant_id      UUID FK
name, description
```

#### `automation.scenario_devices` (M:M)
```sql
scenario_id  UUID FK ON DELETE CASCADE
device_id    UUID FK → devices ON DELETE CASCADE
PRIMARY KEY (scenario_id, device_id)
```

#### `automation.rules`
```sql
rule_id           UUID PK
tenant_id         UUID FK
scenario_id       UUID FK NULLABLE
name, description
is_active         BOOL DEFAULT true
trigger_condition TEXT  -- expressão govaluate (era JSONB, ver F-35)
```

#### `automation.rule_actions`
```sql
action_id        UUID PK
rule_id          UUID FK ON DELETE CASCADE
actuator_id      UUID FK → actuators
payload_template TEXT  -- template com ${payload.x} (era JSONB, ver F-35)
```

### Índices

```sql
idx_users_tenant_id
idx_acls_tenant_id
idx_devices_data_tenant_id
idx_device_templates_tenant_id
idx_devices_tenant_id
idx_device_templates_created_by
idx_template_fields_template_id
idx_devices_user_id
idx_devices_template_id
```

### Migrations idempotentes

O bloco `DO $$ ... $$` migra automaticamente bancos pré-existentes:
- Adiciona `success` ao enum `historys_type` se faltar.
- Converte `trigger_condition` e `payload_template` de JSONB → TEXT.

---

## 5. Contratos NATS

Diretório: [contracts/nats/](contracts/nats/)

### Subjects

| Subject | Publicado por | Consumido por |
|---|---|---|
| `iot.telemetry.received` | gateway-emqx | data-management, rule-engine, stream WS |
| `iot.telemetry.dlq` | data-management | — (operador inspeciona) |
| `iot.command.send` | rule-engine | gateway-emqx (→ MQTT pub) |
| `template.created` | device-manager | (livre) |
| `template.updated` | device-manager | (livre) |
| `template.deleted` | device-manager | (livre) |
| `device.created` | device-manager | (livre) |
| `device.updated` | device-manager | (livre) |
| `device.deleted` | device-manager | (livre) |
| `acl.created` | declarado, **não publicado** | — |

### Stream JetStream

```
Stream: IOT_TELEMETRY
  Subjects: [iot.telemetry.received, iot.telemetry.dlq]
  Retention: limits
  MaxAge: 7 dias
  Storage: file
```

Criado pelo `ensureStream()` no boot de:
- `data-management` (consumer durable `data-management-worker`)
- `rule-engine` (consumer durable `rule-engine-group`, queue subscribe)

Cada serviço cria o stream se não existir — operação **idempotente** via
`StreamInfo` → `AddStream` ou `UpdateStream`.

### Envelope de telemetria

```json
{
  "event_id": "uuid-v4",
  "device_id": "uuid",
  "template_id": "uuid",
  "tenant_id": "uuid",
  "schema_version": 1,
  "topic": "gateway.data/<device_uuid>",
  "timestamp": "2026-04-24T12:00:00Z",
  "payload": { "temperatura": 25.4, "umidade": 68.2 },
  "metadata": { "source": "emqx" }
}
```

Construído por `buildTelemetryEnvelope` em
[gateway-emqx/internal/config/emqx/config_emqx.go](gateway-emqx/internal/config/emqx/config_emqx.go).
Resolve `device_id`/`template_id`/`tenant_id` por (1) payload do dispositivo,
(2) lookup no Redis (`device:{id}`, `topic:{mqtt_topic}`), (3) sufixo do
tópico como fallback.

### Envelope de comando

```json
{
  "event_id": "uuid",
  "action_id": "uuid",
  "actuator_id": "uuid",
  "device_id": "uuid",
  "command_topic": "gateway.cmd/<actuator>",
  "payload": { /* template interpolado */ },
  "timestamp": "..."
}
```

---

## 6. Serviços Go

### 6.1 auth-api

**Porta**: 3000
**Path**: [auth/](auth/)
**Entry**: `auth/api/main.go`
**Stack**: Gin + GORM + PostgreSQL + Redis. **Não usa NATS**.

#### Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/register-user` | público | Cria tenant + user |
| POST | `/auth/user/login` | público | `{email, password}` → `{token, refresh_token}` |
| POST | `/auth/check-username` | público | `{username}` → boolean |
| POST | `/auth/refresh` | público (com refresh) | Rotação de access+refresh |
| GET | `/auth/verify-token` | middleware Verify | 200 se token válido |
| GET | `/auth/find-user` | middleware Auth | Perfil do usuário logado |
| PUT | `/auth/update-user` | middleware Auth | Atualiza name/email |

**Middleware por rota** (F-37): cada rota declara `middleware.Auth()` no
segundo argumento ao registrar; `route.Use(...)` no grupo foi removido pois
poluía rotas posteriores.

#### JWT (RS256)

- Chaves em `/auth/certs/{private,public}_key.pem`, **geradas no Dockerfile**
  via OpenSSL no primeiro start. Volume `certs-data` é compartilhado com
  device-manager, gateway-emqx, data-management e rule-engine (read-only).
- Claims:
  ```json
  {
    "data": { "user_id": "uuid", "tenant_id": "uuid" },
    "typ": "access" | "refresh",
    "jti": "<random hex 16 bytes>",
    "exp": <ts>,
    "iat": <ts>,
    "iss": "data_numbers",
    "nbf": <ts>
  }
  ```
- Access TTL: 24h. Refresh TTL: 30 dias.
- `jti` aleatório (F-38) garante que tokens emitidos no mesmo segundo são
  distintos — necessário pra rotação de refresh funcionar.
- Validação dispara erros sem `panic` (F-10): keys carregadas uma vez por
  processo via `sync.Once`.

#### Redis

- Chave `<user_id>` → access token (TTL 24h, F-01).
- Chave `refresh:<user_id>` → refresh token (TTL 30 dias).
- `POST /auth/refresh` valida: (1) JWT bate e é typ=refresh; (2) refresh no
  Redis é exatamente o enviado (revogação por substituição).

#### CORS

`CORS_ALLOWED_ORIGINS` env var (F-07) lista explícita; `AllowCredentials:
true` exige Origin específica (não pode ser `*`).

---

### 6.2 device-manager

**Porta**: 3001
**Path**: [device-manager/](device-manager/)
**Entry**: `device-manager/cmd/api/main.go` (~700 linhas monolíticas)
**Stack**: `database/sql` + pgx + nats.go + Redis + JWT v5.

#### Endpoints (todos tenant-scoped via JWT)

| Método | Rota |
|---|---|
| POST | `/templates` |
| GET | `/templates` |
| GET | `/templates/{id}` |
| PUT | `/templates/{id}` |
| DELETE | `/templates/{id}` |
| POST | `/devices` |
| GET | `/devices` |
| GET | `/devices/{id}` |
| PUT | `/devices/{id}` |
| DELETE | `/devices/{id}` |
| POST | `/devices/{id}/actuators` |
| GET | `/devices/{id}/actuators` |
| PUT | `/actuators/{id}` |
| DELETE | `/actuators/{id}` |

#### Comportamentos importantes

- **mqtt_topic gerado pelo servidor** (F-27): mesmo que o cliente mande
  `mqtt_topic` no body, é ignorado (`DisallowUnknownFields` → 400) e o
  backend deriva `gateway.data/<device_id>`.
- **UUIDs gerados pelo DB** (F-32): SQL usa `gen_random_uuid()`, não geração
  manual no Go.
- **Eventos NATS** (F-25): publica `template.created/updated/deleted` e
  `device.created/updated/deleted` em cada CRUD. Atuadores ainda não emitem
  eventos.
- **Redis cache** (F-21, F-22):
  - `device:<id>` → `{tenant_id, template_id}` para enriquecimento no
    gateway-emqx, TTL 30 dias.
  - `topic:<mqtt_topic>` → `device_id` para resolução reversa.
  - Reescrito em UPDATE, removido em DELETE.
  - Hidratado no boot via `syncDevicesToRedis`.

---

### 6.3 gateway-emqx

**Porta HTTP**: 3002
**Porta gRPC** (EMQX ExHook): 5051
**Path**: [gateway-emqx/](gateway-emqx/)
**Entry**: `gateway-emqx/cmd/main.go`
**Stack**: Gin + pgxpool + Paho MQTT + nats.go + Uber Dig (DI) + grpc.
Arquitetura hexagonal (`internal/app`, `internal/domain`, `internal/infra`,
`internal/interfaces`).

#### Funções

1. **Bridge MQTT → NATS** (caminho principal):
   - Cliente Paho conecta no EMQX como `gateway-<random>` (username:
     `gateway`).
   - Subscribe em `gateway.data/#`.
   - Cada mensagem: `buildTelemetryEnvelope()` → publica em
     `iot.telemetry.received`.
   - Usa **JetStream** primeiro (timeout 5s); em falha, fallback para
     core publish (mensagem ainda capturada pelo stream).
2. **NATS → MQTT** (caminho reverso):
   - Consumer NATS em `iot.command.send`.
   - Para cada msg: `mqtt.Publish(command_topic, payload)`.
3. **EMQX ExHook gRPC** (porta 5051):
   - Implementa `HookProvider`: `OnClientConnected`, `OnClientDisconnected`,
     `OnMessagePublish`, `OnMessageDelivered`, `OnMessageDropped`,
     `OnMessageAcked`.
   - On Connected/Disconnected → UPDATE `device_manager.devices.device_status`.
   - On MessagePublish → valida envelope + log em `gateway.historys`.
   - Retorna `STOP_AND_RETURN` para não estourar timeout do EMQX.
   - **Requer EMQX configurado com `EXHOOK__SERVERS=gateway:5051`** —
     atualmente NÃO está, então history fica vazio (não bloqueante).
4. **HTTP API**:
   - `POST /api/create-acl` → INSERT em `gateway.acls`.
   - `GET /api/historys` → list dos últimos 200 eventos.
   - `GET /api/stream` → upgrade WebSocket, broadcast NATS
     `iot.telemetry.received` para clientes web.
5. **WebSocket**:
   - `CheckOrigin` valida contra `WS_ALLOWED_ORIGINS` (F-06).
   - Autentica via `?token=<JWT>` query param (sem token = 401).

#### Pontos arquiteturais

- **DI com Uber Dig**: container monta tudo em `BuildContainer()` no
  `di_config.go`. Permite trocar adapters (ex.: NATS por Kafka) sem mexer
  no código de aplicação.
- **NatsConnect compartilhado** (F-34): bug recente onde producer e consumer
  compartilhavam um campo `topic` foi corrigido — agora cada chamada
  publica/subscreve com `subject` explícito do argumento, sem mutar estado
  compartilhado.

---

### 6.4 data-management

**Porta**: 3003
**Path**: [data-management/](data-management/)
**Entry**: `data-management/cmd/worker/main.go` (~400 linhas)
**Stack**: `database/sql` + pgx + nats.go + JWT.

#### Funções

1. **Consumer JetStream** (F-15):
   - Stream `IOT_TELEMETRY`, durable `data-management-worker`.
   - `AckPolicy: Explicit`, `AckWait: 30s`, `MaxDeliver: 5`.
   - Mensagem inválida (JSON, UUID etc.) → log + `NakWithDelay(2s)`.
   - Após 5 tentativas: publica em `iot.telemetry.dlq` + `Ack`.
2. **Persistência**:
   - INSERT em `data_management.devices_data` com `NULLIF($n,'')::uuid`
     para tratar UUIDs vazios como NULL.
   - `payload` e `metadata` cast explícito para `jsonb`.
   - `template_id` ausente é resolvido via lookup no
     `device_manager.devices` por `device_id` ou `mqtt_topic`.
3. **API HTTP de leitura** (F-13):
   - `GET /healthz`
   - `GET /devices/{id}/data?from=&to=&limit=` (auth JWT, tenant scope)
   - `GET /devices/{id}/aggregations?field=&bucket=&from=&to=` usa
     `time_bucket()` do TimescaleDB para retornar `avg/min/max/samples`.

---

### 6.5 rule-engine

**Porta**: 3004
**Path**: [rule-engine/](rule-engine/)
**Entry**: `rule-engine/cmd/api/main.go` (~700 linhas)
**Stack**: pgx + nats.go + JWT + `Knetic/govaluate`.

#### Endpoints

| Método | Rota |
|---|---|
| POST | `/rules` |
| GET | `/rules` (filter opcional `?scenario_id=`) |
| GET | `/rules/{id}` |
| PUT | `/rules/{id}` (inclui toggle `is_active`) |
| DELETE | `/rules/{id}` |
| POST | `/rules/{id}/actions` |
| GET | `/rules/{id}/actions` |
| DELETE | `/rules/{id}/actions/{actionId}` |
| POST | `/scenarios` |
| GET | `/scenarios` |
| PUT | `/scenarios/{id}` |
| DELETE | `/scenarios/{id}` |
| POST | `/scenarios/{id}/devices` |
| GET | `/scenarios/{id}/devices` |
| DELETE | `/scenarios/{id}/devices/{deviceId}` |

#### Motor de regras

- **Validação na criação** (F-23): `govaluate.NewEvaluableExpression(input.trigger_condition)`
  retorna 400 se a sintaxe for inválida.
- **Tenant scoping** (F-09): `createAction` valida que rule e actuator
  pertencem ao mesmo tenant via JOIN com `device_manager.devices`.
  `triggerActions` (executor) também filtra por tenant em runtime.
- **Worker JetStream** (F-16): `QueueSubscribe` em `iot.telemetry.received`
  com queue group `rule-engine-group` (load balancing horizontal).
- **Interpolação de payload_template** (F-14): regex
  `\$\{([a-zA-Z_][a-zA-Z0-9_.]*)\}` resolve paths como
  `${payload.temperatura}` ou `${telemetry.device_id}`. Path não encontrado
  preserva o literal (operador vê o problema).
- **Publicação do comando**: monta envelope com `event_id`, `action_id`,
  `actuator_id`, `device_id`, `command_topic`, `payload` (interpolado),
  `timestamp`. Publica em `iot.command.send` (core NATS).

#### Ciclo de vida

```
NATS msg → unmarshal → tenant_id obrigatório
                       ↓
                       SELECT rules WHERE tenant_id=? AND is_active=true
                       ↓
                       for each rule:
                         govaluate.Evaluate(condition, payload as variables)
                         if true:
                           SELECT rule_actions ⋈ actuators ⋈ devices
                                  WHERE rule_id=? AND devices.tenant_id=rule.tenant_id
                           for each action:
                             rendered := renderPayloadTemplate(template, telemetry)
                             nats.Publish("iot.command.send", { ..., payload: rendered })
                       ↓
                       msg.Ack()
```

---

## 7. Frontend (datanumbers-iot-web)

**Path**: [datanumbers-iot-web/](datanumbers-iot-web/)
**Porta**: 3030 (container Docker), 3000 (vite dev local)
**Stack**: Vite 6 + React 19 + TypeScript strict + TanStack Router +
TanStack Query + Tailwind 3.

### Estrutura

```
datanumbers-iot-web/
├── index.html
├── Dockerfile               # multi-stage: node build → nginx serve
├── nginx.conf               # SPA fallback + cache de assets hashados
├── vite.config.ts           # plugin TanStack Router + paths @/*
├── tsr.config.json          # config do CLI tsr (gera routeTree.gen.ts)
├── tsconfig.json            # strict + alias @/*
├── tailwind.config.ts       # cores vinculadas a CSS custom properties
└── src/
    ├── main.tsx             # bootstrap: Theme → Query → Toast → Router
    ├── api/
    │   ├── types.ts         # tipos batendo com response shape do backend
    │   ├── queries.ts       # query keys + queryOptions centralizados
    │   └── services/
    │       ├── auth.ts      # login, register, me, updateProfile
    │       ├── templates.ts # CRUD
    │       ├── devices.ts   # devices + actuators
    │       ├── rules.ts     # rules, actions, scenarios
    │       ├── telemetry.ts # data + aggregations
    │       └── gateway.ts   # ACL + historys
    ├── components/
    │   ├── Icon.tsx         # 60+ ícones inline (lucide-style)
    │   ├── Stat.tsx, KV.tsx, HealthCard.tsx, PageHeader.tsx, etc.
    │   ├── charts/
    │   │   ├── Sparkline.tsx
    │   │   ├── LiveChart.tsx
    │   │   └── Indicators.tsx  # SignalBars, BatteryBar
    │   ├── forms/
    │   │   ├── TemplateForm.tsx
    │   │   ├── DeviceForm.tsx
    │   │   └── ActuatorForm.tsx
    │   └── ui/
    │       ├── Button, Card, Input, Select, Textarea, Label, Hint, Kbd, Avatar
    │       ├── Pill, Dot, Toggle, Tabs, Table
    │       ├── Toast (com useToast + errorMessage)
    │       ├── Dialog, ConfirmDialog, Skeleton, States (Loading, Error)
    ├── layout/
    │   ├── Sidebar.tsx       # nav vertical + tema + logout
    │   ├── Topbar.tsx        # breadcrumbs + search + bell
    │   └── Shell.tsx
    ├── lib/
    │   ├── api.ts            # axios + interceptor refresh-on-401
    │   ├── auth.ts           # localStorage + decodeToken + isTokenExpired
    │   ├── theme.tsx         # ThemeProvider (light default)
    │   ├── query.ts          # QueryClient singleton
    │   ├── ws.ts             # useTelemetryStream (reconnect exp)
    │   └── cn.ts             # clsx + tailwind-merge
    ├── routes/               # file-based — gera routeTree.gen.ts
    │   ├── __root.tsx
    │   ├── _app.tsx          # layout autenticado + beforeLoad guard
    │   ├── _app.index.tsx           → /
    │   ├── _app.devices.index.tsx   → /devices
    │   ├── _app.devices.$id.tsx     → /devices/:id (5 tabs)
    │   ├── _app.templates.tsx       → /templates
    │   ├── _app.spaces.index.tsx    → /spaces
    │   ├── _app.spaces.$id.tsx      → /spaces/:id
    │   ├── _app.rules.index.tsx     → /rules
    │   ├── _app.rules.$id.tsx       → /rules/:id (e /rules/new)
    │   ├── _app.activity.tsx        → /activity
    │   ├── _app.settings.tsx        → /settings
    │   ├── sign-in.tsx              # form único centralizado
    │   ├── sign-up.tsx              # form único centralizado
    │   └── onboarding.tsx           # wizard 5 passos
    └── styles/globals.css     # CSS custom properties (tokens light/dark)
```

### Sistema de tokens (light/dark)

`src/styles/globals.css` define `:root { --bg, --fg, --accent, ... }` para
light; `[data-theme="dark"]` redefine os mesmos. Tailwind aponta utilitários
(`bg-bg`, `text-fg`, etc.) para essas variáveis — mudar paleta sem rebuild.

Default **light** (sem auto-detect de `prefers-color-scheme`); o usuário
escolhe via toggle na sidebar/settings e a escolha persiste em
`localStorage`.

### Roteamento (TanStack Router file-based)

- `_app.tsx` é layout aninhado: `beforeLoad` redireciona pra `/sign-in` se
  não há token ou está expirado.
- Rotas dentro de `_app/*` herdam a sidebar.
- Rotas top-level (`sign-in`, `sign-up`, `onboarding`) ficam fora do shell.
- `routeTree.gen.ts` é gerado por `tsr generate` no `prebuild` —
  está no `.gitignore`.

### TanStack Query

- `queryClient` em `lib/query.ts`: `staleTime: 30s`,
  `refetchOnWindowFocus: false`, `retry: 1`.
- Query keys centralizados em `api/queries.ts` (`qk.devices()`, `qk.rule(id)`,
  etc.) — mutations invalidam por esses keys, nunca strings soltas.

### Autenticação

- `lib/auth.ts`: tokens em `localStorage` (key `datanumbers.token` e
  `datanumbers.refresh`).
- `lib/api.ts`: axios instance com interceptor
  - Request: injeta `Authorization: Bearer <access>`.
  - Response: 401 com retry flag `__retry` → chama `POST /api/auth/refresh`
    com `refresh_token` → re-emite request original com novo access.
  - `refreshInFlight` deduplica chamadas concorrentes ao endpoint de
    refresh.
- Sign-up faz **register → login** encadeados (backend não emite token no
  register).

### WebSocket

`useTelemetryStream` em `lib/ws.ts`:
- URL: `VITE_WS_URL` (default `ws://localhost:8080/api/stream`).
- Anexa `?token=<access>` automaticamente.
- Reconnect exponencial (500ms × 2^retries, max 30s, até 8 tentativas).
- Cleanup no unmount.

### Build / Docker

```
Stage 1: node:22-alpine builder
  npm install (com cache mount)
  tsr generate && tsc --noEmit && vite build  → dist/

Stage 2: nginx:alpine
  COPY dist /usr/share/nginx/html
  COPY nginx.conf (SPA fallback + cache de /assets/)
  HEALTHCHECK wget -qO- http://127.0.0.1/healthz
```

**`localhost` no healthcheck causava IPv6** com nginx só ouvindo IPv4 →
forçar `127.0.0.1` (descoberto durante deploy).

---

## 8. Infraestrutura compartilhada

### nginx (API gateway, :8080)

[infra/nginx/nginx.conf](infra/nginx/nginx.conf)

```
/api/auth/user/(.*) → http://auth-api:3000/auth/$1  (rewrite)
/api/auth/(.*)      → http://auth-api:3000/auth/$1  (rewrite)
/api/devices/       → http://device-manager:3001/
/api/gateway/       → http://gateway-emqx:3002/api/   (preserva prefix /api)
/api/stream         → http://gateway-emqx:3002/api/stream  (WS upgrade)
/api/data/          → http://data-management:3003/
/api/rules/         → http://rule-engine:3004/
/health             → 200 'OK'
```

CORS por whitelist (não `*`):
```
map $http_origin $cors_origin {
  default "";
  "http://localhost:3030"  "http://localhost:3030";
  "http://localhost:8080"  "http://localhost:8080";
  "http://127.0.0.1:3030"  "http://127.0.0.1:3030";
}
```

Headers: `Access-Control-Allow-Origin $cors_origin`,
`Access-Control-Allow-Credentials true`, `Vary Origin`. Backends adicionais
escondem seus próprios headers CORS (`proxy_hide_header`) pra evitar
duplicidade.

### Postgres init

[infra/postgres/init/001-schemas.sql](infra/postgres/init/001-schemas.sql)
é montado em `/docker-entrypoint-initdb.d` — roda **apenas na primeira
inicialização** (volume vazio). Para resetar: `docker compose down -v`.

### EMQX

Anonymous habilitado (`EMQX_ALLOW_ANONYMOUS=true`) e autorização permissiva
(`EMQX_AUTHORIZATION__NO_MATCH=allow`) — adequado pra dev. Em produção
configurar autenticação MQTT (username/password ou JWT) e ACL.

ExHook gRPC **não está habilitado por env**: o gateway-emqx expõe :5051
mas o broker não chama. Logging de mensagens em `gateway.historys` fica vazio.

### NATS

JetStream habilitado (`-js -sd /data`), monitor :8222. Stream
`IOT_TELEMETRY` é criado em runtime pelos consumers.

### Redis

Sem senha em dev. Auth-api guarda tokens. Device-manager guarda cache de
device metadata.

---

## 9. Fluxos end-to-end

### 9.1 Telemetria (dispositivo → banco)

```
1. Device publica MQTT em gateway.data/<device_id>
   payload: { "payload": { "temperatura": 25.4 } }
       │
       ▼
2. EMQX recebe (anonymous allow).
       │
       ▼
3. gateway-emqx (Paho subscriber em gateway.data/#):
   - buildTelemetryEnvelope:
     a. extract device_id do payload OU Redis topic:<topic> OU sufixo
     b. extract template_id/tenant_id do payload OU Redis device:<id>
     c. validate UUID format; fallback para zero UUID
     d. mount envelope: event_id (random), schema_version, timestamp,
        payload, metadata
   - js.Publish("iot.telemetry.received", envelope) com timeout 5s
   - se JS falhar: fallback core nats.Publish (ainda capturado pelo stream)
       │
       ├──→ data-management consumer:
       │      - JS QueueSubscribe (durable)
       │      - persistTelemetry: parse, resolveTemplateID se vazio,
       │        INSERT em devices_data com NULLIF cast
       │      - ack OU nak com retry; após 5 fails → DLQ
       │
       ├──→ rule-engine consumer:
       │      - JS QueueSubscribe (group balanceia entre instâncias)
       │      - evaluateRules(tenant_id, telemetry):
       │        - SELECT rules ativas do tenant
       │        - govaluate.Evaluate(trigger_condition, payload)
       │        - se true → triggerActions
       │
       └──→ gateway-emqx StreamService:
              - core NATS subscribe em iot.telemetry.received
              - broadcast WebSocket para clientes web conectados
                em /api/stream
```

### 9.2 Comando (regra → MQTT)

```
1. rule-engine.triggerActions(ruleID, telemetry):
   - SELECT JOIN rule_actions ⋈ actuators ⋈ devices ⋈ rules
            WHERE rule_id=? AND devices.tenant_id=rules.tenant_id
   - para cada action:
     - rendered := renderPayloadTemplate(payload_template, telemetry)
       (substitui ${payload.x} por valores reais)
     - command := { event_id, action_id, actuator_id, device_id,
                    command_topic, payload: rendered, timestamp }
     - nats.Publish("iot.command.send", command)
       │
       ▼
2. gateway-emqx consumer:
   - core NATS subscribe em iot.command.send
   - parse, extract command_topic
   - client.Publish(command_topic, payload_json)
       │
       ▼
3. EMQX entrega via MQTT subscribers
   - Dispositivo recebe em gateway.cmd/<actuator>
   - Executa ação física
```

### 9.3 Autenticação

```
Sign-up:
  Browser → POST /api/auth/register-user → auth-api:
    - GORM INSERT tenant + user (bcrypt)
  Browser → POST /api/auth/user/login → auth-api:
    - GORM SELECT user por email
    - bcrypt CompareHashAndPassword
    - JWT.GenerateToken (RS256, claims.typ=access, exp 24h, jti random)
    - JWT.GenerateRefreshToken (typ=refresh, exp 30d)
    - Redis SET <user_id>=access TTL 24h
    - Redis SET refresh:<user_id>=refresh TTL 30d
    - Response: { token, refresh_token }
  Browser: setTokens(access, refresh) em localStorage

Request autenticado:
  Browser → axios interceptor injeta Authorization: Bearer <access>
  ← se 401 e refresh existe:
    Browser → POST /api/auth/refresh com { refresh_token }
    auth-api:
      - JWT.ValidateRefreshToken (verifica typ=refresh)
      - Redis GET refresh:<user_id> == enviado?  (revogação)
      - JWT.GenerateToken (novo access)
      - JWT.GenerateRefreshToken (novo refresh)  ← rotação
      - Redis SET ambos
      - Response: { token, refresh_token }
    Browser: setTokens; reemite request original com novo access

Logout:
  Browser: clearTokens(); queryClient.clear(); navigate('/sign-in')
```

---

## 10. Autenticação e multi-tenancy

### Modelo de tenants

- Cada user pertence a **um** tenant (FK strict).
- Tenant é criado no register (`company_name` do form).
- Todos os recursos (devices, templates, rules, scenarios, actuators) são
  scoped por `tenant_id`.
- Atuadores herdam tenant via JOIN com `devices`.

### Como o tenant é propagado

1. JWT carrega `claims.data.{user_id, tenant_id}`.
2. Cada serviço (device-manager, rule-engine, data-management) tem
   `authMiddleware` que injeta `userID` e `tenantID` em `context.Context`.
3. SQLs incluem `WHERE tenant_id = $1` em toda query.
4. Em JOINs cruzados (ex.: rule-engine criando action em atuador):
   `WHERE rules.tenant_id = devices.tenant_id` (F-09).

### Isolamento validado

| Cenário | Resultado |
|---|---|
| Eve faz GET no device do Alice | 404 (não 403; "não existe pra você") |
| Eve cria rule + tenta vincular ao atuador do Alice | 404 (F-09 bloqueia) |
| Eve faz GET na telemetria do device do Alice | data: [] (filtro silencioso) |
| Eve faz GET /scenarios | só os próprios |

---

## 11. Como rodar

### Pré-requisitos

- Docker 24+ com Compose v2
- Portas livres: 1883, 3000–3004, 3030, 3131, 4222, 5051, 5432, 6380, 8080,
  8083, 8084, 8222, 8883, 18083
- Em Mac Apple Silicon, a imagem `klinux/nats-ui` é emulada via
  `platform: linux/amd64` (configurado no compose)

### Stack inteira

```bash
docker compose up -d
```

Tempos típicos:
- 1ª vez: ~3-5 min (pull + build de 5 imagens Go + 1 imagem Vite/nginx)
- subsequentes: ~10s (cache)

A ordem de inicialização é controlada por `depends_on: condition:
service_healthy`. Auth-api precisa ficar healthy antes de device-manager,
gateway-emqx, data-management e rule-engine subirem — pois compartilham
o volume `certs-data` com a chave pública JWT.

### Frontend em dev (sem Docker)

```bash
cd datanumbers-iot-web
npm install
npm run dev          # http://localhost:3000 (porta livre) ou usa PORT do env
```

`VITE_API_URL` aponta pro nginx do compose (default
`http://localhost:8080`).

### Smoke test E2E

```bash
# 1. Cria usuário
curl -s -X POST http://localhost:8080/api/auth/register-user \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","username":"alice","email":"alice@example.com",
       "password":"123456","company_name":"Acme"}'

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/user/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"123456"}' \
  | jq -r .data.token)

# 3. Cria template e device
TPL=$(curl -s -X POST http://localhost:8080/api/devices/templates \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"DHT11","fields":[{"name":"temperatura","type":"float","required":true}]}' \
  | jq -r .template_id)

DEV=$(curl -s -X POST http://localhost:8080/api/devices/devices \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"device_name\":\"Sala 1\",\"template_id\":\"$TPL\"}" \
  | jq -r .device_id)

# 4. Publica telemetria via MQTT
docker run --rm --network sweet-snyder-7fdd80_data-numbers-network \
  eclipse-mosquitto:2 mosquitto_pub -h emqx -p 1883 \
  -t "gateway.data/$DEV" -m '{"payload":{"temperatura":25.4}}' -q 0

# 5. Verifica persistência
docker exec datanumbers-postgres psql -U numbers -d data_numbers_iot \
  -c "SELECT time, payload FROM data_management.devices_data \
      WHERE device_id::text='$DEV' ORDER BY time DESC LIMIT 1;"
```

### Reset completo

```bash
docker compose down -v          # remove volumes (postgres, nats, certs)
docker compose up -d --build
```

---

## 12. Portas, URLs e variáveis de ambiente

### URLs locais

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3030 |
| API gateway (nginx) | http://localhost:8080 |
| Auth-api direto | http://localhost:3000 |
| Device-manager direto | http://localhost:3001 |
| Gateway-emqx HTTP | http://localhost:3002 |
| Data-management | http://localhost:3003 |
| Rule-engine | http://localhost:3004 |
| EMQX dashboard | http://localhost:18083 (admin/public) |
| NATS UI | http://localhost:3131 (admin/admin123) |
| NATS monitor | http://localhost:8222 |
| Postgres | localhost:5432 (numbers/numbers / data_numbers_iot) |
| Redis | localhost:6380 |

### Variáveis de ambiente

[.env.example](.env.example) lista todas. Principais:

| Variável | Default | Onde |
|---|---|---|
| `POSTGRES_USER` | numbers | postgres + DNS dos serviços |
| `POSTGRES_PASSWORD` | numbers | idem |
| `POSTGRES_DB` | data_numbers_iot | idem |
| `REDIS_PASSWORD` | (vazio) | auth-api |
| `NATS_UI_ADMIN_USER` | admin | nats-ui |
| `NATS_UI_ADMIN_PASS` | admin123 | nats-ui |
| `AUTH_API_PORT` | 3000 | host port |
| `DEVICE_MANAGER_PORT` | 3001 | host port |
| `GATEWAY_HTTP_PORT` | 3002 | host port |
| `DATA_MANAGEMENT_PORT` | 3003 | host port |
| `RULE_ENGINE_PORT` | 3004 | host port |
| `GATEWAY_GRPC_PORT` | 5051 | host port |
| `API_GATEWAY_PORT` | 8080 | nginx |
| `WEB_PORT` | 3030 | frontend |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3030,http://localhost:8080` | auth-api Gin CORS |
| `WS_ALLOWED_ORIGINS` | `http://localhost:3030,http://localhost:8080` | gateway-emqx WS CheckOrigin |
| `JWT_PRIVATE_KEY_PATH` | `/auth/certs/private_key.pem` | auth-api |
| `JWT_PUBLIC_KEY_PATH` | `/app/certs/public_key.pem` | demais serviços (read-only) |
| `NATS_URL` | `nats://nats:4222` | todos os clientes NATS |
| `NATS_TELEMETRY_SUBJECT` | `iot.telemetry.received` | data-management, rule-engine |
| `DB_DNS` / `DATABASE_URL` | postgres://... | conexão SQL |
| `VITE_API_URL` | `http://localhost:8080` | frontend axios baseURL |
| `VITE_WS_URL` | `ws://localhost:8080/api/stream` | frontend useTelemetryStream |

---

## 13. Decisões técnicas

### Por que JetStream e não Kafka

NATS + JetStream entrega persistência + replay + DLQ com footprint
muito menor (1 container vs Kafka+ZK/KRaft+Schema Registry) e latência
sub-ms. Os volumes esperados (telemetria IoT de pequena/média escala)
não justificam Kafka. Se a frota crescer pra dezenas de milhões de
mensagens/dia, migrar é trivial (substituir adapter no gateway-emqx).

### Por que banco único com schemas

Multi-tenancy em SaaS de pequeno porte. Schemas isolam domínios
logicamente sem o overhead operacional de N bancos. O JOIN entre
`automation.rules` e `device_manager.actuators` (linhagem cruzada) seria
muito mais caro com bancos separados. TimescaleDB hypertable continua
funcionando normalmente.

### Por que monolitos em main.go

Decisão pragmática: device-manager, data-management e rule-engine têm
escopo bem contido e cabem em ~500-700 linhas. Manter em arquivo único
acelera revisão e evita dispersão prematura. Quando crescerem além
disso, separar em packages internos. Gateway-emqx, que é mais
complexo, **já tem** arquitetura hexagonal.

### Por que TanStack Router e não React Router

Type-safety nos `to`, `params`, `search`, geração automática de tree de
rotas via plugin Vite e devtools próprias. O custo de geração extra
(~50ms no build) compensa em manutenibilidade — um path errado falha
no `tsc` em vez de em runtime.

### Por que sem state manager global

TanStack Query cobre cache de servidor; URL state (router) cobre filtros
e seleções; React `useState` cobre o resto. Zustand/Redux seriam
overkill nesse escopo.

### Por que SVG inline para charts

Sparkline e LiveChart são triviais (lista de pontos → path SVG). Importar
Recharts ou similar (~150kb) só para isso é desperdício. Quando precisar
de eixos/tooltips/legends ricos, considerar.

---

## 14. Pendências e roadmap

### Pendências conhecidas (P2 / débitos)

| ID | Descrição | Impacto |
|---|---|---|
| F-19 | Migrations duplicadas (gateway-emqx tinha pasta `migrations/` paralela ao init global). Já consolidado: pasta apagada. | resolvido |
| F-21 | Redis `topic:{mqtt_topic}` agora populado pelo device-manager. | resolvido |
| F-29 | Adotar TanStack Query 100% (já está, mas falta padrão de mutations otimistas). | qualidade |
| F-33 | UI unificada (sem Bootstrap residual). Frontend foi reescrito do zero — não tem mais Bootstrap. | resolvido |

### Lacunas funcionais

1. **Trigger manual de atuador**: backend não expõe `POST /actuators/{id}/trigger`.
   Hoje só dispara via regra. Ver §6.2 e §9.2.
2. **Audit log de execução de regras**: não existe tabela registrando
   "rule X disparou às T com payload P". Apenas log de stdout do
   rule-engine.
3. **EMQX ExHook**: gateway-emqx expõe gRPC :5051 mas EMQX não está
   configurado pra chamar. Resultado: `gateway.historys` fica vazio.
4. **Validação `payload_template` ⊂ `payload_schema`**: o backend salva
   ambos mas não compara.
5. **Hysteresis em regras**: se a telemetria oscilar perto do threshold,
   uma regra pode disparar dezenas de vezes em segundos. Sem debounce.
6. **Atuador "abstrato"**: hoje atuador exige `device_id` (FK NOT NULL).
   Não dá pra ter "enviar email" sem device físico.
7. **Refresh do frontend bloqueia em 401 quando o backend está offline**:
   o interceptor tenta refresh, falha, e a request original cai.
   Comportamento aceitável mas a UI poderia mostrar banner "API offline".

### Roadmap sugerido

| Prioridade | Item |
|---|---|
| Alto | `POST /actuators/{id}/trigger` + botão "Testar" na UI |
| Alto | Tabela `automation.rule_action_executions` + audit no rule-engine |
| Médio | EMQX configurado com ExHook → popular `gateway.historys` |
| Médio | Validação `payload_template` ⊂ `payload_schema` na criação |
| Médio | Hysteresis configurável por regra |
| Baixo | Suporte a atuador sem device físico (email, webhook) |
| Baixo | Code splitting do frontend (chunks por rota) — está em 510kb single bundle |

---

## 15. Apêndice: estrutura de diretórios

```
.
├── ARCHITECTURE.md             (este documento)
├── AGENTS.md / CLAUDE.md / GEMINI.md  (bootstrap p/ assistentes IA)
├── README.md                   (visão geral curta)
├── go.work                     (workspace Go com 5 módulos)
├── docker-compose.yaml         (12 containers)
├── Dockerfile                  (auth-api)
├── .env.example
│
├── auth/                       SERVIÇO 1 — auth-api
│   ├── api/main.go             entry point + rotas + CORS
│   ├── api/routes/             registradores de rotas (login, register, etc.)
│   ├── internal/
│   │   ├── controllers/        service layer por domínio
│   │   ├── handlers/           HTTP handlers
│   │   ├── middleware/auth.go  middleware JWT
│   │   ├── models/             GORM models (User, Tenant)
│   │   ├── database/           Postgres + AutoMigrate + Redis config
│   └── pkg/jwt.go              JWT RS256 com refresh
│
├── device-manager/             SERVIÇO 2 — device-manager
│   └── cmd/api/main.go         monolítico (CRUD templates/devices/actuators)
│
├── gateway-emqx/               SERVIÇO 3 — gateway-emqx
│   ├── cmd/main.go             bootstrap DI
│   ├── cmd/routes/             HTTP routes (ACL, historys)
│   ├── internal/
│   │   ├── app/services/       acls, grpc, historys, stream (WS)
│   │   ├── config/             env, yaml, emqx, dig container
│   │   ├── domain/             dto + entities
│   │   ├── infra/
│   │   │   ├── database/       pgxpool adapter + repositories
│   │   │   ├── messaging/nats/ connect + producer (JS+fallback) + consumer
│   │   │   ├── transport/
│   │   │   │   ├── grpc/       exhook.proto + adapter + validation
│   │   │   │   ├── http/       gin adapter + group/context wrappers
│   │   │   │   └── mqtt/       paho adapter
│   │   └── interfaces/         ports hexagonais
│
├── data-management/            SERVIÇO 4 — data-management
│   └── cmd/worker/main.go      monolítico (JS consumer + read API)
│
├── rule-engine/                SERVIÇO 5 — rule-engine
│   └── cmd/api/main.go         monolítico (CRUD + evaluator)
│
├── datanumbers-iot-web/        FRONTEND
│   ├── src/...                 (ver §7)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.ts
│   └── package.json
│
├── infra/
│   ├── nginx/nginx.conf        API gateway (proxy + CORS + WS upgrade)
│   └── postgres/init/001-schemas.sql   DDL completo
│
├── contracts/nats/             JSON schemas dos envelopes
│   ├── README.md
│   ├── device.event.schema.json
│   ├── iot.command.send.schema.json
│   ├── iot.telemetry.received.schema.json
│   └── template.event.schema.json
│
├── arduino/sensor_temperatura/ FIRMWARE de exemplo
│   ├── sensor_temperatura.ino
│   └── secrets.example.h
│
└── scripts/                    UTILITÁRIOS DE BANCADA (não compilam no projeto)
    ├── test_nats.go            publica msg sintética em iot.telemetry.received
    ├── test_ws.go              cliente WS
    └── README.md
```

---

*Última atualização: maio 2026. Para feedback ou correções, abrir issue
ou PR no repositório.*
