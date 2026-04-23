package interfaces

type IProducer interface {
	Publish(topic string, qos byte, retained bool, payload interface{}) error
}

type IConsumer interface {
	Subscribe(topic string, qos byte, callback func(topic string, payload []byte)) error
}

type IConnMessage interface {
	Connect() error
	Close()
	SetTopic(topic string)
	GetTopic() string
}
