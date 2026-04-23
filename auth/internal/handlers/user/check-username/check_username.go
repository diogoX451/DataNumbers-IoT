package checkusernameHandler

import (
	checkusername "github.com/data_numbers/internal/controllers/user/check-username"
	"github.com/gin-gonic/gin"
)

type CheckUsernameHandler struct {
	service checkusername.ICheckUsernameService
}

func NewCheckUsernameHandler(service checkusername.ICheckUsernameService) *CheckUsernameHandler {
	return &CheckUsernameHandler{
		service: service,
	}
}

func (handler *CheckUsernameHandler) CheckUsername(ctx *gin.Context) {
	var input checkusername.CheckUsernameInput

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	result := handler.service.CheckUsername(&input)

	ctx.JSON(200, gin.H{"data": result})
}
