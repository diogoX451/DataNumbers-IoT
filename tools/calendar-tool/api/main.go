package main

import (
	"log"
	"net/http"
	"os"

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

	publisher := broker.NewEventPublisher(nc)
	userRepo := repository.NewUserRepository()

	calendarSvc := services.NewCalendarService(userRepo, publisher, oauthCfg)
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
