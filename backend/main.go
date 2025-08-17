package main

import (
	"ai-project-backend/application"
	"log"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	// Create application instance
	app, err := application.NewApplication()
	if err != nil {
		log.Fatalf("Failed to create application: %v", err)
	}
	defer app.Close()

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		if err := app.Run(); err != nil {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for shutdown signal
	<-sigChan
	log.Println("Shutting down gracefully...")
	// Force rebuild Sun Aug 17 23:02:50 CST 2025
}