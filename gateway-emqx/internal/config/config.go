package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	yamlConfig "github.com/diogoX451/gateway-broker/internal/config/yaml"
	"github.com/joho/godotenv"
	"gopkg.in/yaml.v3"
)

var yamlFile *yamlConfig.Yaml

func Load() error {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	currentDir, err := os.Getwd()
	if err != nil {
		log.Printf("error getting current directory: %v", err)
		return err
	}

	rootPath := fmt.Sprintf("%s/internal/config/env", currentDir)
	_ = godotenv.Load(fmt.Sprintf("%s/.env", rootPath))

	log.Println("Configuration loaded successfully")
	return nil
}

func Get(key string) string {
	return os.Getenv(key)
}

func GetYaml() *yamlConfig.Yaml {
	configureYaml()
	return yamlFile
}

func configureYaml() {
	dir, err := os.Getwd()
	if err != nil {
		log.Fatalf("error getting current directory: %v", err)
	}

	filePath := filepath.Join(dir, "internal/config/yaml/queue.yaml")
	file, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatalf("error reading file: %v", err)
	}

	err = yaml.Unmarshal(file, &yamlFile)
	if err != nil {
		log.Fatalf("error unmarshalling yaml: %v", err)
	}
}
