package topicsRouter

import (
	"github.com/data_numbers/internal/controllers/topics"
	topicsHandler "github.com/data_numbers/internal/handlers/topics/create"
	"github.com/data_numbers/internal/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InitCreateTopics(db *gorm.DB, route *gin.RouterGroup) {
	createMqttRepo := topics.NewTopicsRepository(db)
	createMqttService := topics.NewService(createMqttRepo)
	createHandler := topicsHandler.NewCreateTopicHandler(createMqttService)

	route.Use(middleware.Auth())

	route.POST("/topics-create", createHandler.CreateTopic)
}
