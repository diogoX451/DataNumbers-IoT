package usercreate

import "github.com/data_numbers/internal/models"

type IUserCreateService interface {
	CreateUser(input UserCreateInput) (*models.User, error)
}

type UserCreateService struct {
	repo IRepository
}

func NewService(repo IRepository) *UserCreateService {
	return &UserCreateService{
		repo: repo,
	}
}

func (service *UserCreateService) CreateUser(input UserCreateInput) (*models.User, error) {
	user, err := service.repo.CreateUser(input)
	if err != nil {
		return nil, err
	}

	return user, nil
}
