package userHandler

import (
	"github.com/data_numbers/internal/controllers/topics"
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

	mqttAcl := topics.TopicsInput{
		Ipaddr: ctx.ClientIP(),
	}

	user, err := handler.service.CreateUser(input, mqttAcl)

	if err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(200, gin.H{"data": user})
}
