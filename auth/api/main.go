package main

import (
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
		panic("Not sure how to load")
	}

	db := &database.Postgres{}
	dbConnect = db.Connect()

}

func main() {
	router := gin.Default()
	api := router.Group("/api")

	gin.SetMode(gin.DebugMode)

	userCreateRoute.InitCreateUserRouter(dbConnect, api)
	userLoginRoute.InitLoginRoutes(dbConnect, api)
	userUpdateRoute.InitUpdateRoutes(dbConnect, api)

	router.Run(":3000")
}
