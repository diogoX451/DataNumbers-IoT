package tokenRefreshRoute

import (
	refreshHandler "github.com/data_numbers/internal/handlers/token/refresh"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InitRefreshTokenRoutes(_ *gorm.DB, route *gin.RouterGroup) {
	route.POST("/refresh", refreshHandler.Refresh)
}
