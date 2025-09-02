package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// HMACValidator handles HMAC-SHA256 signature validation for API requests
type HMACValidator struct {
	// Required headers for HMAC validation
	TimestampHeader string
	SignatureHeader string
	NonceHeader     string

	// Configuration
	MaxTimestampSkew time.Duration        // Maximum allowed time difference
	NonceCache       map[string]time.Time // Simple nonce cache (use Redis in production)
	NonceTTL         time.Duration
}

// NewHMACValidator creates a new HMAC validator with default configuration
func NewHMACValidator() *HMACValidator {
	return &HMACValidator{
		TimestampHeader:  "X-API-Timestamp",
		SignatureHeader:  "X-API-Signature",
		NonceHeader:      "X-API-Nonce",
		MaxTimestampSkew: 5 * time.Minute,
		NonceCache:       make(map[string]time.Time),
		NonceTTL:         10 * time.Minute,
	}
}

// ValidateSignature validates the HMAC-SHA256 signature of the request
func (hv *HMACValidator) ValidateSignature(r *http.Request, secret string) error {
	if secret == "" {
		return fmt.Errorf("API secret is required for HMAC validation")
	}

	// Extract required headers
	timestamp := r.Header.Get(hv.TimestampHeader)
	signature := r.Header.Get(hv.SignatureHeader)
	nonce := r.Header.Get(hv.NonceHeader)

	if timestamp == "" {
		return fmt.Errorf("missing required header: %s", hv.TimestampHeader)
	}

	if signature == "" {
		return fmt.Errorf("missing required header: %s", hv.SignatureHeader)
	}

	if nonce == "" {
		return fmt.Errorf("missing required header: %s", hv.NonceHeader)
	}

	// Validate timestamp
	if err := hv.validateTimestamp(timestamp); err != nil {
		return fmt.Errorf("timestamp validation failed: %w", err)
	}

	// Validate nonce (prevent replay attacks)
	if err := hv.validateNonce(nonce); err != nil {
		return fmt.Errorf("nonce validation failed: %w", err)
	}

	// Create signature payload
	payload := hv.createSignaturePayload(r, timestamp, nonce)

	// Generate expected signature
	expectedSignature := hv.generateSignature(payload, secret)

	// Compare signatures (constant time comparison)
	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		return fmt.Errorf("signature validation failed: signatures do not match")
	}

	// Store nonce to prevent replay
	hv.storeNonce(nonce)

	return nil
}

// validateTimestamp checks if the timestamp is within the allowed skew
func (hv *HMACValidator) validateTimestamp(timestampStr string) error {
	// Parse timestamp (expecting Unix timestamp in seconds)
	var timestamp int64
	if _, err := fmt.Sscanf(timestampStr, "%d", &timestamp); err != nil {
		return fmt.Errorf("invalid timestamp format: %w", err)
	}

	requestTime := time.Unix(timestamp, 0)
	now := time.Now()

	// Check if timestamp is too old or too far in the future
	timeDiff := now.Sub(requestTime)
	if timeDiff < 0 {
		timeDiff = -timeDiff
	}

	if timeDiff > hv.MaxTimestampSkew {
		return fmt.Errorf("timestamp skew too large: %v (max: %v)", timeDiff, hv.MaxTimestampSkew)
	}

	return nil
}

// validateNonce checks if the nonce has been used before
func (hv *HMACValidator) validateNonce(nonce string) error {
	if nonce == "" {
		return fmt.Errorf("nonce cannot be empty")
	}

	// Clean up expired nonces
	hv.cleanExpiredNonces()

	// Check if nonce has been used
	if _, exists := hv.NonceCache[nonce]; exists {
		return fmt.Errorf("nonce has already been used (replay attack detected)")
	}

	return nil
}

// storeNonce stores the nonce to prevent replay attacks
func (hv *HMACValidator) storeNonce(nonce string) {
	hv.NonceCache[nonce] = time.Now()
}

// cleanExpiredNonces removes expired nonces from the cache
func (hv *HMACValidator) cleanExpiredNonces() {
	now := time.Now()
	for nonce, timestamp := range hv.NonceCache {
		if now.Sub(timestamp) > hv.NonceTTL {
			delete(hv.NonceCache, nonce)
		}
	}
}

// createSignaturePayload creates the payload string for signature generation
func (hv *HMACValidator) createSignaturePayload(r *http.Request, timestamp, nonce string) string {
	// Standard signature payload format:
	// METHOD\nPATH\nQUERY\nTIMESTAMP\nNONCE\nBODY_HASH

	method := strings.ToUpper(r.Method)
	path := r.URL.Path
	query := r.URL.RawQuery

	// For body hash, we would need to read the body first
	// This is a simplified version - in production, you'd want to hash the request body
	bodyHash := "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" // Empty SHA256 hash

	// Construct payload
	payload := fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n%s",
		method, path, query, timestamp, nonce, bodyHash)

	return payload
}

// generateSignature generates HMAC-SHA256 signature for the payload
func (hv *HMACValidator) generateSignature(payload, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	signature := hex.EncodeToString(h.Sum(nil))

	// Return in the format: sha256=<signature>
	return fmt.Sprintf("sha256=%s", signature)
}

// ExtractSignature extracts the signature hash from the signature header
func (hv *HMACValidator) ExtractSignature(signatureHeader string) (string, error) {
	// Expected format: sha256=<signature>
	parts := strings.SplitN(signatureHeader, "=", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid signature format")
	}

	algorithm := parts[0]
	signature := parts[1]

	if algorithm != "sha256" {
		return "", fmt.Errorf("unsupported signature algorithm: %s", algorithm)
	}

	return signature, nil
}

// GetRequiredHeaders returns the list of required headers for HMAC validation
func (hv *HMACValidator) GetRequiredHeaders() []string {
	return []string{
		hv.TimestampHeader,
		hv.SignatureHeader,
		hv.NonceHeader,
	}
}

// ValidateHeaders checks if all required headers are present
func (hv *HMACValidator) ValidateHeaders(r *http.Request) error {
	missing := []string{}

	for _, header := range hv.GetRequiredHeaders() {
		if r.Header.Get(header) == "" {
			missing = append(missing, header)
		}
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required headers: %s", strings.Join(missing, ", "))
	}

	return nil
}

// GenerateTestSignature generates a signature for testing purposes
func (hv *HMACValidator) GenerateTestSignature(method, path, query, timestamp, nonce, secret string) string {
	bodyHash := "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" // Empty SHA256 hash

	payload := fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n%s",
		strings.ToUpper(method), path, query, timestamp, nonce, bodyHash)

	return hv.generateSignature(payload, secret)
}
