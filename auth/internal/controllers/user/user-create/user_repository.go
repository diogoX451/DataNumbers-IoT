package usercreate

import (
	"github.com/data_numbers/internal/models"
	"gorm.io/gorm"
)

type IRepository interface {
	CreateUser(input UserCreateInput) (*models.User, error)
	CreateMqttAcl(input UserMqttAclInput) (*models.MqttAcl, error)
	GetUser(id string) (*models.User, error)
}

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{
		db: db,
	}
}

func (repo *Repository) CreateUser(input UserCreateInput) (*models.User, error) {
	user := models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: input.Password,
		Username: input.Username,
	}

	if err := repo.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func (repo *Repository) GetUser(id string) (*models.User, error) {
	var user models.User

	if err := repo.db.Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func (repo *Repository) CreateMqttAcl(input UserMqttAclInput) (*models.MqttAcl, error) {
	mqttAcl := models.MqttAcl{
		Ipaddr:  input.Ipaddr,
		User_id: input.UserId,
	}

	if err := repo.db.Create(&mqttAcl).Error; err != nil {
		return nil, err
	}

	return &mqttAcl, nil
}
