# Calendar Tool — Implementation Plan

## Confirmed Architecture

**Flow:** HTTP request → Handler → CalendarService → Google Calendar API → EventPublisher (NATS)  
**Webhook:** POST /webhook/google-calendar → CalendarHandler → NotificationService → EventPublisher (NATS)  
**Router:** chi v5

---

## Files

| File | Status | Action |
|------|--------|--------|
| `broker/event_publisher.go` | done | CRUD + webhook payloads |
| `services/calendar_service.go` | done | Google Calendar API CRUD + NATS publish, uses `TokenGetter` interface |
| `services/auth_service.go` | done | OAuth2 URL generation + code exchange |
| `services/notification_service.go` | done | Webhook → NATS |
| `handlers/event_handler.go` | done | POST /events, PUT /events/{id}, DELETE /events/{id} |
| `handlers/auth_handler.go` | done | GET /auth/login, GET /auth/callback |
| `handlers/calendar_handler.go` | done | POST /webhook/google-calendar |
| `api/main.go` | done | Full wiring: NATS + token subscription + OAuth2 + chi router |
| `repository/token_store.go` | done | In-memory token store populated via NATS subscription |

---

## NATS Subjects

| Subject | Trigger |
|---------|---------|
| `calendar.event.create` | Event created in Google Calendar |
| `calendar.event.update` | Event updated in Google Calendar |
| `calendar.event.delete` | Event deleted in Google Calendar |
| `calendar.webhook.notification` | Google Calendar push notification received |

## HTTP Routes

| Method | Path | Handler |
|--------|------|---------|
| POST | /events | EventHandler.Create |
| PUT | /events/{id} | EventHandler.Update |
| DELETE | /events/{id} | EventHandler.Delete |
| GET | /auth/login | AuthHandler.Login |
| GET | /auth/callback | AuthHandler.Callback |
| POST | /webhook/google-calendar | CalendarHandler.Webhook |

## Env Vars Required

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8080/auth/callback
NATS_URL=nats://localhost:4222
NATS_TOKEN_SUBJECT=         # subject where token messages are received
PORT=8080
```

## Dependency to add

```
github.com/go-chi/chi/v5
```

## Notes

- `TokenStore` holds tokens in memory keyed by `user_id`; populated via NATS subscription on `NATS_TOKEN_SUBJECT`
- Token NATS message format: `{ "user_id", "access_token", "refresh_token", "token_type", "expiry" }`
- OAuth2 callback returns tokens as JSON — storing/propagating to NATS is responsibility of the consumer
- Webhook receiver only publishes to NATS; Watch channel registration is out of scope
- Google Calendar `X-Goog-Resource-State: sync` is acknowledged silently (no NATS publish)
