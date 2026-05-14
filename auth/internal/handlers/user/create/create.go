package userHandler

import (
	usercreate "github.com/data_numbers/internal/controllers/user/user-create"
	"github.com/gin-gonic/gin"
)

type CreateUserHandler struct {
	service usercreate.IUserCreateService
}

func NewCreateUserHandler(service usercreate.IUserCreateService) *CreateUserHandler {
	return &CreateUserHandler{
		service: service,
	}
}

func (handler *CreateUserHandler) CreateUser(ctx *gin.Context) {
	var input usercreate.UserCreateInput

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	user, err := handler.service.CreateUser(input)
	if err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(200, gin.H{"data": user})
}
