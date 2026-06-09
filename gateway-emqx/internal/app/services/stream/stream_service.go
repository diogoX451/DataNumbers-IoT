package stream

import (
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/nats-io/nats.go"
)

type StreamService struct {
	clients        map[*websocket.Conn]bool
	clientsMux     sync.Mutex
	natsConn       *nats.Conn
	allowedOrigins []string
	jwtPubKey      []byte
	upgrader       websocket.Upgrader
}

func NewStreamService(nc *nats.Conn) *StreamService {
	allowed := splitAndTrim(os.Getenv("WS_ALLOWED_ORIGINS"))
	pubKeyPath := os.Getenv("JWT_PUBLIC_KEY_PATH")
	if pubKeyPath == "" {
		pubKeyPath = "public_key.pem"
	}
	pubKey, err := os.ReadFile(pubKeyPath)
	if err != nil {
		log.Printf("stream: could not read JWT public key from %s: %v", pubKeyPath, err)
	}

	s := &StreamService{
		clients:        make(map[*websocket.Conn]bool),
		natsConn:       nc,
		allowedOrigins: allowed,
		jwtPubKey:      pubKey,
	}
	s.upgrader = websocket.Upgrader{
		CheckOrigin: s.checkOrigin,
	}
	go s.listenNATS()
	return s
}

func (s *StreamService) checkOrigin(r *http.Request) bool {
	if len(s.allowedOrigins) == 0 {
		return true
	}
	origin := r.Header.Get("Origin")
	for _, allowed := range s.allowedOrigins {
		if allowed == "*" || allowed == origin {
			return true
		}
	}
	return false
}

func (s *StreamService) authenticate(r *http.Request) bool {
	if len(s.jwtPubKey) == 0 {
		return true
	}
	tokenString := r.URL.Query().Get("token")
	if tokenString == "" {
		auth := r.Header.Get("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			tokenString = strings.TrimPrefix(auth, "Bearer ")
		}
	}
	if tokenString == "" {
		return false
	}
	key, err := jwt.ParseRSAPublicKeyFromPEM(s.jwtPubKey)
	if err != nil {
		log.Printf("stream: failed to parse jwt public key: %v", err)
		return false
	}
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		return key, nil
	})
	if err != nil || !token.Valid {
		return false
	}
	return true
}

func (s *StreamService) HandleWS(w http.ResponseWriter, r *http.Request) {
	if !s.authenticate(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("failed to upgrade to websocket: %v", err)
		return
	}

	s.clientsMux.Lock()
	s.clients[conn] = true
	s.clientsMux.Unlock()

	log.Printf("New WebSocket client connected. Total: %d", len(s.clients))

	defer func() {
		s.clientsMux.Lock()
		delete(s.clients, conn)
		s.clientsMux.Unlock()
		conn.Close()
		log.Printf("Client disconnected. Remaining: %d", len(s.clients))
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (s *StreamService) listenNATS() {
	_, err := s.natsConn.Subscribe("iot.telemetry.received", func(m *nats.Msg) {
		s.broadcast(m.Data)
	})
	if err != nil {
		log.Printf("failed to subscribe to NATS in stream service: %v", err)
	}
}

func (s *StreamService) broadcast(data []byte) {
	s.clientsMux.Lock()
	defer s.clientsMux.Unlock()

	for client := range s.clients {
		err := client.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			log.Printf("failed to send message to client: %v", err)
			client.Close()
			delete(s.clients, client)
		}
	}
}

func splitAndTrim(value string) []string {
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
