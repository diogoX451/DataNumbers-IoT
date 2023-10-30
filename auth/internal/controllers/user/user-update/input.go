package userUpdate

type UserUpdateInput struct {
	Name  string `json:"name" validate:"required"`
	Email string `json:"email" validate:"required"`
}
