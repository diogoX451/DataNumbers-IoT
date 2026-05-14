package routes

import (
	"log"

	"github.com/diogoX451/gateway-broker/internal/domain/dto"
	"github.com/diogoX451/gateway-broker/internal/interfaces"
)

func routerAcl(group interfaces.IGroupRoute, service interfaces.IAclsService) {
	group.Post("/create-acl", func(i interfaces.IContext) {
		var data dto.CreateAcl

		if err := i.BindJSON(&data); err != nil {
			log.Printf("Error binding json: %v", err)
			i.JSON(400, err)
			return
		}

		if service == nil {
			i.JSON(500, "service is nil")
		}

		if err := service.CreateAcl(data); err != nil {
			log.Printf("Error creating acl: %v", err)
			i.JSON(500, map[string]string{"error": err.Error()})
			return
		}

		i.JSON(201, map[string]string{"status": "acl created"})
	})
}
