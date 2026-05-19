// internal/broker/event_publisher.go
package broker

import (
	"encoding/json"
	"time"

	"github.com/nats-io/nats.go"
)

type CreateEventPayload struct {
	EventID     string     `json:"event_id"`
	Summary     string     `json:"summary"`
	Location    string     `json:"location,omitempty"`
	Description string     `json:"description,omitempty"`
	Start       EventTime  `json:"start"`
	End         EventTime  `json:"end"`
	Recurrence  []string   `json:"recurrence,omitempty"`
	Attendees   []Attendee `json:"attendees,omitempty"`
}

type UpdateEventPayload struct {
	EventID     string     `json:"event_id"` // ID do evento no Google Calendar
	Summary     string     `json:"summary,omitempty"`
	Location    string     `json:"location,omitempty"`
	Description string     `json:"description,omitempty"`
	Start       *EventTime `json:"start,omitempty"` // ponteiro — só envia se quiser alterar
	End         *EventTime `json:"end,omitempty"`
	Recurrence  []string   `json:"recurrence,omitempty"`
	Attendees   []Attendee `json:"attendees,omitempty"`
}

type EventTime struct {
	DateTime time.Time `json:"datetime"`
}

type Attendee struct {
	Email string `json:"email"`
}

type EventPublisher struct {
	nc *nats.Conn
}

func NewEventPublisher(nc *nats.Conn) *EventPublisher {
	return &EventPublisher{nc: nc}
}

func (p *EventPublisher) PublishCreateEvent(payload CreateEventPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return p.nc.Publish("calendar.event.create", data)
}

// --- UPDATE ---

func (p *EventPublisher) PublishUpdateEvent(payload UpdateEventPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return p.nc.Publish("calendar.event.update", data)
}

// --- DELETE ---

type DeleteEventPayload struct {
	EventID string `json:"event_id"`
}

func (p *EventPublisher) PublishDeleteEvent(payload DeleteEventPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return p.nc.Publish("calendar.event.delete", data)
}

// --- WEBHOOK ---

type WebhookEventPayload struct {
	ChannelID     string `json:"channel_id"`
	ResourceID    string `json:"resource_id"`
	ResourceState string `json:"resource_state"`
}

func (p *EventPublisher) PublishWebhookEvent(payload WebhookEventPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return p.nc.Publish("calendar.webhook.notification", data)
}
