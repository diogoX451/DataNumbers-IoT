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
	"golang.org/x/oauth2"
)

// EventHandler expõe o fluxo de calendário interno: criar um evento aqui
// persiste em automation.calendar_events e publica calendar.event.create no
// NATS na hora — é isso que o rule-engine consome pra disparar
// automation.rules amarradas ao evento. Se o tenant tiver conectado o Google
// Calendar (via AuthHandler), o mesmo evento é criado lá também e o ID externo
// fica persistido pra permitir exclusão sincronizada.
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
	EventID        string    `json:"event_id"`
	ScenarioID     *string   `json:"scenario_id,omitempty"`
	GoogleEventID  *string   `json:"google_event_id,omitempty"`
	SyncedToGoogle bool      `json:"synced_to_google"`
	Summary        string    `json:"summary"`
	Description    string    `json:"description,omitempty"`
	Start          time.Time `json:"start"`
	End            time.Time `json:"end"`
	CreatedAt      time.Time `json:"created_at"`
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
	if !end.After(start) {
		writeError(w, http.StatusBadRequest, "end must be after start")
		return
	}

	var scenarioID sql.NullString
	if req.ScenarioID != "" {
		scenarioID.String = req.ScenarioID
		scenarioID.Valid = true
	}

	var googleEventID *string
	tok, err := h.tokens.Get(r.Context(), tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if tok != nil {
		id, err := h.calendarSvc.CreateGoogleEvent(r.Context(), tok, services.CreateEventInput{
			Summary:     req.Summary,
			Description: req.Description,
			Start:       start,
			End:         end,
		})
		if err != nil {
			writeError(w, http.StatusBadGateway, "google calendar sync failed: "+err.Error())
			return
		}
		googleEventID = &id
	}

	var eventID string
	var createdAt time.Time
	var googleEventValue any
	var googleSyncedAt any
	if googleEventID != nil {
		googleEventValue = *googleEventID
		googleSyncedAt = time.Now().UTC()
	}
	err = h.db.QueryRowContext(r.Context(), `
		INSERT INTO automation.calendar_events (
			tenant_id, scenario_id, google_event_id, google_synced_at,
			summary, description, starts_at, ends_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING event_id, created_at
	`, tenantID, scenarioID, googleEventValue, googleSyncedAt, req.Summary, req.Description, start, end).Scan(&eventID, &createdAt)
	if err != nil {
		h.cleanupGoogleEvent(r.Context(), tok, googleEventID)
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
		h.cleanupStoredEvent(r.Context(), tenantID, eventID)
		h.cleanupGoogleEvent(r.Context(), tok, googleEventID)
		writeError(w, http.StatusBadGateway, "created but failed to publish automation trigger: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, calendarEvent{
		EventID:        eventID,
		GoogleEventID:  googleEventID,
		SyncedToGoogle: googleEventID != nil,
		Summary:        req.Summary,
		Description:    req.Description,
		Start:          start,
		End:            end,
		CreatedAt:      createdAt,
	})
}

func (h *EventHandler) cleanupGoogleEvent(ctx context.Context, tok *oauth2.Token, googleEventID *string) {
	if tok == nil || googleEventID == nil {
		return
	}
	if err := h.calendarSvc.DeleteGoogleEvent(ctx, tok, *googleEventID); err != nil {
		log.Printf("google cleanup failed for event %s: %v", *googleEventID, err)
	}
}

func (h *EventHandler) cleanupStoredEvent(ctx context.Context, tenantID, eventID string) {
	if _, err := h.db.ExecContext(ctx, `
		DELETE FROM automation.calendar_events WHERE event_id = $1 AND tenant_id = $2
	`, eventID, tenantID); err != nil {
		log.Printf("calendar cleanup failed for event %s: %v", eventID, err)
	}
}

func (h *EventHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := tenantIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing tenant")
		return
	}

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT event_id, scenario_id::text, google_event_id, summary, COALESCE(description, ''), starts_at, ends_at, created_at
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
		var googleEventID sql.NullString
		if err := rows.Scan(&e.EventID, &scenarioID, &googleEventID, &e.Summary, &e.Description, &e.Start, &e.End, &e.CreatedAt); err != nil {
			continue
		}
		if scenarioID.Valid {
			e.ScenarioID = &scenarioID.String
		}
		if googleEventID.Valid {
			e.GoogleEventID = &googleEventID.String
			e.SyncedToGoogle = true
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

	var googleEventID sql.NullString
	err := h.db.QueryRowContext(r.Context(), `
		SELECT google_event_id
		FROM automation.calendar_events
		WHERE event_id = $1 AND tenant_id = $2
	`, eventID, tenantID).Scan(&googleEventID)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "event not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if googleEventID.Valid && googleEventID.String != "" {
		tok, err := h.tokens.Get(r.Context(), tenantID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if tok == nil {
			writeError(w, http.StatusConflict, "google calendar is disconnected; reconnect before deleting a synced event")
			return
		}
		if err := h.calendarSvc.DeleteGoogleEvent(r.Context(), tok, googleEventID.String); err != nil {
			writeError(w, http.StatusBadGateway, "google calendar delete failed: "+err.Error())
			return
		}
	}

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
