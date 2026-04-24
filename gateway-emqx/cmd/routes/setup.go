package routes

import "github.com/diogoX451/gateway-broker/internal/interfaces"

type Routes struct {
	ServiceAcl interfaces.IAclsService
	Db         interfaces.IConn
	Router     interfaces.ITransportConn
}

func (r *Routes) SetupRoutes(router interfaces.ITransportConn) {
	group := router.GroupRoute("/api")
	routerAcl(group, r.ServiceAcl)
}
