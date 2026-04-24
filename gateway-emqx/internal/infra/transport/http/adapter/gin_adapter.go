package adapter

import (
	"fmt"

	"github.com/diogoX451/gateway-broker/internal/config"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
	"github.com/gin-gonic/gin"
)

var _ interfaces.ITransportConn = (*GinAdapter)(nil)

type GinAdapter struct {
	gin *gin.Engine
}

func (g *GinAdapter) Start() (interfaces.ITransportConn, error) {
	router := gin.Default()
	g.gin = router

	return g, nil
}

func (g *GinAdapter) GroupRoute(path string, fn ...func(interfaces.IGroupRoute)) interfaces.IGroupRoute {
	group := g.gin.Group(path)
	grp := &GinGroupAdapter{group: group}
	if len(fn) > 0 {
		fn[0](grp)
	}
	return grp
}

func (g *GinAdapter) Get(path string, fn func(*gin.Context)) {
	g.gin.GET(path, fn)
}

func (g *GinAdapter) GetPort() string {
	return config.Get("ROUTER_PORT")
}

func (g *GinAdapter) Run() error {
	var port string
	if port = g.GetPort(); port == "" {
		port = "8080"
	}
	return g.gin.Run(":" + port)
}

// SetOptions implements interfaces.ITransportConn.
func (g *GinAdapter) SetOptions(options ...interface{}) {
	panic("unimplemented")
}

// GetOptions implements interfaces.ITransportConn.
func (g *GinAdapter) GetOptions() interface{} {
	fmt.Println("Getting options")
	return nil
}
