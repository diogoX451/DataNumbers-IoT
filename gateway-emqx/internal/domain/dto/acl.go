package dto

type CreateAcl struct {
	TenantID   string `json:"tenant_id"`
	Username   string `json:"username"`
	Action     string `json:"action"`
	Topic      string `json:"topic"`
	Permission string `json:"permission"`
}
