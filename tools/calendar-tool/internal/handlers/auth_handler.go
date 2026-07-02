package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"data_numbers/internal/services"

	"golang.org/x/oauth2"
)

// AuthHandler expõe o fluxo de conexão com o Google Calendar por tenant:
// StartLogin (autenticado) gera a URL de consentimento, Callback (público —
// é o Google que chama) troca o code por token e persiste via TokenStore.
type AuthHandler struct {
	oauthCfg    *oauth2.Config
	tokens      *services.TokenStore
	states      *services.PendingStates
	frontendURL string
}

func NewAuthHandler(oauthCfg *oauth2.Config, tokens *services.TokenStore, states *services.PendingStates, frontendURL string) *AuthHandler {
	return &AuthHandler{oauthCfg: oauthCfg, tokens: tokens, states: states, frontendURL: frontendURL}
}

func (h *AuthHandler) StartLogin(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := tenantIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing tenant")
		return
	}

	var raw [16]byte
	if _, err := rand.Read(raw[:]); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	state := hex.EncodeToString(raw[:])
	h.states.Put(state, tenantID)

	url := h.oauthCfg.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	writeJSON(w, http.StatusOK, map[string]string{"auth_url": url})
}

func (h *AuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	state := q.Get("state")
	code := q.Get("code")

	tenantID, ok := h.states.Take(state)
	if !ok || code == "" {
		http.Redirect(w, r, h.frontendURL+"/settings?google=error", http.StatusFound)
		return
	}

	tok, err := h.oauthCfg.Exchange(r.Context(), code)
	if err != nil {
		http.Redirect(w, r, h.frontendURL+"/settings?google=error", http.StatusFound)
		return
	}

	if err := h.tokens.Save(r.Context(), tenantID, tok); err != nil {
		http.Redirect(w, r, h.frontendURL+"/settings?google=error", http.StatusFound)
		return
	}

	http.Redirect(w, r, h.frontendURL+"/settings?google=connected", http.StatusFound)
}

func (h *AuthHandler) Status(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := tenantIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing tenant")
		return
	}

	tok, err := h.tokens.Get(r.Context(), tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"connected": tok != nil})
}

func (h *AuthHandler) Disconnect(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := tenantIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing tenant")
		return
	}
	if err := h.tokens.Delete(r.Context(), tenantID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
