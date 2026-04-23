package topicsHandler

import (
	"github.com/data_numbers/internal/controllers/topics"
	"github.com/gin-gonic/gin"
)

type CreateTopicHandler struct {
	service topics.ITopicsService
}

func NewCreateTopicHandler(service topics.ITopicsService) *CreateTopicHandler {
	return &CreateTopicHandler{service: service}
}

func (h *CreateTopicHandler) CreateTopic(ctx *gin.Context) {
	var input topics.TopicsInput

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	create, err := h.service.CreateMqttAcl(input)
	if err != nil {
		ctx.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(200, gin.H{"data": create})
}
