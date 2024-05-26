package checkusername

type CheckUsernameInput struct {
	Username string `json:"username" validate:"required"`
}
