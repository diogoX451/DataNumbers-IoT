package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"data_numbers/internal/broker"
	"data_numbers/internal/handlers"
	"data_numbers/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/nats-io/nats.go"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googlecalendar "google.golang.org/api/calendar/v3"
)

type tokenPayload struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	Expiry       time.Time `json:"expiry"`
}

type createEventCommand struct {
	Token       tokenPayload `json:"token"`
	Summary     string       `json:"summary"`
	Location    string       `json:"location,omitempty"`
	Description string       `json:"description,omitempty"`
	Start       string       `json:"start"`
	End         string       `json:"end"`
	Recurrence  []string     `json:"recurrence,omitempty"`
	Attendees   []string     `json:"attendees,omitempty"`
}

type updateEventCommand struct {
	Token       tokenPayload `json:"token"`
	EventID     string       `json:"event_id"`
	Summary     string       `json:"summary,omitempty"`
	Location    string       `json:"location,omitempty"`
	Description string       `json:"description,omitempty"`
	Start       *string      `json:"start,omitempty"`
	End         *string      `json:"end,omitempty"`
	Recurrence  []string     `json:"recurrence,omitempty"`
	Attendees   []string     `json:"attendees,omitempty"`
}

type deleteEventCommand struct {
	Token   tokenPayload `json:"token"`
	EventID string       `json:"event_id"`
}

func toOAuthToken(p tokenPayload) *oauth2.Token {
	return &oauth2.Token{
		AccessToken:  p.AccessToken,
		RefreshToken: p.RefreshToken,
		TokenType:    p.TokenType,
		Expiry:       p.Expiry,
	}
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

	db, err := sql.Open("pgx", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	pubKeyPath := os.Getenv("JWT_PUBLIC_KEY_PATH")
	if pubKeyPath == "" {
		pubKeyPath = "public_key.pem"
	}
	jwtPubKey, err := os.ReadFile(pubKeyPath)
	if err != nil {
		log.Printf("warning: could not read JWT public key from %s: %v", pubKeyPath, err)
	}

	oauthCfg := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{googlecalendar.CalendarScope},
		Endpoint:     google.Endpoint,
	}

	publisher := broker.NewEventPublisher(nc)
	calendarSvc := services.NewCalendarService(publisher, oauthCfg)

	if _, err := nc.Subscribe("calendar.command.create_event", func(msg *nats.Msg) {
		var cmd createEventCommand
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			log.Printf("create_event: invalid payload: %v", err)
			return
		}

		start, err := time.Parse(time.RFC3339, cmd.Start)
		if err != nil {
			log.Printf("create_event: invalid start: %v", err)
			return
		}
		end, err := time.Parse(time.RFC3339, cmd.End)
		if err != nil {
			log.Printf("create_event: invalid end: %v", err)
			return
		}

		eventID, err := calendarSvc.Create(context.Background(), toOAuthToken(cmd.Token), services.CreateEventInput{
			Summary:     cmd.Summary,
			Location:    cmd.Location,
			Description: cmd.Description,
			Start:       start,
			End:         end,
			Recurrence:  cmd.Recurrence,
			Attendees:   cmd.Attendees,
		})
		if err != nil {
			log.Printf("create_event: %v", err)
			return
		}

		log.Printf("create_event: created %s", eventID)
	}); err != nil {
		log.Fatalf("nats subscribe calendar.command.create_event: %v", err)
	}

	if _, err := nc.Subscribe("calendar.command.update_event", func(msg *nats.Msg) {
		var cmd updateEventCommand
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			log.Printf("update_event: invalid payload: %v", err)
			return
		}
		if cmd.EventID == "" {
			log.Printf("update_event: event_id required")
			return
		}

		input := services.UpdateEventInput{
			EventID:     cmd.EventID,
			Summary:     cmd.Summary,
			Location:    cmd.Location,
			Description: cmd.Description,
			Recurrence:  cmd.Recurrence,
			Attendees:   cmd.Attendees,
		}
		if cmd.Start != nil {
			t, err := time.Parse(time.RFC3339, *cmd.Start)
			if err != nil {
				log.Printf("update_event: invalid start: %v", err)
				return
			}
			input.Start = &t
		}
		if cmd.End != nil {
			t, err := time.Parse(time.RFC3339, *cmd.End)
			if err != nil {
				log.Printf("update_event: invalid end: %v", err)
				return
			}
			input.End = &t
		}

		if err := calendarSvc.Update(context.Background(), toOAuthToken(cmd.Token), input); err != nil {
			log.Printf("update_event: %v", err)
			return
		}

		log.Printf("update_event: updated %s", cmd.EventID)
	}); err != nil {
		log.Fatalf("nats subscribe calendar.command.update_event: %v", err)
	}

	if _, err := nc.Subscribe("calendar.command.delete_event", func(msg *nats.Msg) {
		var cmd deleteEventCommand
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			log.Printf("delete_event: invalid payload: %v", err)
			return
		}
		if cmd.EventID == "" {
			log.Printf("delete_event: event_id required")
			return
		}

		if err := calendarSvc.Delete(context.Background(), toOAuthToken(cmd.Token), cmd.EventID); err != nil {
			log.Printf("delete_event: %v", err)
			return
		}

		log.Printf("delete_event: deleted %s", cmd.EventID)
	}); err != nil {
		log.Fatalf("nats subscribe calendar.command.delete_event: %v", err)
	}

	notifSvc := services.NewNotificationService(publisher)
	calendarHandler := handlers.NewCalendarHandler(notifSvc)
	tokenStore := services.NewTokenStore(db)
	pendingStates := services.NewPendingStates()
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	authHandler := handlers.NewAuthHandler(oauthCfg, tokenStore, pendingStates, frontendURL)
	eventHandler := handlers.NewEventHandler(db, publisher, calendarSvc, tokenStore)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Post("/webhook/google-calendar", calendarHandler.Webhook)
	r.Get("/auth/google/callback", authHandler.Callback)

	r.Group(func(r chi.Router) {
		r.Use(authMiddleware(jwtPubKey))
		r.Post("/events", eventHandler.Create)
		r.Get("/events", eventHandler.List)
		r.Delete("/events/{id}", eventHandler.Delete)
		r.Post("/auth/login", authHandler.StartLogin)
		r.Get("/auth/status", authHandler.Status)
		r.Delete("/auth", authHandler.Disconnect)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}

// authMiddleware valida o Bearer JWT emitido pelo auth-api e injeta o
// tenant_id no context (mesmo padrão usado em rule-engine/device-manager),
// pra que EventHandler saiba de qual tenant é o evento criado.
func authMiddleware(pubKeyPEM []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			key, err := jwt.ParseRSAPublicKeyFromPEM(pubKeyPEM)
			if err != nil {
				http.Error(w, `{"error":"server misconfigured"}`, http.StatusInternalServerError)
				return
			}
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				return key, nil
			})
			if err != nil || !token.Valid {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}
			data, ok := claims["data"].(map[string]any)
			if !ok {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}
			tenantID, _ := data["tenant_id"].(string)

			ctx := context.WithValue(r.Context(), handlers.TenantIDKey, tenantID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
