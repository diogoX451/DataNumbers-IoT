package usercreate

import "github.com/gofrs/uuid"

type UserCreateInput struct {
	Name     string `json:"name" validate:"required"`
	Email    string `json:"email" validate:"required"`
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type UserMqttAclInput struct {
	Ipaddr string    `json:"ipaddr" validate:"required"`
	UserId uuid.UUID `json:"user_id" validate:"required"`
}
