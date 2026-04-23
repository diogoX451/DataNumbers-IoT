package entities

type Acl struct {
	ID         int64  `json:"id"`
	Username   string `json:"username"`
	Action     string `json:"action"`
	Topic      string `json:"topic"`
	Permission string `json:"permission"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}
