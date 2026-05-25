package userCreateRoute

import (
	usercreate "github.com/data_numbers/internal/controllers/user/user-create"
	userHandler "github.com/data_numbers/internal/handlers/user/create"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InitCreateUserRouter(db *gorm.DB, route *gin.RouterGroup) {
	createUserRepo := usercreate.NewRepository(db)
	createUserService := usercreate.NewService(createUserRepo)
	createUserHandler := userHandler.NewCreateUserHandler(createUserService)

	route.POST("/register-user", createUserHandler.CreateUser)
}
