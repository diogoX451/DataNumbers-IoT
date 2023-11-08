package userUpdate

import "github.com/data_numbers/internal/models"

type IUserUpdateService interface {
	UpdateUser(input UserUpdateInput, userId string) int
}

type UserUpdateService struct {
	repo IUserUpdateRepository
}

func NewService(repo IUserUpdateRepository) *UserUpdateService {
	return &UserUpdateService{
		repo: repo,
	}
}

func (service *UserUpdateService) UpdateUser(input UserUpdateInput, userId string) int {
	userEntity := models.User{
		Name:  input.Name,
		Email: input.Email,
	}

	return service.repo.UpdateUser(&userEntity, userId)
}
