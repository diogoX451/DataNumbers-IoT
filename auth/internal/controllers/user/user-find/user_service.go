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


