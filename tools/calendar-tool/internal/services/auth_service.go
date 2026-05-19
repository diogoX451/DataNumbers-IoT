package services

import (
	"context"

	"golang.org/x/oauth2"
)

type AuthService struct {
	oauthCfg *oauth2.Config
}

func NewAuthService(cfg *oauth2.Config) *AuthService {
	return &AuthService{oauthCfg: cfg}
}

func (s *AuthService) GetAuthURL(state string) string {
	return s.oauthCfg.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
}

func (s *AuthService) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.oauthCfg.Exchange(ctx, code)
}
