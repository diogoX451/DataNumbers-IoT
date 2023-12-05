package topics

import "github.com/gofrs/uuid"

type TopicsInput struct {
	Name   string    `json:"name"`
	Ipaddr string    `json:"ipaddr" validate:"required"`
	UserId uuid.UUID `json:"user_id" validate:"required"`
}
