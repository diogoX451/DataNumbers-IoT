package token

import (
	"crypto/rsa"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWT struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
}

func NewJWT() *JWT {
	privateKeyPath := os.Getenv("JWT_PRIVATE_KEY_PATH")
	if privateKeyPath == "" {
		privateKeyPath = "private_key.pem"
	}
	privateBytes, err := os.ReadFile(privateKeyPath)
	if err != nil {
		panic(err)
	}

	privateKey, err := jwt.ParseRSAPrivateKeyFromPEM(privateBytes)
	if err != nil {
		panic(err)
	}

	publicKeyPath := os.Getenv("JWT_PUBLIC_KEY_PATH")
	if publicKeyPath == "" {
		publicKeyPath = "public_key.pem"
	}
	publicBytes, err := os.ReadFile(publicKeyPath)
	if err != nil {
		panic(err)
	}

	publicKey, err := jwt.ParseRSAPublicKeyFromPEM(publicBytes)
	if err != nil {
		panic(err)
	}

	return &JWT{
		privateKey: privateKey,
		publicKey:  publicKey,
	}
}

type TokenData struct {
	UserID   string `json:"user_id"`
	TenantID string `json:"tenant_id"`
}

func (j JWT) GenerateToken(content TokenData) (string, error) {

	now := time.Now().UTC()

	claims := make(jwt.MapClaims)
	claims["data"] = content
	claims["exp"] = now.Add(time.Hour * 24).Unix()
	claims["iat"] = now.Unix()
	claims["iss"] = "data_numbers"
	claims["nbf"] = now.Unix()

	token, err := jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(j.privateKey)

	if err != nil {
		return "", err
	}

	return token, nil
}

func (j JWT) ValidateToken(token string) (*TokenData, error) {

	claims := jwt.MapClaims{}

	_, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		return j.publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	dataMap, ok := claims["data"].(map[string]interface{})
	if !ok {
		return nil, jwt.ErrInvalidKey
	}

	return &TokenData{
		UserID:   dataMap["user_id"].(string),
		TenantID: dataMap["tenant_id"].(string),
	}, nil

}
