package userlogin

import (
	"net/http"

	"github.com/data_numbers/internal/models"
	"github.com/data_numbers/pkg/utils"
	"gorm.io/gorm"
)

type ILoginRepository interface {
	Login(input *models.User) (*models.User, int)
}

type LoginRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *LoginRepository {
	return &LoginRepository{
		db: db,
	}
}

func (repo *LoginRepository) Login(input *models.User) (*models.User, int) {
	var user models.User
	if err := repo.db.Where("email = ?", input.Email).First(&user).Error; err != nil {
		return nil, http.StatusNotFound
	}

	if err := utils.ComparePassword(user.Password, input.Password); err != nil {
		return nil, http.StatusUnauthorized
	}

	return &user, http.StatusOK
}
