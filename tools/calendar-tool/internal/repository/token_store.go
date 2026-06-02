package repository

import (
	"fmt"
	"sync"

	"golang.org/x/oauth2"
)

type TokenStore struct {
	mu     sync.RWMutex
	tokens map[string]*oauth2.Token
}

func NewTokenStore() *TokenStore {
	return &TokenStore{tokens: make(map[string]*oauth2.Token)}
}

func (s *TokenStore) SetToken(userID string, token *oauth2.Token) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tokens[userID] = token
}

func (s *TokenStore) GetUserCalendarToken(userID string) (*oauth2.Token, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	token, ok := s.tokens[userID]
	if !ok {
		return nil, fmt.Errorf("no token for user %s", userID)
	}
	return token, nil
}
