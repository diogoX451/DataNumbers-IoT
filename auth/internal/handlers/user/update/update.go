package userHandler

import (
	"net/http"

	userUpdate "github.com/data_numbers/internal/controllers/user/user-update"
	"github.com/data_numbers/pkg/utils"
	"github.com/gin-gonic/gin"
)

type UpdateHandler struct {
	service userUpdate.IUserUpdateService
}

func NewUpdateHandler(service userUpdate.IUserUpdateService) *UpdateHandler {
	return &UpdateHandler{
		service: service,
	}
}

func (handler *UpdateHandler) UpdateUser(ctx *gin.Context) {
	var update userUpdate.UserUpdateInput
	userId := ctx.MustGet("userId").(string)

	if err := ctx.ShouldBindJSON(&update); err != nil {
		utils.APIResponse(ctx, "error", 400, err.Error(), nil)
		return
	}

	status := handler.service.UpdateUser(update, userId)

	switch status {
	case http.StatusNotFound:
		utils.APIResponse(ctx, "error", http.StatusNotFound, "User not found", nil)
		return

	case http.StatusOK:
		utils.APIResponse(ctx, "success", http.StatusOK, "User updated", nil)
		return
	}

}
