package userLoginRoute

import (
	userlogin "github.com/data_numbers/internal/controllers/user/login"
	userHandler "github.com/data_numbers/internal/handlers/user/login"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InitLoginRoutes(db *gorm.DB, route *gin.RouterGroup) {

	loginRepository := userlogin.NewRepository(db)
	loginService := userlogin.NewService(loginRepository)
	loginHandler := userHandler.NewLoginUserHandler(loginService)

	route.POST("/login", loginHandler.LoginUser)
}
