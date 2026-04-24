package adapter

import (
	"github.com/diogoX451/gateway-broker/internal/interfaces"
	"github.com/gin-gonic/gin"
)

var _ interfaces.IContext = (*GinContextAdapter)(nil)

type GinContextAdapter struct {
	ctx *gin.Context
}

func NewGinContextAdapter(ctx *gin.Context) *GinContextAdapter {
	return &GinContextAdapter{ctx: ctx}
}

func (g *GinContextAdapter) JSON(code int, obj interface{}) {
	g.ctx.JSON(code, obj)
}

func (g *GinContextAdapter) BindJSON(obj interface{}) error {
	return g.ctx.BindJSON(obj)
}

func (g *GinContextAdapter) Param(key string) string {
	return g.ctx.Param(key)
}
