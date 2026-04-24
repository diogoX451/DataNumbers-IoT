package adapter

import (
	"github.com/diogoX451/gateway-broker/internal/interfaces"
	"github.com/gin-gonic/gin"
)

var _ interfaces.IGroupRoute = (*GinGroupAdapter)(nil)

type GinGroupAdapter struct {
	group *gin.RouterGroup
}

func (g *GinGroupAdapter) Get(path string, fn ...func(interfaces.IContext)) {
	g.group.GET(path, func(c *gin.Context) {
		if len(fn) > 0 {
			fn[0](NewGinContextAdapter(c))
		}
	})
}

func (g *GinGroupAdapter) Post(path string, fn ...func(interfaces.IContext)) {
	g.group.POST(path, func(c *gin.Context) {
		if len(fn) > 0 {
			fn[0](NewGinContextAdapter(c))
		}
	})
}

func (g *GinGroupAdapter) Put(path string, fn ...func(interfaces.IContext)) {
	g.group.PUT(path, func(c *gin.Context) {
		if len(fn) > 0 {
			fn[0](NewGinContextAdapter(c))
		}
	})
}

func (g *GinGroupAdapter) Delete(path string, fn ...func(interfaces.IContext)) {
	g.group.DELETE(path, func(c *gin.Context) {
		if len(fn) > 0 {
			fn[0](NewGinContextAdapter(c))
		}
	})
}
