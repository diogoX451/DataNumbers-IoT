package main

import "github.com/joho/godotenv"

func init() {
	if err := godotenv.Load(); err != nil {
		panic("Not sure how to load")
	}
}

func main() {

}
