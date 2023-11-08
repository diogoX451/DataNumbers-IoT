package userHandler

import (
	"context"
	"net/http"

	"github.com/data_numbers/internal/config"
	userlogin "github.com/data_numbers/internal/controllers/user/login"
	token "github.com/data_numbers/pkg"
	"github.com/data_numbers/pkg/utils"
	"github.com/gin-gonic/gin"
)

type LoginUserHandler struct {
	service userlogin.ILoginService
}

func NewLoginUserHandler(service userlogin.ILoginService) *LoginUserHandler {
	return &LoginUserHandler{
		service: service,
	}
}

func (handler *LoginUserHandler) LoginUser(ctx *gin.Context) {
	var login userlogin.LoginInput

	if err := ctx.ShouldBindJSON(&login); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	user, status := handler.service.Login(login)

	switch status {
	case http.StatusNotFound:
		utils.APIResponse(ctx, "error", http.StatusNotFound, "Email not found", nil)
		return
	case http.StatusUnauthorized:
		utils.APIResponse(ctx, "error", http.StatusUnauthorized, "Password is incorrect", nil)
		return

	case http.StatusOK:
		tk := token.NewJWT()
		hash, err := tk.GenerateToken(user.ID)
		if err != nil {
			utils.APIResponse(ctx, "error", http.StatusInternalServerError, "Something went wrong", nil)
			return
		}

		go func() {
			conf := config.NewRedis()
			client := conf.Client()
			client.Set(context.Background(), user.ID.String(), hash, 0)
		}()

		utils.APIResponse(ctx, "success", http.StatusOK, "Login success", gin.H{"token": hash})
	}

}
