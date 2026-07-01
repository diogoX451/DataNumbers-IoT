package handlers

import (
	"encoding/json"
	"net/http"

	"data_numbers/internal/services"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

type CalendarHandler struct {
	notifSvc *services.NotificationService
}

func NewCalendarHandler(svc *services.NotificationService) *CalendarHandler {
	return &CalendarHandler{notifSvc: svc}
}

func (h *CalendarHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	resourceState := r.Header.Get("X-Goog-Resource-State")
	channelID := r.Header.Get("X-Goog-Channel-ID")
	resourceID := r.Header.Get("X-Goog-Resource-ID")

	if resourceState == "sync" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if err := h.notifSvc.HandleWebhookNotification(channelID, resourceID, resourceState); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
}
