package userUpdateRoute

import (
	userUpdate "github.com/data_numbers/internal/controllers/user/user-update"
	userHandler "github.com/data_numbers/internal/handlers/user/update"
	"github.com/data_numbers/internal/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InitUpdateRoutes(db *gorm.DB, route *gin.RouterGroup) {

	updateRepo := userUpdate.NewRepository(db)
	updateService := userUpdate.NewService(updateRepo)
	updateHandler := userHandler.NewUpdateHandler(updateService)

	route.Use(middleware.Auth())
	
	route.PUT("/update-user", updateHandler.UpdateUser)
}
