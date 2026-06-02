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
{
  "user_id": "user123",
  "summary": "Reunião de planejamento",
  "location": "Sala A",
  "description": "Sprint planning Q3",
  "start": "2026-05-20T10:00:00Z",
  "end": "2026-05-20T11:00:00Z",
  "recurrence": ["RRULE:FREQ=WEEKLY"],
  "attendees": ["fulano@example.com"]
}
```

**Fluxo:**
```
EventHandler.Create()
  │  valida: summary, start, end obrigatórios
  │  parse start/end RFC3339 → time.Time
  ▼
CalendarService.Create(ctx, userID, input)
  │
  ├─▶ UserRepository.GetUserCalendarToken(userID)
  │       retorna oauth2.Token (mock via .env)
  │
  ├─▶ oauth2.Config.Client(ctx, token) → httpClient autenticado
  ├─▶ calendar.NewService(ctx, httpClient)
  │
  ├─▶ svc.Events.Insert("primary", event).Do()
  │       Google Calendar cria o evento
  │       retorna: created.Id
  │
  └─▶ EventPublisher.PublishCreateEvent(payload)
          publica em: "calendar.event.create"
          payload inclui event_id retornado pelo Google
```

**Response:** `201 Created`
```json
{ "event_id": "abc123xyz" }
```

**NATS subject:** `calendar.event.create`
```json
{
  "event_id": "abc123xyz",
  "summary": "Reunião de planejamento",
  "start": { "datetime": "2026-05-20T10:00:00Z" },
  "end":   { "datetime": "2026-05-20T11:00:00Z" }
}
```

---

## 2. Atualizar Evento — `PUT /events/{id}`

**Request:**
```json
PUT /events/abc123xyz
{
  "user_id": "user123",
  "summary": "Reunião atualizada",
  "start": "2026-05-20T11:00:00Z"
}
```

> Apenas os campos enviados são alterados — campos ausentes preservam valor existente no Google Calendar.

**Fluxo:**
```
EventHandler.Update()
  │  extrai eventID do path param {id}
  │  parse start/end se presentes no body
  ▼
CalendarService.Update(ctx, userID, input)
  │
  ├─▶ UserRepository.GetUserCalendarToken(userID) → token
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

**Response:** `204 No Content`

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
DELETE /events/abc123xyz?user_id=user123
```

**Fluxo:**
```
EventHandler.Delete()
  │  extrai eventID do path param {id}
  │  extrai userID do query param user_id
  ▼
CalendarService.Delete(ctx, userID, eventID)
  │
  ├─▶ UserRepository.GetUserCalendarToken(userID) → token
  ├─▶ calendar.NewService(ctx, httpClient)
  │
  ├─▶ svc.Events.Delete("primary", eventID).Do()
  │       Google Calendar remove o evento
  │
  └─▶ EventPublisher.PublishDeleteEvent(payload)
          publica em: "calendar.event.delete"
```

**Response:** `204 No Content`

**NATS subject:** `calendar.event.delete`
```json
{ "event_id": "abc123xyz" }
```

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

## 5. OAuth2 — `GET /auth/login` + `GET /auth/callback`

### Login

**Request:**
```
GET /auth/login?state=valor-opcional
```

**Fluxo:**
```
AuthHandler.Login()
  │
  └─▶ AuthService.GetAuthURL(state)
          oauth2.Config.AuthCodeURL() → URL do Google consent screen
  │
  └─▶ 307 Redirect → https://accounts.google.com/o/oauth2/auth?...
```

### Callback

**Request (Google redireciona para):**
```
GET /auth/callback?code=AUTH_CODE&state=valor-opcional
```

**Fluxo:**
```
AuthHandler.Callback()
  │
  └─▶ AuthService.ExchangeCode(ctx, code)
          oauth2.Config.Exchange(ctx, code)
          Google troca code por access_token + refresh_token
  │
  └─▶ 200 OK
```

**Response:**
```json
{
  "access_token":  "ya29.xxx",
  "refresh_token": "1//xxx",
  "token_type":    "Bearer"
}
```

> Os tokens retornados devem ser persistidos para uso nos endpoints `/events`. Por enquanto `UserRepository` lê de variáveis de ambiente (mock).

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `NATS_URL` | URL do broker NATS (default: `nats://localhost:4222`) |
| `NATS_TOKEN_SUBJECT` | Subject NATS de onde o serviço recebe tokens do Google Calendar (obrigatório) |
| `GOOGLE_CLIENT_ID` | Client ID do projeto no Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret do projeto no Google Cloud Console |
| `GOOGLE_REDIRECT_URL` | URL de callback OAuth2 (default: `http://localhost:8080/auth/callback`) |
| `PORT` | Porta do servidor HTTP (default: `8080`) |

## Formato da mensagem de token (NATS_TOKEN_SUBJECT)

```json
{
  "user_id":       "user123",
  "access_token":  "ya29.xxx",
  "refresh_token": "1//xxx",
  "token_type":    "Bearer",
  "expiry":        "2026-06-02T15:00:00Z"
}
```

> Cada mensagem recebida sobrescreve o token do `user_id` correspondente no `TokenStore` em memória.
