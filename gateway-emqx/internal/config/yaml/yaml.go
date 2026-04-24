package yaml

type Yaml struct {
	Queue struct {
		Topics struct {
			GatewayData       string `yaml:"gateway_data"`
			TelemetryReceived string `yaml:"telemetry_received"`
		} `yaml:"topics"`
	} `yaml:"queue"`
}
