package checkusernameRouter

import (
	checkusername "github.com/data_numbers/internal/controllers/user/check-username"
	checkusernameHandler "github.com/data_numbers/internal/handlers/user/check-username"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InitCheckUsernameRouter(db *gorm.DB, route *gin.RouterGroup) {
	checkUsernameRepo := checkusername.NewRepository(db)
	checkUsernameService := checkusername.NewCheckUsernameService(checkUsernameRepo)
	checkUsernameHandler := checkusernameHandler.NewCheckUsernameHandler(checkUsernameService)

	route.POST("/check-username", checkUsernameHandler.CheckUsername)
}
