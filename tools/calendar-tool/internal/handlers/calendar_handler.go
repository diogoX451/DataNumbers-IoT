package handlers

import (
	"net/http"

	"data_numbers/internal/services"
)

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

	// Google sends "sync" on Watch registration — no action needed
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
