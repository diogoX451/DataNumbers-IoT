package grpc

import (
	"encoding/json"
	"fmt"
)

const (
	TEMPERATURE_SENSOR = "temperature"
	HUMIDITY_SENSOR    = "humidity"
	DISTANCE_SENSOR    = "distance"
)

type Data struct {
	Type    string      `json:"type"`
	Content interface{} `json:"content"`
}

// Implementações específicas para cada tipo de sensor

type TemperatureData struct {
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type HumidityData struct {
	Value float64 `json:"value"`
}

type DistanceData struct {
	Value float64 `json:"value"`
}

func DeserializeData(payload []byte) (*Data, error) {
	var raw Data
	if err := json.Unmarshal(payload, &raw); err != nil {
		return nil, err
	}

	switch raw.Type {
	case TEMPERATURE_SENSOR:
		var content TemperatureData
		if err := json.Unmarshal(payload, &content); err != nil {
			return nil, err
		}
		raw.Content = content
	case HUMIDITY_SENSOR:
		var content HumidityData
		if err := json.Unmarshal(payload, &content); err != nil {
			return nil, err
		}
		raw.Content = content
	case DISTANCE_SENSOR:
		var content DistanceData
		if err := json.Unmarshal(payload, &content); err != nil {
			return nil, err
		}
		raw.Content = content
	default:
		return nil, fmt.Errorf("unknown data type: %s", raw.Type)
	}

	return &raw, nil
}
