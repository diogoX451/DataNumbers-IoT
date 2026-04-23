package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	yamlConfig "github.com/nextsync/gateway-broker/internal/config/yaml"
	"gopkg.in/yaml.v3"
)

var yamlFile *yamlConfig.Yaml

func Load() error {
	logFile, err := os.OpenFile("app.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	if err != nil {
		return fmt.Errorf("error opening log file: %v", err)
	}
	log.SetOutput(logFile)
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	currentDir, err := os.Getwd()
	if err != nil {
		log.Printf("error getting current directory: %v", err)
		return err
	}

	rootPath := fmt.Sprintf("%s/internal/config/env", currentDir)
	if err := godotenv.Load(fmt.Sprintf("%s/.env", rootPath)); err != nil {
		log.Printf("error loading .env file: %v", err)
		return fmt.Errorf("error loading .env file")
	}

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
