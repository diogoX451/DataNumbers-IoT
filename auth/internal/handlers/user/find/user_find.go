package userfindHandler

import (
	userfind "github.com/data_numbers/internal/controllers/user/user-find"
	"github.com/gin-gonic/gin"
)

type FindUserHandler struct {
	service userfind.IUserFindService
}

func NewFindUserHandler(service userfind.IUserFindService) *FindUserHandler {
	return &FindUserHandler{
		service: service,
	}
}

func (handler *FindUserHandler) GetUser(ctx *gin.Context) {
	userId := ctx.MustGet("userId").(string)

	user, err := handler.service.GetUser(userId)

	if err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(200, gin.H{"data": user})
}
