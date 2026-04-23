package yaml

type Yaml struct {
	Queue struct {
		Topics struct {
			GatewayData string `yaml:"gateway_data"`
		} `yaml:"topics"`
	} `yaml:"queue"`
}
