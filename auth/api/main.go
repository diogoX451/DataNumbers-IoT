package main

import (
	"log"

	tokenVerifyRoute "github.com/data_numbers/api/routes/token/verify"
	topicsRouter "github.com/data_numbers/api/routes/topics/create"
	userCreateRoute "github.com/data_numbers/api/routes/user/create"
	userLoginRoute "github.com/data_numbers/api/routes/user/login"
	userUpdateRoute "github.com/data_numbers/api/routes/user/update"
	"github.com/data_numbers/internal/database"
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
	api := router.Group("/auth")

	// gin.SetMode(gin.ReleaseMode)

	userCreateRoute.InitCreateUserRouter(dbConnect, api)
	userLoginRoute.InitLoginRoutes(dbConnect, api)
	userUpdateRoute.InitUpdateRoutes(dbConnect, api)
	tokenVerifyRoute.InitVerifyTokenRoutes(dbConnect, api)
	topicsRouter.InitCreateTopics(dbConnect, api)

	router.Run(":3000")
}
