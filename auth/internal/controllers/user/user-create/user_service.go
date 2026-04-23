package usercreate

import (
	"fmt"

	"github.com/data_numbers/internal/controllers/topics"
	"github.com/data_numbers/internal/models"
)

type IUserCreateService interface {
	CreateUser(input UserCreateInput, mqttAcl topics.TopicsInput) (*models.User, error)
	GetUser(id string) (*models.User, error)
}

type UserCreateService struct {
	repo         IRepository
	topicService topics.ITopicsService
}

func NewService(repo IRepository, topicService topics.ITopicsService) *UserCreateService {
	return &UserCreateService{
		repo:         repo,
		topicService: topicService,
	}
}

func (service *UserCreateService) CreateUser(input UserCreateInput, mqttAcl topics.TopicsInput) (*models.User, error) {
	user, err := service.repo.CreateUser(input)
	if err != nil {
		return nil, err
	}

	go func() {
		mqttAcl.UserId = user.ID
		_, err := service.topicService.CreateMqttAcl(mqttAcl)
		if err != nil {
			fmt.Println(err)
		}
	}()

	return user, nil
}

func (service *UserCreateService) GetUser(id string) (*models.User, error) {
	user, err := service.repo.GetUser(id)
	if err != nil {
		return nil, err
	}

	return user, nil
}
