# Roteiro de Apresentação — DataNumbers IoT

Objetivo: mostrar a plataforma funcionando do início ao fim — do microsserviço
de **tools/calendar-tool** (calendário), passando pela automação
(**rule-engine**), até o comando chegando no sensor/atuador via MQTT
(**gateway-emqx**) — tudo visível no front-end.

Tudo aqui é real. Nenhuma tela tem dado mockado; os únicos valores
"simulados" são as leituras de sensor, publicadas manualmente via
`mosquitto_pub` porque não há hardware físico plugado na demo (o firmware
real existe em `arduino/sensor_temperatura/sensor_temperatura.ino` e usa o
mesmo caminho MQTT sem trocar nada no resto do sistema).

---

## 1. Arquitetura em uma frase

Monorepo com microsserviços orientados a evento, conectados via **NATS**
(barramento canônico) e **MQTT/EMQX** (sensores/atuadores). Banco único
TimescaleDB com schemas por domínio (`auth`, `gateway`, `device_manager`,
`data_management`, `automation`). Cada serviço é um binário Go independente
(exceto o front, Next.js/Vite React), todos orquestrados via
`docker-compose.yaml`.

Serviços:

| Serviço | Porta (via gateway `:8080`) | Papel |
|---|---|---|
| `auth-api` | `/api/auth/` | Login, registro, tenants, JWT |
| `device-manager` | `/api/devices/` | Devices, templates, atuadores |
| `gateway-emqx` | `/api/gateway/`, `/api/stream` | Ponte MQTT ↔ NATS, WebSocket de telemetria |
| `data-management` | `/api/data/` | Persistência de telemetria (TimescaleDB) |
| `rule-engine` | `/api/rules/` | Motor de automação (regras SE/ENTÃO) |
| `calendar-tool` | `/api/calendar/` | Calendário interno + sync opcional com Google |
| `web` (front) | `localhost:3000` | Interface |

Fluxo central que a demo prova:

```
Front (Calendário) → POST /api/calendar/events
   → calendar-tool grava em automation.calendar_events
   → publica NATS "calendar.event.create"
      → rule-engine avalia automation.rules (mesmo motor que avalia telemetria)
         → se trigger_condition bater, publica NATS "iot.command.send"
            → gateway-emqx converte em publish MQTT no command_topic do atuador
```

E o caminho inverso (sensor → dashboard):

```
Sensor (real ou mosquitto_pub) → MQTT "gateway.data/<device_id>"
   → gateway-emqx enriquece (tenant_id/template_id via Redis) → NATS "iot.telemetry.received"
      → data-management persiste (TimescaleDB)
      → gateway-emqx repassa via WebSocket /api/stream → front atualiza em tempo real
      → rule-engine também escuta esse subject (regras baseadas em sensor, não só calendário)
```

---

## 2. Preparar antes de sair de casa

```bash
cd DataNumbers-IoT
POSTGRES_PORT=5434 docker compose up -d --build
./scripts/seed-demo.sh
```

> `POSTGRES_PORT=5434` só é necessário se a porta 5432 já estiver ocupada por
> outro processo na máquina (confira com `docker compose ps` / `ss -tlnp | grep 5432`).
> Sem conflito, pode rodar `docker compose up -d --build` direto.

O `seed-demo.sh` é **idempotente** — pode rodar quantas vezes quiser antes do
ensaio, sem duplicar nada. Ele:

1. Loga com `demo@datanumbers.io` / `Senha123!`; se o usuário não existir, registra (tenant + user) e loga.
2. Garante que existe: template "Bomba Dagua", device "Bomba Jardim", atuador "Valvula".
3. Garante duas regras de automação já ligadas ao calendário:
   - evento **"Regar plantas"** → liga a válvula (`{"state":"ON"}`)
   - evento **"Reuniao de equipe"** → liga modo reunião (`{"state":"MEETING_MODE"}`)
4. Imprime tudo no final (IDs, credenciais, comando de simulação de sensor pronto pra copiar).

Confirme que subiu tudo:

```bash
docker compose ps
```

Todos os serviços devem estar `Up` (a maioria também `healthy`).

Deixe um terminal aberto com logs ao vivo — é o que mais convence durante a
fala, mostra o backend reagindo em tempo real:

```bash
docker compose logs -f rule-engine gateway-emqx
```

---

## 3. Tour pelas telas (nesta ordem)

### 3.1 Login (`/sign-in`)

`http://localhost:3000` → `demo@datanumbers.io` / `Senha123!`.
Autenticação real via `auth-api`, JWT RSA assinado, usado por todos os outros
serviços (cada um valida com a chave pública compartilhada via volume Docker
`certs-data`).

### 3.2 Início (`/`) — dashboard

Primeira tela pós-login. Mostra:
- Saudação + % de saúde da frota (`online / total` de devices)
- Cards de status por device
- Atividade recente (via `useTelemetryStream`, WebSocket real em `/api/stream`)

**Ponto de atenção**: o campo `device_status` (ONLINE/OFFLINE) não muda
sozinho só por receber telemetria — é um campo separado, atualizado via
`PUT /devices/{id}`. Não é bug, é como o device-manager foi desenhado; não
espere o card virar "ONLINE" automaticamente ao publicar telemetria.

### 3.3 Dispositivos (`/devices`)

Lista de devices do tenant. Ao abrir um (`/devices/:id`):
- Aba de dados: tabela com a telemetria recebida (`event_id`, timestamp, payload)
- Gráficos de agregação (`GET /api/data/devices/:id/aggregations`)
- Lista de atuadores vinculados

É aqui que aparece o resultado de publicar telemetria simulada:

```bash
mosquitto_pub -h localhost -p 1883 \
  -t "gateway.data/<device_id>" \
  -m '{"payload":{"temp":27.4,"umidade":40}}'
```

### 3.4 Spaces (`/spaces`)

"Ambientes lógicos que agrupam dispositivos e suas automações" — é a UI para
`automation.scenarios` (cenários). Um space agrupa N devices; uma regra pode
opcionalmente estar vinculada a um space. Não é o foco central da demo, mas
mostra que a automação pode ser organizada por ambiente físico (ex.: "Sala",
"Jardim", "Estufa").

### 3.5 Atividade (`/activity`)

Stream contínuo cru das mensagens que chegam pelo WebSocket de telemetria —
útil pra mostrar "olha, tá tudo vivo" sem precisar abrir um device específico.

### 3.6 Templates (`/templates`)

"Modelos reutilizáveis que definem o schema dos dados de cada tipo de
hardware" — CRUD de `device_manager.device_templates`. Cada device é
instanciado a partir de um template (ex.: "Bomba Dagua" no seed).

### 3.7 Automações (`/rules`) — o motor

CRUD de `automation.rules` + `automation.rule_actions`. Cada regra tem:
- `trigger_condition`: expressão avaliada com a lib `govaluate` (ex.:
  `summary == 'Regar plantas'`, ou `temp > 30` pra regras baseadas em sensor)
- Ações vinculadas: qual atuador, qual `payload_template` (aceita
  placeholders `${payload.x}` interpolados com o dado que disparou a regra)

**É a mesma engine pros dois casos** — regra disparada por telemetria de
sensor e regra disparada por evento de calendário passam pela função
`evaluateRules` idêntica no `rule-engine`. Vale explicar isso na
apresentação: não são dois motores, é um só, reaproveitado.

### 3.8 Calendário (`/calendar`) — a peça nova, o clímax da demo

Tela dividida: formulário à esquerda (Título, Descrição, Início, Fim, Space
opcional), lista de eventos criados à direita.

Ao clicar **Marcar evento**:
1. `POST /api/calendar/events` no `calendar-tool`
2. Persiste em `automation.calendar_events`
3. Publica `calendar.event.create` no NATS **imediatamente**
4. `rule-engine` avalia todas as `automation.rules` do tenant contra o
   conteúdo do evento (o campo `summary` do evento é o que normalmente entra
   no `trigger_condition`, ex. `summary == 'Regar plantas'` — **sem** prefixo
   `payload.`)
5. Se bater, publica `iot.command.send` → `gateway-emqx` publica MQTT de
   verdade no `command_topic` do atuador

Evento sem regra correspondente → só é avaliado, nada dispara (mostrar isso
prova que o sistema é seletivo, não "dispara tudo").

### 3.9 Configurações (`/settings`)

Cinco abas:
- **Perfil**: editar nome/email
- **Aparência**: tema claro/escuro
- **API & MQTT**: credenciais de broker/WebSocket/API base, útil pra quem for
  programar um device real
- **Integrações**: conectar/desconectar Google Calendar (ver seção 5)
- **Sessão**: logout

---

## 4. Roteiro de fala (passo a passo, com comandos)

**1. Abertura (1-2 min)** — explicar a arquitetura (seção 1), pode abrir
`http://localhost:3131` (NATS UI) só pra mostrar o barramento vivo, opcional.

**2. Login (30s)** — `demo@datanumbers.io` / `Senha123!`.

**3. Mostrar frota (1 min)** — Início → Dispositivos → abrir "Bomba Jardim",
mostrar aba de dados vazia ainda.

**4. Simular sensor reportando (1 min)**:
```bash
mosquitto_pub -h localhost -p 1883 \
  -t "gateway.data/<DEVICE_ID>" \
  -m '{"payload":{"temp":27.4,"umidade":40}}'
```
Voltar no navegador → aba Dados do device (ou Atividade) já mostra o valor.

**5. Mostrar a regra já configurada (1 min)** — Automações → "Regar no
evento" → mostrar `trigger_condition` e a ação vinculada.

**6. O momento principal — marcar evento (2 min)** — Calendário → Título
"Regar plantas" → Marcar evento. Trocar pro terminal com os logs:
```
calendar event <id> evaluated for tenant <id>
Action triggered for rule <id>: Command sent to devices/<id>/cmd
Forwarded command from NATS to MQTT topic: devices/<id>/cmd
```

**7. Fechar o loop visualmente (1 min, opcional)** — simula o sensor
"confirmando":
```bash
mosquitto_pub -h localhost -p 1883 \
  -t "gateway.data/<DEVICE_ID>" \
  -m '{"payload":{"state":"ON","temp":26.9}}'
```

**8. Prova de seletividade (2 min)** — marcar evento com título sem regra
correspondente → nada dispara (só "evaluated" no log). Depois marcar
"Reuniao de equipe" → dispara ação diferente.

**9. (Opcional) Google Calendar** — ver seção 5. Só mostrar se tiver
credencial configurada antes; sem ela, pule.

---

## 5. Integração com Google Calendar (opcional, precisa de configuração prévia)

A plataforma sabe replicar eventos internos pro Google Calendar real do
usuário, mas isso depende de credenciais OAuth que **não vêm prontas** —
precisa configurar no [Google Cloud Console](https://console.cloud.google.com)
antes da apresentação:

1. Criar projeto → ativar **Google Calendar API**
2. Configurar tela de consentimento OAuth (modo teste já serve)
3. Criar credencial OAuth 2.0 → Client ID + Secret
4. **Authorized redirect URI**: `http://localhost:8080/api/calendar/auth/google/callback`
5. Exportar antes de subir o `calendar-tool`:
   ```bash
   export GOOGLE_CLIENT_ID=xxx
   export GOOGLE_CLIENT_SECRET=yyy
   POSTGRES_PORT=5434 docker compose up -d --build calendar-tool
   ```

Na UI: Configurações → Integrações → "Conectar Google Calendar" → consent
screen do Google → volta com toast de sucesso. A partir daí, todo evento
criado em `/calendar` também é criado no Google Calendar real (best-effort —
se falhar, não trava a criação do evento interno, só loga o erro).

Sem credenciais configuradas, o botão existe mas o Google recusa a conexão
(client_id vazio) — o resto do sistema continua funcionando normal.

---

## 6. Se algo travar durante a apresentação

```bash
docker compose ps                          # o que caiu?
docker compose logs <serviço> --tail 50     # ver o erro
docker compose restart <serviço>            # reiniciar um só

# reset completo, se necessário:
docker compose down
POSTGRES_PORT=5434 docker compose up -d --build
./scripts/seed-demo.sh
```

Problema comum neste ambiente: porta 5432 presa por processo `docker-proxy`
órfão de outro projeto. Sintoma: `Ports are not available: ... 5432`. Solução:
usar `POSTGRES_PORT=5434` (ou outra porta livre) em vez de tentar matar
processo de outro projeto.
