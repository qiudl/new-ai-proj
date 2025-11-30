package services

import (
	"strings"
	"testing"
	"time"

	"ai-project-backend/models"

	"github.com/stretchr/testify/assert"
)

// ========== API Key Generation Tests ==========

func TestMCPAPIKeyService_GenerateAPIKey(t *testing.T) {
	service := &MCPAPIKeyService{}

	plainKey, keyID, keyHash, err := service.GenerateAPIKey()

	assert.NoError(t, err)
	assert.NotEmpty(t, plainKey)
	assert.NotEmpty(t, keyID)
	assert.NotEmpty(t, keyHash)

	// Check format: plainKey should start with prefix
	assert.True(t, strings.HasPrefix(plainKey, APIKeyPrefix), "plainKey should start with prefix")

	// Check format: keyID should start with prefix
	assert.True(t, strings.HasPrefix(keyID, APIKeyPrefix), "keyID should start with prefix")

	// keyID should be shorter than plainKey (only uses first 8 bytes = 16 hex chars)
	assert.True(t, len(keyID) < len(plainKey), "keyID should be shorter than plainKey")

	// keyHash should be 64 characters (SHA-256 hex)
	assert.Len(t, keyHash, 64, "keyHash should be 64 hex characters")

	// Verify plainKey has correct length: prefix(10) + 64 hex chars = 74
	assert.Len(t, plainKey, len(APIKeyPrefix)+64, "plainKey should have correct length")

	// Verify keyID has correct length: prefix(10) + 16 hex chars = 26
	assert.Len(t, keyID, len(APIKeyPrefix)+16, "keyID should have correct length")
}

func TestMCPAPIKeyService_GenerateAPIKey_Uniqueness(t *testing.T) {
	service := &MCPAPIKeyService{}

	keys := make(map[string]bool)
	hashes := make(map[string]bool)

	for i := 0; i < 100; i++ {
		plainKey, _, keyHash, err := service.GenerateAPIKey()
		assert.NoError(t, err)

		// Each key should be unique
		assert.False(t, keys[plainKey], "Generated keys should be unique (iteration %d)", i)
		keys[plainKey] = true

		// Each hash should be unique
		assert.False(t, hashes[keyHash], "Generated hashes should be unique (iteration %d)", i)
		hashes[keyHash] = true
	}
}

func TestMCPAPIKeyService_HashAPIKey(t *testing.T) {
	service := &MCPAPIKeyService{}

	testKey := "aiproj_pk_test12345678901234567890123456789012"
	hash1 := service.HashAPIKey(testKey)
	hash2 := service.HashAPIKey(testKey)

	// Same input should produce same hash
	assert.Equal(t, hash1, hash2, "Same input should produce same hash")

	// Hash should be 64 characters (SHA-256 hex)
	assert.Len(t, hash1, 64, "Hash should be 64 hex characters")

	// Different input should produce different hash
	differentKey := "aiproj_pk_different_key_here_12345678901234"
	hash3 := service.HashAPIKey(differentKey)
	assert.NotEqual(t, hash1, hash3, "Different input should produce different hash")
}

func TestMCPAPIKeyService_HashAPIKey_Consistency(t *testing.T) {
	service := &MCPAPIKeyService{}

	// Test that hash is deterministic
	testCases := []struct {
		input    string
		expected string
	}{
		{
			input:    "aiproj_pk_0000000000000000000000000000000000000000000000000000000000000000",
			expected: service.HashAPIKey("aiproj_pk_0000000000000000000000000000000000000000000000000000000000000000"),
		},
	}

	for _, tc := range testCases {
		// Run multiple times to ensure consistency
		for i := 0; i < 10; i++ {
			hash := service.HashAPIKey(tc.input)
			assert.Equal(t, tc.expected, hash, "Hash should be consistent")
		}
	}
}

func TestMCPAPIKeyService_GeneratedKeyCanBeHashed(t *testing.T) {
	service := &MCPAPIKeyService{}

	// Generate a key
	plainKey, _, originalHash, err := service.GenerateAPIKey()
	assert.NoError(t, err)

	// Hash the plain key - should match the original hash
	computedHash := service.HashAPIKey(plainKey)
	assert.Equal(t, originalHash, computedHash, "Hash of plain key should match original hash")
}

// ========== Model Tests ==========

func TestMCPAPIKey_IsActive_ActiveNoExpiration(t *testing.T) {
	key := &models.MCPAPIKey{
		Status:    models.MCPAPIKeyStatusActive,
		ExpiresAt: nil,
	}
	assert.True(t, key.IsActive(), "Active key without expiration should be active")
}

func TestMCPAPIKey_IsActive_ActiveFutureExpiration(t *testing.T) {
	futureTime := time.Now().Add(24 * time.Hour)
	key := &models.MCPAPIKey{
		Status:    models.MCPAPIKeyStatusActive,
		ExpiresAt: &futureTime,
	}
	assert.True(t, key.IsActive(), "Active key with future expiration should be active")
}

func TestMCPAPIKey_IsActive_ActivePastExpiration(t *testing.T) {
	pastTime := time.Now().Add(-24 * time.Hour)
	key := &models.MCPAPIKey{
		Status:    models.MCPAPIKeyStatusActive,
		ExpiresAt: &pastTime,
	}
	assert.False(t, key.IsActive(), "Active key with past expiration should not be active")
}

func TestMCPAPIKey_IsActive_Revoked(t *testing.T) {
	key := &models.MCPAPIKey{
		Status:    models.MCPAPIKeyStatusRevoked,
		ExpiresAt: nil,
	}
	assert.False(t, key.IsActive(), "Revoked key should not be active")
}

func TestMCPAPIKey_IsActive_ExpiredStatus(t *testing.T) {
	key := &models.MCPAPIKey{
		Status:    models.MCPAPIKeyStatusExpired,
		ExpiresAt: nil,
	}
	assert.False(t, key.IsActive(), "Key with expired status should not be active")
}

func TestMCPAPIKey_IsExpired_NoExpiration(t *testing.T) {
	key := &models.MCPAPIKey{
		ExpiresAt: nil,
	}
	assert.False(t, key.IsExpired(), "Key without expiration should not be expired")
}

func TestMCPAPIKey_IsExpired_FutureExpiration(t *testing.T) {
	futureTime := time.Now().Add(24 * time.Hour)
	key := &models.MCPAPIKey{
		ExpiresAt: &futureTime,
	}
	assert.False(t, key.IsExpired(), "Key with future expiration should not be expired")
}

func TestMCPAPIKey_IsExpired_PastExpiration(t *testing.T) {
	pastTime := time.Now().Add(-24 * time.Hour)
	key := &models.MCPAPIKey{
		ExpiresAt: &pastTime,
	}
	assert.True(t, key.IsExpired(), "Key with past expiration should be expired")
}

func TestMCPAPIKey_IsExpired_JustExpired(t *testing.T) {
	// Test edge case: just expired (1 second ago)
	pastTime := time.Now().Add(-1 * time.Second)
	key := &models.MCPAPIKey{
		ExpiresAt: &pastTime,
	}
	assert.True(t, key.IsExpired(), "Key that just expired should be expired")
}

func TestMCPAPIKey_IsExpired_AlmostExpired(t *testing.T) {
	// Test edge case: almost expired (1 second in future)
	futureTime := time.Now().Add(1 * time.Second)
	key := &models.MCPAPIKey{
		ExpiresAt: &futureTime,
	}
	assert.False(t, key.IsExpired(), "Key that's about to expire should not be expired yet")
}

func TestMCPAPIKey_TableName(t *testing.T) {
	key := &models.MCPAPIKey{}
	assert.Equal(t, "mcp_api_keys", key.TableName(), "Table name should be mcp_api_keys")
}

func TestMCPAPIKeyLog_TableName(t *testing.T) {
	log := &models.MCPAPIKeyLog{}
	assert.Equal(t, "mcp_api_key_logs", log.TableName(), "Table name should be mcp_api_key_logs")
}

func TestMCPSSESession_TableName(t *testing.T) {
	session := &models.MCPSSESession{}
	assert.Equal(t, "mcp_sse_sessions", session.TableName(), "Table name should be mcp_sse_sessions")
}

// ========== Constants Tests ==========

func TestAPIKeyConstants(t *testing.T) {
	assert.Equal(t, "aiproj_pk_", APIKeyPrefix, "API Key prefix should be correct")
	assert.Equal(t, 32, APIKeyRandomSize, "API Key random size should be 32 bytes")
}

func TestMCPAPIKeyStatusConstants(t *testing.T) {
	assert.Equal(t, "active", models.MCPAPIKeyStatusActive)
	assert.Equal(t, "revoked", models.MCPAPIKeyStatusRevoked)
	assert.Equal(t, "expired", models.MCPAPIKeyStatusExpired)
}

func TestMCPAPIKeyLogStatusConstants(t *testing.T) {
	assert.Equal(t, "success", models.MCPAPIKeyLogStatusSuccess)
	assert.Equal(t, "error", models.MCPAPIKeyLogStatusError)
	assert.Equal(t, "timeout", models.MCPAPIKeyLogStatusTimeout)
}

func TestMCPSSESessionStatusConstants(t *testing.T) {
	assert.Equal(t, "active", models.MCPSSESessionStatusActive)
	assert.Equal(t, "closed", models.MCPSSESessionStatusClosed)
}

// ========== Error Definition Tests ==========

func TestErrorDefinitions(t *testing.T) {
	assert.Error(t, ErrAPIKeyNotFound, "ErrAPIKeyNotFound should be an error")
	assert.Error(t, ErrAPIKeyRevoked, "ErrAPIKeyRevoked should be an error")
	assert.Error(t, ErrAPIKeyExpired, "ErrAPIKeyExpired should be an error")
	assert.Error(t, ErrAPIKeyInactive, "ErrAPIKeyInactive should be an error")
	assert.Error(t, ErrInvalidAPIKeyFormat, "ErrInvalidAPIKeyFormat should be an error")

	// Check error messages
	assert.Contains(t, ErrAPIKeyNotFound.Error(), "not found")
	assert.Contains(t, ErrAPIKeyRevoked.Error(), "revoked")
	assert.Contains(t, ErrAPIKeyExpired.Error(), "expired")
	assert.Contains(t, ErrAPIKeyInactive.Error(), "not active")
	assert.Contains(t, ErrInvalidAPIKeyFormat.Error(), "invalid")
}

// ========== Service Constructor Tests ==========

func TestNewMCPAPIKeyService_WithNil(t *testing.T) {
	service := NewMCPAPIKeyService(nil)
	assert.NotNil(t, service, "Service should be created even with nil db")
}

// ========== Request/Response Struct Tests ==========

func TestCreateMCPAPIKeyRequest_Defaults(t *testing.T) {
	req := &models.CreateMCPAPIKeyRequest{
		Name: "Test Key",
	}
	assert.Equal(t, "Test Key", req.Name)
	assert.Nil(t, req.Description)
	assert.Nil(t, req.ExpiresAt)
}

func TestListMCPAPIKeysRequest_Defaults(t *testing.T) {
	req := &models.ListMCPAPIKeysRequest{}
	// Default values should be zero values
	assert.Equal(t, 0, req.Page)
	assert.Equal(t, 0, req.Limit)
	assert.False(t, req.IncludeRevoked)
	assert.Empty(t, req.Status)
}

func TestUpdateMCPAPIKeyRequest_PartialUpdate(t *testing.T) {
	newName := "New Name"
	req := &models.UpdateMCPAPIKeyRequest{
		Name: &newName,
	}
	assert.NotNil(t, req.Name)
	assert.Nil(t, req.Description)
	assert.Nil(t, req.ExpiresAt)
}

// ========== API Key Prefix Validation Tests ==========

func TestAPIKeyPrefix_Format(t *testing.T) {
	// The prefix should be "aiproj_pk_" (10 characters)
	assert.Len(t, APIKeyPrefix, 10, "Prefix should be 10 characters")
	assert.Equal(t, "aiproj_pk_", APIKeyPrefix)

	// Verify it matches the expected pattern
	assert.True(t, strings.HasSuffix(APIKeyPrefix, "_"), "Prefix should end with underscore")
}

func TestGeneratedKeyFormat(t *testing.T) {
	service := &MCPAPIKeyService{}

	plainKey, keyID, _, err := service.GenerateAPIKey()
	assert.NoError(t, err)

	// Plain key format: aiproj_pk_ + 64 hex chars
	assert.True(t, strings.HasPrefix(plainKey, "aiproj_pk_"))
	hexPart := strings.TrimPrefix(plainKey, "aiproj_pk_")
	assert.Len(t, hexPart, 64, "Hex part should be 64 characters")

	// Verify hex part only contains valid hex characters
	for _, c := range hexPart {
		assert.True(t, (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'),
			"Hex part should only contain lowercase hex characters")
	}

	// Key ID format: aiproj_pk_ + 16 hex chars
	assert.True(t, strings.HasPrefix(keyID, "aiproj_pk_"))
	keyIDHexPart := strings.TrimPrefix(keyID, "aiproj_pk_")
	assert.Len(t, keyIDHexPart, 16, "Key ID hex part should be 16 characters")

	// Key ID should be a prefix of the full key
	assert.True(t, strings.HasPrefix(plainKey, keyID), "Key ID should be a prefix of plain key")
}

// ========== MCPAPIKeyStats Tests ==========

func TestMCPAPIKeyStats_ZeroValues(t *testing.T) {
	stats := &models.MCPAPIKeyStats{}
	assert.Equal(t, int64(0), stats.TotalRequests)
	assert.Equal(t, int64(0), stats.TotalErrors)
	assert.Equal(t, float64(0), stats.SuccessRate)
	assert.Equal(t, float64(0), stats.AvgDurationMs)
	assert.Nil(t, stats.ToolsUsage)
	assert.Nil(t, stats.DailyRequests)
}

func TestMCPToolUsageStat_Fields(t *testing.T) {
	stat := &models.MCPToolUsageStat{
		ToolName: "create_task",
		Count:    100,
	}
	assert.Equal(t, "create_task", stat.ToolName)
	assert.Equal(t, int64(100), stat.Count)
}

func TestMCPDailyRequestStat_Fields(t *testing.T) {
	stat := &models.MCPDailyRequestStat{
		Date:     "2024-01-15",
		Requests: 500,
		Errors:   10,
	}
	assert.Equal(t, "2024-01-15", stat.Date)
	assert.Equal(t, int64(500), stat.Requests)
	assert.Equal(t, int64(10), stat.Errors)
}
