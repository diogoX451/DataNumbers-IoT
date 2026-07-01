package services

import "data_numbers/internal/broker"

type NotificationService struct {
	publisher *broker.EventPublisher
}

func NewNotificationService(pub *broker.EventPublisher) *NotificationService {
	return &NotificationService{publisher: pub}
}

func (s *NotificationService) HandleWebhookNotification(channelID, resourceID, resourceState string) error {
	return s.publisher.PublishWebhookEvent(broker.WebhookEventPayload{
		ChannelID:     channelID,
		ResourceID:    resourceID,
		ResourceState: resourceState,
	})
}
