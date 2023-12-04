package model

import (
	"encoding/json"
	"fmt"

	"github.com/xeipuuv/gojsonschema"
)

type Data struct {
	Topic   string      `json:"topic"`
	Payload interface{} `json:"payload"`
}

func NewData(topic string, payload interface{}) Data {
	return Data{
		Topic:   topic,
		Payload: payload,
	}
}

func (d *Data) Validate() bool {
	schemna := gojsonschema.NewReferenceLoader(
		"file:///home/diogo/Documentos/DataNumbers-IoT/gateway-emqx/internal/model/schema.json",
	)

	var obj interface{}
	err := json.Unmarshal(d.Payload.([]byte), &obj)
	if err != nil {
		fmt.Println(err.Error())
	}
	jsonLoader := gojsonschema.NewGoLoader(obj)
	result, err := gojsonschema.Validate(schemna, jsonLoader)
	if err != nil {
		fmt.Println(err.Error())
	}

	return result.Valid()
}
