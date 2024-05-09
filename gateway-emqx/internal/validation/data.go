package validation

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

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

	cwd, err := os.Getwd()
	if err != nil {
		fmt.Println("Error getting current working directory:", err)
		return false
	}
	schemaPath := filepath.Join(cwd, "schema.json")
	schemna := gojsonschema.NewReferenceLoader(
		"file://" + schemaPath,
	)

	var obj interface{}
	err = json.Unmarshal(d.Payload.([]byte), &obj)
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
