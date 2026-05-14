package main

import (
	"log"
	"os"
	"strings"

	tokenRefreshRoute "github.com/data_numbers/api/routes/token/refresh"
	tokenVerifyRoute "github.com/data_numbers/api/routes/token/verify"
	checkusernameRouter "github.com/data_numbers/api/routes/user/check-username"
	userCreateRoute "github.com/data_numbers/api/routes/user/create"
	userLoginRoute "github.com/data_numbers/api/routes/user/login"
	userUpdateRoute "github.com/data_numbers/api/routes/user/update"
	userfindRoutes "github.com/data_numbers/api/routes/user/user-find"
	"github.com/data_numbers/internal/database"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

var dbConnect *gorm.DB

func init() {

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found", err)
	}

	db := &database.Postgres{}
	dbConnect = db.Connect()
}

func main() {
	router := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = corsAllowedOrigins()
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowCredentials = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	router.Use(cors.New(config))

	api := router.Group("/auth")
	// gin.SetMode(gin.ReleaseMode)

	userCreateRoute.InitCreateUserRouter(dbConnect, api)
	checkusernameRouter.InitCheckUsernameRouter(dbConnect, api)
	userLoginRoute.InitLoginRoutes(dbConnect, api)
	userUpdateRoute.InitUpdateRoutes(dbConnect, api)
	tokenVerifyRoute.InitVerifyTokenRoutes(dbConnect, api)
	tokenRefreshRoute.InitRefreshTokenRoutes(dbConnect, api)
	userfindRoutes.InitUserFindRoutes(dbConnect, api)

	router.Run(":3000")
}

func corsAllowedOrigins() []string {
	raw := os.Getenv("CORS_ALLOWED_ORIGINS")
	if raw == "" {
		return []string{"http://localhost:3000", "http://localhost:8080"}
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
