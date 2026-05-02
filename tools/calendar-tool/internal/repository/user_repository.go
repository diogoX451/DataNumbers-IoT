package repository

import (
	"os"

	"golang.org/x/oauth2"
	_ "golang.org/x/oauth2/google"
	_ "google.golang.org/api/calendar/v3"
	_ "google.golang.org/api/option"
)

// TODO IMPLEMENT

type UserRepository struct {
}

func NewUserRepository() *UserRepository {
	return &UserRepository{}
}

func (r *UserRepository) GetUserCalendarToken(userID string) (*oauth2.Token, error) {

	// TODO Implementar pra buscar informações do banco

	return &oauth2.Token{
		AccessToken:  os.Getenv("TEMP_GOOGLE_ACCESS_TOKEN"),
		RefreshToken: os.Getenv("TEMP_GOOGLE_REFRESH_TOKEN"),
		TokenType:    "Bearer",
	}, nil

}
