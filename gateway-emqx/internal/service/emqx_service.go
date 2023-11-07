package emqxService

import (
	"fmt"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

func MessageHandler(client mqtt.Client, msg mqtt.Message) {
	fmt.Printf("TOPIC: %s\n", msg.Topic())
	fmt.Printf("MSG: %s\n", msg.Payload())
}
