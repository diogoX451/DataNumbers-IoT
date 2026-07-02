# Fluxos da Calendar Tool API

## Visão Geral

```
                        ┌─────────────────────────────────┐
                        │         calendar-tool API        │
                        │                                  │
Cliente HTTP ──────────▶│  Handler → Service → Repository │
                        │               │                  │
Google Calendar ───────▶│               ▼                  │
(webhook)               │       Google Calendar API        │
                        │               │                  │
                        │               ▼                  │
                        │        NATS Publisher            │
                        └──────────────┬──────────────────┘
                                       │
                                       ▼
                               NATS Message Broker
```

---

## 1. Criar Evento — `POST /events`

**Request:**
```json
POST /events
Authorization: Bearer <jwt-da-plataforma>
{
  "summary": "Reunião de planejamento",
  "description": "Sprint planning Q3",
  "start": "2026-05-20T10:00:00Z",
  "end": "2026-05-20T11:00:00Z",
  "scenario_id": "21f2f6a1-4d53-4a92-88fd-f0f2806b0c33"
}
```

**Fluxo:**
```
EventHandler.Create()
  │  extrai tenant_id do JWT
  │  valida: summary, start, end obrigatórios
  │  parse start/end RFC3339 → time.Time
  │
  ├─▶ TokenStore.Get(tenant_id)
  │       se houver token, cria o evento no Google Calendar
  │
  ├─▶ INSERT automation.calendar_events
  │       persiste google_event_id quando sincronizado
  │
  └─▶ EventPublisher.PublishCreateEvent(payload)
          publica em: "calendar.event.create"
          payload inclui event_id interno e tenant_id
```

**Response:** `201 Created`
```json
{
  "event_id": "0cf1a383-0ec8-43ea-af55-6d71856af2b9",
  "google_event_id": "abc123xyz",
  "synced_to_google": true,
  "summary": "Reunião de planejamento",
  "start": "2026-05-20T10:00:00Z",
  "end": "2026-05-20T11:00:00Z",
  "created_at": "2026-05-20T09:58:00Z"
}
```

**NATS subject:** `calendar.event.create`
```json
{
  "event_id": "0cf1a383-0ec8-43ea-af55-6d71856af2b9",
  "tenant_id": "tenant-uuid",
  "summary": "Reunião de planejamento",
  "start": { "datetime": "2026-05-20T10:00:00Z" },
  "end":   { "datetime": "2026-05-20T11:00:00Z" }
}
```

---

## 2. Atualizar Evento — fluxo legado via NATS

> Não há rota HTTP/front-end para update. Este fluxo permanece disponível para
> consumidores que publicam comandos no subject `calendar.command.update_event`.

**Request:**
```json
NATS calendar.command.update_event
{
  "token": {
    "access_token": "ya29.xxx",
    "refresh_token": "1//xxx",
    "token_type": "Bearer",
    "expiry": "2026-06-02T15:00:00Z"
  },
  "event_id": "abc123xyz",
  "summary": "Reunião atualizada",
  "start": "2026-05-20T11:00:00Z"
}
```

> Apenas os campos enviados são alterados — campos ausentes preservam valor existente no Google Calendar.

**Fluxo:**
```
NATS subscriber
  │  parse payload e start/end se presentes
  ▼
CalendarService.Update(ctx, token, input)
  │
  ├─▶ calendar.NewService(ctx, httpClient)
  │
  ├─▶ svc.Events.Get("primary", eventID).Do()
  │       busca estado atual do evento no Google Calendar
  │
  ├─▶ aplica somente os campos presentes no input sobre o evento existente
  │
  ├─▶ svc.Events.Update("primary", eventID, existing).Do()
  │       Google Calendar persiste as alterações
  │
  └─▶ EventPublisher.PublishUpdateEvent(payload)
          publica em: "calendar.event.update"
```

**NATS subject:** `calendar.event.update`
```json
{
  "event_id": "abc123xyz",
  "summary": "Reunião atualizada",
  "start": { "datetime": "2026-05-20T11:00:00Z" }
}
```

---

## 3. Deletar Evento — `DELETE /events/{id}`

**Request:**
```
DELETE /events/0cf1a383-0ec8-43ea-af55-6d71856af2b9
Authorization: Bearer <jwt-da-plataforma>
```

**Fluxo:**
```
EventHandler.Delete()
  │  extrai eventID do path param {id}
  │  extrai tenant_id do JWT
  │
  ├─▶ busca google_event_id do evento interno
  │
  ├─▶ se google_event_id existir:
  │       TokenStore.Get(tenant_id) → token
  │       svc.Events.Delete("primary", google_event_id).Do()
  │
  └─▶ DELETE automation.calendar_events
```

**Response:** `204 No Content`

---

## 4. Webhook do Google Calendar — `POST /webhook/google-calendar`

> Google Calendar envia notificações push quando algo muda num calendário monitorado via Watch channel.

**Headers enviados pelo Google:**
```
X-Goog-Resource-State: exists | not_exists | sync
X-Goog-Channel-ID:     <uuid do canal Watch>
X-Goog-Resource-ID:    <id do recurso monitorado>
```

**Fluxo:**
```
CalendarHandler.Webhook()
  │
  ├─▶ se X-Goog-Resource-State == "sync"
  │       → 200 OK  (confirmação de registro do Watch, sem ação)
  │
  └─▶ demais estados (exists, not_exists):
  │
  ▼
NotificationService.HandleWebhookNotification(channelID, resourceID, state)
  │
  └─▶ EventPublisher.PublishWebhookEvent(payload)
          publica em: "calendar.webhook.notification"
```

**Response:** `200 OK`

**NATS subject:** `calendar.webhook.notification`
```json
{
  "channel_id":     "uuid-do-canal",
  "resource_id":    "id-do-recurso",
  "resource_state": "exists"
}
```

> **Importante:** o webhook não informa O QUE mudou — apenas que algo mudou. O consumer do subject `calendar.webhook.notification` é responsável por chamar a Google Calendar API com o sync token para buscar as mudanças reais.

---

## 5. OAuth2 — `POST /auth/login` + `GET /auth/google/callback`

### Login

**Request:**
```
POST /auth/login
Authorization: Bearer <jwt-da-plataforma>
```

**Fluxo:**
```
AuthHandler.StartLogin()
  │
  ├─▶ extrai tenant_id do JWT
  ├─▶ gera state de uso único vinculado ao tenant_id
  │
  └─▶ oauth2.Config.AuthCodeURL(state)
          oauth2.Config.AuthCodeURL() → URL do Google consent screen
```

**Response:**
```json
{ "auth_url": "https://accounts.google.com/o/oauth2/auth?..." }
```

### Callback

**Request (Google redireciona para):**
```
GET /auth/google/callback?code=AUTH_CODE&state=STATE
```

**Fluxo:**
```
AuthHandler.Callback()
  │
  ├─▶ valida state e recupera tenant_id
  ├─▶ AuthService.ExchangeCode(ctx, code)
          oauth2.Config.Exchange(ctx, code)
          Google troca code por access_token + refresh_token
  │
  ├─▶ persiste token em automation.calendar_oauth_tokens
  │
  └─▶ redirect para FRONTEND_URL/settings?google=connected
```

> O browser nunca recebe `GOOGLE_CLIENT_SECRET`. O front envia o JWT da
> plataforma; as credenciais OAuth ficam no backend.

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `NATS_URL` | URL do broker NATS (default: `nats://localhost:4222`) |
| `GOOGLE_CLIENT_ID` | Client ID do projeto no Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret do projeto no Google Cloud Console |
| `GOOGLE_REDIRECT_URL` | URL de callback OAuth2 (default: `http://localhost:8080/api/calendar/auth/google/callback`) |
| `FRONTEND_URL` | URL para retorno após OAuth (default: `http://localhost:3030`) |
| `PORT` | Porta do servidor HTTP (default: `8080`) |
