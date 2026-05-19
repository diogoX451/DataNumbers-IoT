package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"data_numbers/internal/services"

	"github.com/go-chi/chi/v5"
)

type EventHandler struct {
	calendarSvc *services.CalendarService
}

func NewEventHandler(svc *services.CalendarService) *EventHandler {
	return &EventHandler{calendarSvc: svc}
}

type createEventRequest struct {
	UserID      string   `json:"user_id"`
	Summary     string   `json:"summary"`
	Location    string   `json:"location"`
	Description string   `json:"description"`
	Start       string   `json:"start"`
	End         string   `json:"end"`
	Recurrence  []string `json:"recurrence"`
	Attendees   []string `json:"attendees"`
}

type updateEventRequest struct {
	UserID      string   `json:"user_id"`
	Summary     string   `json:"summary"`
	Location    string   `json:"location"`
	Description string   `json:"description"`
	Start       *string  `json:"start"`
	End         *string  `json:"end"`
	Recurrence  []string `json:"recurrence"`
	Attendees   []string `json:"attendees"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (h *EventHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Summary == "" || req.Start == "" || req.End == "" {
		writeError(w, http.StatusBadRequest, "summary, start, and end are required")
		return
	}

	start, err := time.Parse(time.RFC3339, req.Start)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid start: use RFC3339 format")
		return
	}
	end, err := time.Parse(time.RFC3339, req.End)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid end: use RFC3339 format")
		return
	}

	eventID, err := h.calendarSvc.Create(r.Context(), req.UserID, services.CreateEventInput{
		Summary:     req.Summary,
		Location:    req.Location,
		Description: req.Description,
		Start:       start,
		End:         end,
		Recurrence:  req.Recurrence,
		Attendees:   req.Attendees,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"event_id": eventID})
}

func (h *EventHandler) Update(w http.ResponseWriter, r *http.Request) {
	eventID := chi.URLParam(r, "id")
	if eventID == "" {
		writeError(w, http.StatusBadRequest, "event id required")
		return
	}

	var req updateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	input := services.UpdateEventInput{
		EventID:     eventID,
		Summary:     req.Summary,
		Location:    req.Location,
		Description: req.Description,
		Recurrence:  req.Recurrence,
		Attendees:   req.Attendees,
	}

	if req.Start != nil {
		t, err := time.Parse(time.RFC3339, *req.Start)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid start: use RFC3339 format")
			return
		}
		input.Start = &t
	}
	if req.End != nil {
		t, err := time.Parse(time.RFC3339, *req.End)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid end: use RFC3339 format")
			return
		}
		input.End = &t
	}

	if err := h.calendarSvc.Update(r.Context(), req.UserID, input); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *EventHandler) Delete(w http.ResponseWriter, r *http.Request) {
	eventID := chi.URLParam(r, "id")
	if eventID == "" {
		writeError(w, http.StatusBadRequest, "event id required")
		return
	}

	userID := r.URL.Query().Get("user_id")

	if err := h.calendarSvc.Delete(r.Context(), userID, eventID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
