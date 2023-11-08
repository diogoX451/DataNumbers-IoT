package tokenVerifyRoute

import (
	"github.com/data_numbers/internal/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InitVerifyTokenRoutes(db *gorm.DB, route *gin.RouterGroup) {
	route.Use(middleware.Verify())
	route.GET("/verify-token")
}
