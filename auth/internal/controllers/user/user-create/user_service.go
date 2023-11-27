package usercreate

import (
	"fmt"

	"github.com/data_numbers/internal/models"
)

type IUserCreateService interface {
	CreateUser(input UserCreateInput, mqttAcl UserMqttAclInput) (*models.User, error)
	GetUser(id string) (*models.User, error)
}

type UserCreateService struct {
	repo IRepository
}

func NewService(repo IRepository) *UserCreateService {
	return &UserCreateService{
		repo: repo,
	}
}

func (service *UserCreateService) CreateUser(input UserCreateInput, mqttAcl UserMqttAclInput) (*models.User, error) {
	user, err := service.repo.CreateUser(input)
	if err != nil {
		return nil, err
	}

	go func() {
		mqttAcl.UserId = user.ID
		_, err := service.repo.CreateMqttAcl(mqttAcl)
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
