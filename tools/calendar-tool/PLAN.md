# Calendar Tool — Implementation Plan

## Confirmed Architecture

**Flow:** HTTP request → Handler → CalendarService → Google Calendar API → EventPublisher (NATS)  
**Webhook:** POST /webhook/google-calendar → CalendarHandler → NotificationService → EventPublisher (NATS)  
**Router:** chi v5

---

## Files

| File | Status | Action |
|------|--------|--------|
| `broker/event_publisher.go` | exists | Add `EventID` to `CreateEventPayload`, add `WebhookEventPayload` + `PublishWebhookEvent` |
| `services/calendar_service.go` | TODO | Google Calendar API CRUD + NATS publish |
| `services/auth_service.go` | TODO | OAuth2 URL generation + code exchange |
| `services/notification_service.go` | TODO | Webhook → NATS |
| `handlers/event_handler.go` | TODO | POST /events, PUT /events/{id}, DELETE /events/{id} |
| `handlers/auth_handler.go` | TODO | GET /auth/login, GET /auth/callback |
| `handlers/calendar_handler.go` | TODO | POST /webhook/google-calendar |
| `api/main.go` | stub | Full wiring: NATS + OAuth2 + chi router |
| `repository/postgres.go` | TODO stub | Keep mock, add DB placeholder |
| `.env` | exists | Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL, PORT |

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
PORT=8080
TEMP_GOOGLE_ACCESS_TOKEN=   # used by UserRepository mock
TEMP_GOOGLE_REFRESH_TOKEN=  # used by UserRepository mock
```

## Dependency to add

```
github.com/go-chi/chi/v5
```

## Notes

- `UserRepository.GetUserCalendarToken` stays as mock (env vars) — real DB impl deferred
- OAuth2 callback returns tokens as JSON — storing in DB is deferred
- Webhook receiver only publishes to NATS; Watch channel registration is out of scope
- Google Calendar `X-Goog-Resource-State: sync` is acknowledged silently (no NATS publish)
