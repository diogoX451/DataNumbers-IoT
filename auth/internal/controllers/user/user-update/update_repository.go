package userUpdate

import (
	"net/http"

	"github.com/data_numbers/internal/models"
	"gorm.io/gorm"
)

type IUserUpdateRepository interface {
	UpdateUser(input *models.User, userId string) int
}

type UserUpdateRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *UserUpdateRepository {
	return &UserUpdateRepository{
		db: db,
	}
}

func (repo *UserUpdateRepository) UpdateUser(input *models.User, userId string) int {
	var user models.User
	if err := repo.db.Where("id = ?", userId).First(&user).Error; err != nil {
		return http.StatusNotFound
	}

	if err := repo.db.Model(&user).Updates(input).Error; err != nil {
		return http.StatusInternalServerError
	}

	return http.StatusOK
}
