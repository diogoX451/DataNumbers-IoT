# Calendar Tool — Implementation Plan

## Confirmed Architecture

**Flow:** authenticated HTTP request → Handler → Postgres → optional Google Calendar API → EventPublisher (NATS)
**Webhook:** POST /webhook/google-calendar → CalendarHandler → NotificationService → EventPublisher (NATS)  
**Router:** chi v5

---

## Files

| File | Status | Action |
|------|--------|--------|
| `broker/event_publisher.go` | done | calendar event + webhook payloads |
| `services/calendar_service.go` | done | Google Calendar API create/delete helpers + legacy command support |
| `services/notification_service.go` | done | Webhook → NATS |
| `services/token_store.go` | done | Postgres token store by tenant + pending OAuth states |
| `handlers/event_handler.go` | done | POST /events, GET /events, DELETE /events/{id} |
| `handlers/auth_handler.go` | done | POST /auth/login, GET /auth/status, DELETE /auth, GET /auth/google/callback |
| `handlers/calendar_handler.go` | done | POST /webhook/google-calendar |
| `api/main.go` | done | Full wiring: NATS + OAuth2 + Postgres + chi router |

---

## NATS Subjects

| Subject | Trigger |
|---------|---------|
| `calendar.event.create` | Internal calendar event created and ready for rule-engine |
| `calendar.event.update` | Legacy Google Calendar command flow updated an event |
| `calendar.event.delete` | Legacy Google Calendar command flow deleted an event |
| `calendar.webhook.notification` | Google Calendar push notification received |

## HTTP Routes

| Method | Path | Handler |
|--------|------|---------|
| POST | /events | EventHandler.Create |
| GET | /events | EventHandler.List |
| DELETE | /events/{id} | EventHandler.Delete |
| POST | /auth/login | AuthHandler.StartLogin |
| GET | /auth/status | AuthHandler.Status |
| DELETE | /auth | AuthHandler.Disconnect |
| GET | /auth/google/callback | AuthHandler.Callback |
| POST | /webhook/google-calendar | CalendarHandler.Webhook |

## Env Vars Required

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8080/api/calendar/auth/google/callback
FRONTEND_URL=http://localhost:3030
NATS_URL=nats://localhost:4222
PORT=8080
```

## Dependency to add

```
github.com/go-chi/chi/v5
```

## Notes

- `TokenStore` persists OAuth tokens in `automation.calendar_oauth_tokens` by `tenant_id`.
- OAuth2 callback redirects to `FRONTEND_URL/settings?google=connected|error`.
- Synced events keep `google_event_id` in `automation.calendar_events`, so deletes can remove the Google event too.
- Webhook receiver only publishes to NATS; Watch channel registration is out of scope
- Google Calendar `X-Goog-Resource-State: sync` is acknowledged silently (no NATS publish)
