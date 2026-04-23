package topics

import (
	"github.com/data_numbers/internal/models"
	"gorm.io/gorm"
)

type ITopicsRepository interface {
	CreateMqttAcl(input TopicsInput) (*models.MqttAcl, error)
}

type TopicsRepository struct {
	db *gorm.DB
}

func NewTopicsRepository(db *gorm.DB) *TopicsRepository {
	return &TopicsRepository{
		db: db,
	}
}

func (repo *TopicsRepository) CreateMqttAcl(input TopicsInput) (*models.MqttAcl, error) {
	mqttAcl := models.MqttAcl{
		Ipaddr:  input.Ipaddr,
		User_id: input.UserId,
		Name:    input.Name,
	}

	if err := repo.db.Create(&mqttAcl).Error; err != nil {
		return nil, err
	}

	return &mqttAcl, nil
}
