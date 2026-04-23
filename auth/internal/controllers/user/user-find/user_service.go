package userfind

import "github.com/data_numbers/internal/models"

type IUserFindService interface {
	GetUser(id string) (*models.User, error)
}

type UserFindService struct {
	repo IUserFindRepository
}

func NewUserFindService(repo IUserFindRepository) *UserFindService {
	return &UserFindService{
		repo: repo,
	}
}

func (service *UserFindService) GetUser(id string) (*models.User, error) {
	user, err := service.repo.GetUser(id)

	if err != nil {
		return nil, err
	}

	return user, nil
}
