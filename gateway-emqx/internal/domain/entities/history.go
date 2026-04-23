package entities

type History struct {
	ID          int64  `json:"id"`
	Observation string `json:"observation"`
	Type        string `json:"type"`
	Username    string `json:"username"`
	Topic       string `json:"topic"`
	CreatedAt   string `json:"created_at"`
	UpdateAt    string `json:"update_at"`
}
