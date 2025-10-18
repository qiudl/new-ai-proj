package handlers

import (
	"ai-project-backend/database"
)

// DocumentHandler is an alias for HybridDocumentHandler to maintain compatibility
type DocumentHandler = HybridDocumentHandler

// NewDocumentHandler creates a new document handler (alias for NewHybridDocumentHandler)
func NewDocumentHandler(db database.DB) *DocumentHandler {
	return NewHybridDocumentHandler(db)
}
