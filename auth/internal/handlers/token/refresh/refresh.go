package refreshHandler

import (
	"context"
	"net/http"
	"time"

	"github.com/data_numbers/internal/config"
	token "github.com/data_numbers/pkg"
	"github.com/data_numbers/pkg/utils"
	"github.com/gin-gonic/gin"
)

type RefreshInput struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

const (
	accessTTL  = 24 * time.Hour
	refreshTTL = 30 * 24 * time.Hour
)

func Refresh(ctx *gin.Context) {
	var input RefreshInput
	if err := ctx.ShouldBindJSON(&input); err != nil {
		utils.APIResponse(ctx, "error", http.StatusBadRequest, err.Error(), nil)
		return
	}

	tk := token.NewJWT()
	data, err := tk.ValidateRefreshToken(input.RefreshToken)
	if err != nil {
		utils.APIResponse(ctx, "error", http.StatusUnauthorized, "invalid refresh token", nil)
		return
	}

	conf := config.NewRedis()
	client := conf.Client()
	cctx := context.Background()

	// Garante que o refresh ainda está em vigor no Redis (não foi revogado).
	stored, err := client.Get(cctx, "refresh:"+data.UserID).Result()
	if err != nil || stored != input.RefreshToken {
		utils.APIResponse(ctx, "error", http.StatusUnauthorized, "refresh token revoked", nil)
		return
	}

	access, err := tk.GenerateToken(*data)
	if err != nil {
		utils.APIResponse(ctx, "error", http.StatusInternalServerError, "failed to mint access token", nil)
		return
	}
	// Rotação simples: emite um novo refresh e substitui o anterior.
	newRefresh, err := tk.GenerateRefreshToken(*data)
	if err != nil {
		utils.APIResponse(ctx, "error", http.StatusInternalServerError, "failed to mint refresh token", nil)
		return
	}

	client.Set(cctx, data.UserID, access, accessTTL)
	client.Set(cctx, "refresh:"+data.UserID, newRefresh, refreshTTL)

	utils.APIResponse(ctx, "success", http.StatusOK, "refreshed", gin.H{
		"token":         access,
		"refresh_token": newRefresh,
	})
}
