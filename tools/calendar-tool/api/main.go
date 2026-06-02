package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"data_numbers/internal/broker"
	"data_numbers/internal/handlers"
	"data_numbers/internal/repository"
	"data_numbers/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	"github.com/nats-io/nats.go"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googlecalendar "google.golang.org/api/calendar/v3"
)

type tokenPayload struct {
	UserID       string    `json:"user_id"`
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	Expiry       time.Time `json:"expiry"`
}

func main() {
	_ = godotenv.Load()

	natsURL := os.Getenv("NATS_URL")
	if natsURL == "" {
		natsURL = nats.DefaultURL
	}

	nc, err := nats.Connect(natsURL)
	if err != nil {
		log.Fatalf("nats connect: %v", err)
	}
	defer nc.Close()

	oauthCfg := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{googlecalendar.CalendarScope},
		Endpoint:     google.Endpoint,
	}

	tokenStore := repository.NewTokenStore()

	tokenSubject := os.Getenv("NATS_TOKEN_SUBJECT")
	if tokenSubject == "" {
		log.Fatal("NATS_TOKEN_SUBJECT is required")
	}
	if _, err := nc.Subscribe(tokenSubject, func(msg *nats.Msg) {
		var p tokenPayload
		if err := json.Unmarshal(msg.Data, &p); err != nil {
			log.Printf("token subscription: invalid payload: %v", err)
			return
		}
		tokenStore.SetToken(p.UserID, &oauth2.Token{
			AccessToken:  p.AccessToken,
			RefreshToken: p.RefreshToken,
			TokenType:    p.TokenType,
			Expiry:       p.Expiry,
		})
		log.Printf("token updated for user %s", p.UserID)
	}); err != nil {
		log.Fatalf("nats subscribe %s: %v", tokenSubject, err)
	}

	publisher := broker.NewEventPublisher(nc)

	calendarSvc := services.NewCalendarService(tokenStore, publisher, oauthCfg)
	authSvc := services.NewAuthService(oauthCfg)
	notifSvc := services.NewNotificationService(publisher)

	eventHandler := handlers.NewEventHandler(calendarSvc)
	authHandler := handlers.NewAuthHandler(authSvc)
	calendarHandler := handlers.NewCalendarHandler(notifSvc)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Post("/events", eventHandler.Create)
	r.Put("/events/{id}", eventHandler.Update)
	r.Delete("/events/{id}", eventHandler.Delete)

	r.Get("/auth/login", authHandler.Login)
	r.Get("/auth/callback", authHandler.Callback)

	r.Post("/webhook/google-calendar", calendarHandler.Webhook)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}
