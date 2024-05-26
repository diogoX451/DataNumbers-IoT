package userfindRoutes

import (
	userfind "github.com/data_numbers/internal/controllers/user/user-find"
	userfindHandler "github.com/data_numbers/internal/handlers/user/find"
	"github.com/data_numbers/internal/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InitUserFindRoutes(db *gorm.DB, route *gin.RouterGroup) {
	route.Use(middleware.Auth())

	userFindRepo := userfind.NewUserFindRepository(db)
	userFindService := userfind.NewUserFindService(userFindRepo)
	userFindHandler := userfindHandler.NewFindUserHandler(userFindService)

	route.GET("/find-user", userFindHandler.GetUser)
}
