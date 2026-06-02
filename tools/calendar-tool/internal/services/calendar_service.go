package services

import (
	"context"
	"fmt"
	"time"

	"data_numbers/internal/broker"

	"golang.org/x/oauth2"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

type TokenGetter interface {
	GetUserCalendarToken(userID string) (*oauth2.Token, error)
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

type CalendarService struct {
	userRepo  TokenGetter
	publisher *broker.EventPublisher
	oauthCfg  *oauth2.Config
}

func NewCalendarService(userRepo TokenGetter, publisher *broker.EventPublisher, oauthCfg *oauth2.Config) *CalendarService {
	return &CalendarService{
		userRepo:  userRepo,
		publisher: publisher,
		oauthCfg:  oauthCfg,
	}
}

func (s *CalendarService) buildService(ctx context.Context, userID string) (*calendar.Service, error) {
	token, err := s.userRepo.GetUserCalendarToken(userID)
	if err != nil {
		return nil, fmt.Errorf("get user token: %w", err)
	}
	httpClient := s.oauthCfg.Client(ctx, token)
	return calendar.NewService(ctx, option.WithHTTPClient(httpClient))
}

func (s *CalendarService) Create(ctx context.Context, userID string, input CreateEventInput) (string, error) {
	svc, err := s.buildService(ctx, userID)
	if err != nil {
		return "", err
	}

	attendees := make([]*calendar.EventAttendee, len(input.Attendees))
	for i, email := range input.Attendees {
		attendees[i] = &calendar.EventAttendee{Email: email}
	}

	event := &calendar.Event{
		Summary:     input.Summary,
		Location:    input.Location,
		Description: input.Description,
		Start:       &calendar.EventDateTime{DateTime: input.Start.Format(time.RFC3339)},
		End:         &calendar.EventDateTime{DateTime: input.End.Format(time.RFC3339)},
		Recurrence:  input.Recurrence,
		Attendees:   attendees,
	}

	created, err := svc.Events.Insert("primary", event).Do()
	if err != nil {
		return "", fmt.Errorf("google calendar insert: %w", err)
	}

	brokerAttendees := make([]broker.Attendee, len(input.Attendees))
	for i, email := range input.Attendees {
		brokerAttendees[i] = broker.Attendee{Email: email}
	}

	if err := s.publisher.PublishCreateEvent(broker.CreateEventPayload{
		EventID:     created.Id,
		Summary:     input.Summary,
		Location:    input.Location,
		Description: input.Description,
		Start:       broker.EventTime{DateTime: input.Start},
		End:         broker.EventTime{DateTime: input.End},
		Recurrence:  input.Recurrence,
		Attendees:   brokerAttendees,
	}); err != nil {
		return created.Id, fmt.Errorf("nats publish: %w", err)
	}

	return created.Id, nil
}

func (s *CalendarService) Update(ctx context.Context, userID string, input UpdateEventInput) error {
	svc, err := s.buildService(ctx, userID)
	if err != nil {
		return err
	}

	existing, err := svc.Events.Get("primary", input.EventID).Do()
	if err != nil {
		return fmt.Errorf("google calendar get: %w", err)
	}

	if input.Summary != "" {
		existing.Summary = input.Summary
	}
	if input.Location != "" {
		existing.Location = input.Location
	}
	if input.Description != "" {
		existing.Description = input.Description
	}
	if input.Start != nil {
		existing.Start = &calendar.EventDateTime{DateTime: input.Start.Format(time.RFC3339)}
	}
	if input.End != nil {
		existing.End = &calendar.EventDateTime{DateTime: input.End.Format(time.RFC3339)}
	}
	if len(input.Recurrence) > 0 {
		existing.Recurrence = input.Recurrence
	}
	if len(input.Attendees) > 0 {
		attendees := make([]*calendar.EventAttendee, len(input.Attendees))
		for i, email := range input.Attendees {
			attendees[i] = &calendar.EventAttendee{Email: email}
		}
		existing.Attendees = attendees
	}

	if _, err = svc.Events.Update("primary", input.EventID, existing).Do(); err != nil {
		return fmt.Errorf("google calendar update: %w", err)
	}

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
	if len(input.Attendees) > 0 {
		attendees := make([]broker.Attendee, len(input.Attendees))
		for i, email := range input.Attendees {
			attendees[i] = broker.Attendee{Email: email}
		}
		payload.Attendees = attendees
	}

	return s.publisher.PublishUpdateEvent(payload)
}

func (s *CalendarService) Delete(ctx context.Context, userID string, eventID string) error {
	svc, err := s.buildService(ctx, userID)
	if err != nil {
		return err
	}

	if err := svc.Events.Delete("primary", eventID).Do(); err != nil {
		return fmt.Errorf("google calendar delete: %w", err)
	}

	return s.publisher.PublishDeleteEvent(broker.DeleteEventPayload{EventID: eventID})
}
