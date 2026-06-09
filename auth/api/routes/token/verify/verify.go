package tokenVerifyRoute

import (
	"net/http"

	"github.com/data_numbers/internal/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InitVerifyTokenRoutes(_ *gorm.DB, route *gin.RouterGroup) {
	// Middleware Verify por rota (não no grupo /auth).
	route.GET("/verify-token", middleware.Verify(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"valid": true})
	})
}
