package handlers

import (
	"ai-project-backend/database"
	"github.com/go-redis/redis/v8"
)

// DocumentHandler is an alias for HybridDocumentHandler to maintain compatibility
type DocumentHandler = HybridDocumentHandler

// NewDocumentHandler creates a new document handler (alias for NewHybridDocumentHandler)
// Supports optional Redis client for caching
func NewDocumentHandler(db database.DB, docsBasePath string, redisClient ...*redis.Client) *DocumentHandler {
	return NewHybridDocumentHandler(db, docsBasePath, redisClient...)
}
