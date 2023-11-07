package main

import (
	"fmt"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	emqxConfig "github.com/gateway-emqx-datanumbers/internal/config/emqx"
	emqxService "github.com/gateway-emqx-datanumbers/internal/service"
)

func main() {
	emqx := emqxConfig.NewEmqx("client-1")
	client := emqx.Connect()

	token := client.Publish(
		"esp32/temperatura",
		0,
		false,
		"Hello World",
	)

	test := client.Subscribe(
		"esp32/temperatura",
		0,
		func(c mqtt.Client, m mqtt.Message) {
			emqxService.MessageHandler(c, m)
		},
	)

	fmt.Println(test.Done())
	fmt.Println(test.Error())
	fmt.Println(token.Wait())
	fmt.Println(token.Error())

	select {}
}
