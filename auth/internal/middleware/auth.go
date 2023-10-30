package middleware

import (
	"net/http"
	"strings"

	token "github.com/data_numbers/pkg"
	"github.com/gin-gonic/gin"
)

type Unauthorized struct {
	Status  string `json:"status"`
	Code    int    `json:"code"`
	Method  string `json:"method"`
	Message string `json:"message"`
}

func Auth() gin.HandlerFunc {
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
		claims, err := tk.ValidateToken(requestToken)
		if err != nil {
			error.Message = err.Error()
			ctx.JSON(http.StatusUnauthorized, error)
			ctx.Abort()
			return
		}

		ctx.Set("userId", claims)
		ctx.Next()
	}
}
