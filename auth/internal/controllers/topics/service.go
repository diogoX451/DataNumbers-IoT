package topics

import "github.com/data_numbers/internal/models"

type ITopicsService interface {
	CreateMqttAcl(input TopicsInput) (*models.MqttAcl, error)
}

type TopicsService struct {
	repo ITopicsRepository
}

func NewService(repo ITopicsRepository) *TopicsService {
	return &TopicsService{
		repo: repo,
	}
}

func (s *TopicsService) CreateMqttAcl(input TopicsInput) (*models.MqttAcl, error) {
	create, err := s.repo.CreateMqttAcl(input)
	if err != nil {
		return nil, err
	}

	return create, nil
}
