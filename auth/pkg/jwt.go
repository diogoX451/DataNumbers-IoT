package token

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWT struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
}

var (
	jwtOnce     sync.Once
	cachedJWT   *JWT
	cachedErr   error
)

// loadJWT lê as chaves uma única vez por processo e devolve erros em vez de
// derrubar o serviço inteiro.
func loadJWT() (*JWT, error) {
	jwtOnce.Do(func() {
		privateKeyPath := os.Getenv("JWT_PRIVATE_KEY_PATH")
		if privateKeyPath == "" {
			privateKeyPath = "private_key.pem"
		}
		privateBytes, err := os.ReadFile(privateKeyPath)
		if err != nil {
			cachedErr = fmt.Errorf("read private key %s: %w", privateKeyPath, err)
			return
		}
		privateKey, err := jwt.ParseRSAPrivateKeyFromPEM(privateBytes)
		if err != nil {
			cachedErr = fmt.Errorf("parse private key: %w", err)
			return
		}

		publicKeyPath := os.Getenv("JWT_PUBLIC_KEY_PATH")
		if publicKeyPath == "" {
			publicKeyPath = "public_key.pem"
		}
		publicBytes, err := os.ReadFile(publicKeyPath)
		if err != nil {
			cachedErr = fmt.Errorf("read public key %s: %w", publicKeyPath, err)
			return
		}
		publicKey, err := jwt.ParseRSAPublicKeyFromPEM(publicBytes)
		if err != nil {
			cachedErr = fmt.Errorf("parse public key: %w", err)
			return
		}

		cachedJWT = &JWT{privateKey: privateKey, publicKey: publicKey}
	})
	return cachedJWT, cachedErr
}

// NewJWT mantém a API original. Em caso de falha de leitura/parse das chaves
// retorna um wrapper "vazio" cujas operações devolvem erro — o caller decide
// como reagir (HTTP 500), sem panic.
func NewJWT() *JWT {
	j, err := loadJWT()
	if err != nil {
		return &JWT{}
	}
	return j
}

type TokenData struct {
	UserID   string `json:"user_id"`
	TenantID string `json:"tenant_id"`
}

var errJWTNotInitialized = errors.New("jwt keys not initialized")

func (j JWT) GenerateToken(content TokenData) (string, error) {
	return j.generate(content, "access", 24*time.Hour)
}

// GenerateRefreshToken emite um token de TTL longo, marcado como "refresh".
// O refresh nunca é aceito pelas APIs protegidas (middleware checa typ);
// só serve para chamar /auth/refresh e obter novo access token.
func (j JWT) GenerateRefreshToken(content TokenData) (string, error) {
	return j.generate(content, "refresh", 30*24*time.Hour)
}

func (j JWT) generate(content TokenData, typ string, ttl time.Duration) (string, error) {
	if j.privateKey == nil {
		if _, err := loadJWT(); err != nil {
			return "", err
		}
		return "", errJWTNotInitialized
	}

	now := time.Now().UTC()

	claims := make(jwt.MapClaims)
	claims["data"] = content
	claims["typ"] = typ
	claims["jti"] = newJTI() // garante que tokens emitidos no mesmo segundo são distintos
	claims["exp"] = now.Add(ttl).Unix()
	claims["iat"] = now.Unix()
	claims["iss"] = "data_numbers"
	claims["nbf"] = now.Unix()

	return jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(j.privateKey)
}

func newJTI() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func (j JWT) ValidateToken(token string) (*TokenData, error) {
	return j.validate(token, "access")
}

// ValidateRefreshToken só aceita tokens com typ=refresh.
func (j JWT) ValidateRefreshToken(token string) (*TokenData, error) {
	return j.validate(token, "refresh")
}

func (j JWT) validate(token, expectedType string) (*TokenData, error) {
	if j.publicKey == nil {
		if _, err := loadJWT(); err != nil {
			return nil, err
		}
		return nil, errJWTNotInitialized
	}

	claims := jwt.MapClaims{}
	if _, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (interface{}, error) {
		return j.publicKey, nil
	}); err != nil {
		return nil, err
	}

	typ, _ := claims["typ"].(string)
	// Mantém compat com tokens antigos sem "typ" tratando-os como access.
	if typ == "" {
		typ = "access"
	}
	if typ != expectedType {
		return nil, fmt.Errorf("expected %s token, got %s", expectedType, typ)
	}

	dataMap, ok := claims["data"].(map[string]interface{})
	if !ok {
		return nil, jwt.ErrInvalidKey
	}

	userID, _ := dataMap["user_id"].(string)
	tenantID, _ := dataMap["tenant_id"].(string)
	if userID == "" || tenantID == "" {
		return nil, errors.New("invalid token data")
	}

	return &TokenData{UserID: userID, TenantID: tenantID}, nil
}
