package services

import (
	"context"
	"database/sql"
	"sync"
	"time"

	"golang.org/x/oauth2"
)

// TokenStore persiste o token OAuth2 do Google Calendar por tenant em
// automation.calendar_oauth_tokens. Presença de linha == tenant conectado.
type TokenStore struct {
	db *sql.DB
}

func NewTokenStore(db *sql.DB) *TokenStore {
	return &TokenStore{db: db}
}

func (s *TokenStore) Get(ctx context.Context, tenantID string) (*oauth2.Token, error) {
	var tok oauth2.Token
	err := s.db.QueryRowContext(ctx, `
		SELECT access_token, refresh_token, token_type, expiry
		FROM automation.calendar_oauth_tokens
		WHERE tenant_id = $1
	`, tenantID).Scan(&tok.AccessToken, &tok.RefreshToken, &tok.TokenType, &tok.Expiry)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &tok, nil
}

func (s *TokenStore) Save(ctx context.Context, tenantID string, tok *oauth2.Token) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO automation.calendar_oauth_tokens (tenant_id, access_token, refresh_token, token_type, expiry)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (tenant_id) DO UPDATE SET
			access_token = EXCLUDED.access_token,
			refresh_token = EXCLUDED.refresh_token,
			token_type = EXCLUDED.token_type,
			expiry = EXCLUDED.expiry,
			updated_at = now()
	`, tenantID, tok.AccessToken, tok.RefreshToken, tok.TokenType, tok.Expiry)
	return err
}

func (s *TokenStore) Delete(ctx context.Context, tenantID string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM automation.calendar_oauth_tokens WHERE tenant_id = $1`, tenantID)
	return err
}

// PendingOAuthStates guarda o mapeamento state (CSRF token do fluxo OAuth) →
// tenant_id enquanto o usuário está no consent screen do Google. Em memória
// porque o fluxo é curto (minutos); se calendar-tool rodar com múltiplas
// réplicas, mover isso pra Redis (mesmo padrão já usado no gateway-emqx).
type PendingStates struct {
	mu     sync.Mutex
	states map[string]stateEntry
}

type stateEntry struct {
	tenantID  string
	expiresAt time.Time
}

func NewPendingStates() *PendingStates {
	return &PendingStates{states: make(map[string]stateEntry)}
}

func (p *PendingStates) Put(state, tenantID string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.states[state] = stateEntry{tenantID: tenantID, expiresAt: time.Now().Add(10 * time.Minute)}
}

// Take retorna o tenant_id do state e o remove (uso único). ok=false se o
// state não existe ou expirou.
func (p *PendingStates) Take(state string) (tenantID string, ok bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	entry, found := p.states[state]
	delete(p.states, state)
	if !found || time.Now().After(entry.expiresAt) {
		return "", false
	}
	return entry.tenantID, true
}
