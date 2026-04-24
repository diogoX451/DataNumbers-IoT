package stream

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/nats-io/nats.go"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Em produção, validar o domínio
	},
}

type StreamService struct {
	clients    map[*websocket.Conn]bool
	clientsMux sync.Mutex
	natsConn   *nats.Conn
}

func NewStreamService(nc *nats.Conn) *StreamService {
	s := &StreamService{
		clients:  make(map[*websocket.Conn]bool),
		natsConn: nc,
	}
	go s.listenNATS()
	return s
}

func (s *StreamService) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("failed to upgrade to websocket: %v", err)
		return
	}

	s.clientsMux.Lock()
	s.clients[conn] = true
	s.clientsMux.Unlock()

	log.Printf("New WebSocket client connected. Total: %d", len(s.clients))

	// Manter a conexão viva e remover ao desconectar
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
	// Assina as telemetrias recebidas
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
