package routes

import (
	"log"

	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

func routerHistorys(group interfaces.IGroupRoute, service interfaces.IHistoryService) {
	group.Get("/historys", func(i interfaces.IContext) {
		if service == nil {
			i.JSON(500, map[string]string{"error": "history service unavailable"})
			return
		}
		items, err := service.List()
		if err != nil {
			log.Printf("list historys: %v", err)
			i.JSON(500, map[string]string{"error": err.Error()})
			return
		}
		i.JSON(200, map[string]any{"data": items})
	})
}
