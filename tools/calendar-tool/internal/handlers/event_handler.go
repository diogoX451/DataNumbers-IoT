package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"data_numbers/internal/broker"
	"data_numbers/internal/services"

	"github.com/go-chi/chi/v5"
)

// EventHandler expõe o fluxo de calendário interno: criar um evento aqui
// persiste em automation.calendar_events e publica calendar.event.create no
// NATS na hora — é isso que o rule-engine consome pra disparar
// automation.rules amarradas ao evento. Se o tenant tiver conectado o Google
// Calendar (via AuthHandler), o mesmo evento é replicado lá também,
// best-effort (falha na sincronização não derruba a criação do evento).
type EventHandler struct {
	db          *sql.DB
	publisher   *broker.EventPublisher
	calendarSvc *services.CalendarService
	tokens      *services.TokenStore
}

func NewEventHandler(db *sql.DB, publisher *broker.EventPublisher, calendarSvc *services.CalendarService, tokens *services.TokenStore) *EventHandler {
	return &EventHandler{db: db, publisher: publisher, calendarSvc: calendarSvc, tokens: tokens}
}

type createEventRequest struct {
	Summary     string `json:"summary"`
	Description string `json:"description,omitempty"`
	ScenarioID  string `json:"scenario_id,omitempty"`
	Start       string `json:"start"`
	End         string `json:"end"`
}

type calendarEvent struct {
	EventID     string    `json:"event_id"`
	ScenarioID  *string   `json:"scenario_id,omitempty"`
	Summary     string    `json:"summary"`
	Description string    `json:"description,omitempty"`
	Start       time.Time `json:"start"`
	End         time.Time `json:"end"`
	CreatedAt   time.Time `json:"created_at"`
}

func (h *EventHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := tenantIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing tenant")
		return
	}

	var req createEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.Summary == "" || req.Start == "" || req.End == "" {
		writeError(w, http.StatusBadRequest, "summary, start and end are required")
		return
	}

	start, err := time.Parse(time.RFC3339, req.Start)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid start (use RFC3339)")
		return
	}
	end, err := time.Parse(time.RFC3339, req.End)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid end (use RFC3339)")
		return
	}

	var scenarioID sql.NullString
	if req.ScenarioID != "" {
		scenarioID.String = req.ScenarioID
		scenarioID.Valid = true
	}

	var eventID string
	var createdAt time.Time
	err = h.db.QueryRowContext(r.Context(), `
		INSERT INTO automation.calendar_events (tenant_id, scenario_id, summary, description, starts_at, ends_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING event_id, created_at
	`, tenantID, scenarioID, req.Summary, req.Description, start, end).Scan(&eventID, &createdAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if err := h.publisher.PublishCreateEvent(broker.CreateEventPayload{
		EventID:     eventID,
		TenantID:    tenantID,
		ScenarioID:  req.ScenarioID,
		Summary:     req.Summary,
		Description: req.Description,
		Start:       broker.EventTime{DateTime: start},
		End:         broker.EventTime{DateTime: end},
	}); err != nil {
		// Evento já persistido — loga e segue. Falha aqui não deve impedir
		// o operador de ver o evento criado; ele só não disparou automação.
		writeJSON(w, http.StatusCreated, map[string]any{
			"event_id": eventID, "warning": "created but failed to publish trigger: " + err.Error(),
		})
		return
	}

	h.syncToGoogle(r.Context(), tenantID, req, start, end)

	writeJSON(w, http.StatusCreated, calendarEvent{
		EventID:     eventID,
		Summary:     req.Summary,
		Description: req.Description,
		Start:       start,
		End:         end,
		CreatedAt:   createdAt,
	})
}

// syncToGoogle replica o evento no Google Calendar do tenant, se conectado.
// Best-effort: só loga em caso de falha, nunca bloqueia a resposta —  o
// evento interno (fonte de verdade da automação) já está persistido.
func (h *EventHandler) syncToGoogle(ctx context.Context, tenantID string, req createEventRequest, start, end time.Time) {
	tok, err := h.tokens.Get(ctx, tenantID)
	if err != nil || tok == nil {
		return
	}
	if _, err := h.calendarSvc.CreateGoogleEvent(ctx, tok, services.CreateEventInput{
		Summary:     req.Summary,
		Description: req.Description,
		Start:       start,
		End:         end,
	}); err != nil {
		log.Printf("google sync failed for tenant %s: %v", tenantID, err)
	}
}

func (h *EventHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := tenantIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing tenant")
		return
	}

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT event_id, scenario_id::text, summary, COALESCE(description, ''), starts_at, ends_at, created_at
		FROM automation.calendar_events
		WHERE tenant_id = $1
		ORDER BY starts_at DESC
	`, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	events := []calendarEvent{}
	for rows.Next() {
		var e calendarEvent
		var scenarioID sql.NullString
		if err := rows.Scan(&e.EventID, &scenarioID, &e.Summary, &e.Description, &e.Start, &e.End, &e.CreatedAt); err != nil {
			continue
		}
		if scenarioID.Valid {
			e.ScenarioID = &scenarioID.String
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, events)
}

func (h *EventHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := tenantIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing tenant")
		return
	}
	eventID := chi.URLParam(r, "id")

	res, err := h.db.ExecContext(r.Context(), `
		DELETE FROM automation.calendar_events WHERE event_id = $1 AND tenant_id = $2
	`, eventID, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		writeError(w, http.StatusNotFound, "event not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// TenantIDKey é a chave de contexto onde o authMiddleware (api/main.go)
// coloca o tenant_id extraído do JWT. Exportada pra ser compartilhada entre
// o middleware (package main) e este handler.
type contextKey string

const TenantIDKey contextKey = "tenant_id"

func tenantIDFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(TenantIDKey).(string)
	return v, ok && v != ""
}
