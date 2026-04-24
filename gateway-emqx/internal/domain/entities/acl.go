package entities

type Acl struct {
	ID         string `json:"id"`
	TenantID   string `json:"tenant_id"`
	Username   string `json:"username"`
	Action     string `json:"action"`
	Topic      string `json:"topic"`
	Permission string `json:"permission"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}
