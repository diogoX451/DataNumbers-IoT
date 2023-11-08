package middleware

import (
	"net/http"
	"strings"

	token "github.com/data_numbers/pkg"
	"github.com/gin-gonic/gin"
)

func Verify() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var error Unauthorized
		error.Status = "error"
		error.Code = http.StatusUnauthorized
		error.Method = ctx.Request.Method
		error.Message = "Unauthorized"

		authHeader := ctx.Request.Header.Get("Authorization")
		if authHeader == "" {
			ctx.JSON(http.StatusUnauthorized, error)
			ctx.Abort()
			return
		}

		splitToken := strings.Split(authHeader, "Bearer ")
		if len(splitToken) != 2 {
			ctx.JSON(http.StatusUnauthorized, error)
			ctx.Abort()
			return
		}
		requestToken := splitToken[1]

		tk := token.NewJWT()
		_, err := tk.ValidateToken(requestToken)
		if err != nil {
			error.Message = err.Error()
			ctx.JSON(http.StatusUnauthorized, error)
			ctx.Abort()
			return
		}

		ctx.JSON(http.StatusOK, gin.H{"status": "success", "code": http.StatusOK, "message": "Token is valid"})
	}
}
