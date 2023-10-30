package userlogin

import "github.com/data_numbers/internal/models"

type ILoginService interface {
	Login(input LoginInput) (*models.User, int)
}

type LoginService struct {
	repo ILoginRepository
}

func NewService(repo ILoginRepository) *LoginService {
	return &LoginService{
		repo: repo,
	}
}

func (service *LoginService) Login(input LoginInput) (*models.User, int) {
	userEntity := models.User{
		Email:    input.Email,
		Password: input.Password,
	}

	return service.repo.Login(&userEntity)
}
