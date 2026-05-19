package services

import (
	"data_numbers/internal/broker"
	"time"
)

type EventService struct {
	publisher *broker.EventPublisher
}

func NewEventService(publisher *broker.EventPublisher) *EventService {
	return &EventService{
		publisher: publisher,
	}
}

type CreateEventInput struct {
	Summary     string
	Location    string
	Description string
	Start       time.Time
	End         time.Time
	Recurrence  []string
	Attendees   []string
}

type UpdateEventInput struct {
	EventID     string
	Summary     string
	Location    string
	Description string
	Start       *time.Time
	End         *time.Time
	Recurrence  []string
	Attendees   []string
}

type DeleteEventInput struct {
	EventID string
}

func (s *EventService) Create(input CreateEventInput) error {
	attendees := make([]broker.Attendee, len(input.Attendees))
	for i, email := range input.Attendees {
		attendees[i] = broker.Attendee{Email: email}
	}

	return s.publisher.PublishCreateEvent(broker.CreateEventPayload{
		Summary:     input.Summary,
		Location:    input.Location,
		Description: input.Description,
		Start:       broker.EventTime{DateTime: input.Start},
		End:         broker.EventTime{DateTime: input.End},
		Recurrence:  input.Recurrence,
		Attendees:   attendees,
	})
}

func (s *EventService) Update(input UpdateEventInput) error {
	payload := broker.UpdateEventPayload{
		EventID:     input.EventID,
		Summary:     input.Summary,
		Location:    input.Location,
		Description: input.Description,
		Recurrence:  input.Recurrence,
	}

	if input.Start != nil {
		payload.Start = &broker.EventTime{DateTime: *input.Start}
	}
	if input.End != nil {
		payload.End = &broker.EventTime{DateTime: *input.End}
	}
	if input.Attendees != nil {
		attendees := make([]broker.Attendee, len(input.Attendees))
		for i, email := range input.Attendees {
			attendees[i] = broker.Attendee{Email: email}
		}
		payload.Attendees = attendees
	}

	return s.publisher.PublishUpdateEvent(payload)
}

func (s *EventService) Delete(input DeleteEventInput) error {
	return s.publisher.PublishDeleteEvent(broker.DeleteEventPayload{
		EventID: input.EventID,
	})
}
