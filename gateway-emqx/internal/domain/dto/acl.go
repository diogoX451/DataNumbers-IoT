package dto

type CreateAcl struct {
	Username   string `json:"username"`
	Action     string `json:"action"`
	Topic      string `json:"topic"`
	Permission string `json:"permission"`
}
