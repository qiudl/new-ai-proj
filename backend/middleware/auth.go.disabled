// backend/middleware/auth.go
package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/utils"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// AuthConfig holds configuration for the auth middleware
type AuthConfig struct {
	DB                   database.DB
	JWTManager           *utils.JWTManager
	EnableSessions       bool
	SessionTimeout       time.Duration
	SessionCookieName    string
	AllowAnonymous       []string
	RequireVerification  bool
	MaxLoginAttempts     int
	LockoutDuration      time.Duration
}

// AuthMiddleware provides authentication and session management
type AuthMiddleware struct {
	config        *AuthConfig
	sessions      map[string]*SessionData
	loginAttempts map[string]*LoginAttempts
	mutex         sync.RWMutex
}

// SessionData represents an active user session
type SessionData struct {
	UserID      int       `json:"user_id"`
	Username    string    `json:"username"`
	Role        string    `json:"role"`
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent"`
	CreatedAt   time.Time `json:"created_at"`
	LastSeen    time.Time `json:"last_seen"`
	IsActive    bool      `json:"is_active"`
	TokenHash   string    `json:"token_hash"`
}

// LoginAttempts tracks login attempts for rate limiting
type LoginAttempts struct {
	Count      int       `json:"count"`
	LastAttempt time.Time `json:"last_attempt"`
	LockedUntil *time.Time `json:"locked_until,omitempty"`
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(config *AuthConfig) *AuthMiddleware {
	if config.SessionTimeout == 0 {
		config.SessionTimeout = 24 * time.Hour
	}
	if config.SessionCookieName == "" {
		config.SessionCookieName = "session_id"
	}
	if config.MaxLoginAttempts == 0 {
		config.MaxLoginAttempts = 5
	}
	if config.LockoutDuration == 0 {
		config.LockoutDuration = 15 * time.Minute
	}

	return &AuthMiddleware{
		config:        config,
		sessions:      make(map[string]*SessionData),
		loginAttempts: make(map[string]*LoginAttempts),
	}
}

// RequireAuth middleware that requires authentication
func (am *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if path is in allow anonymous list
		if am.isAnonymousAllowed(c.Request.URL.Path) {
			c.Next()
			return
		}

		// Try to authenticate user
		user, session, err := am.authenticateRequest(c)
		if err != nil {
			am.respondUnauthorized(c, err.Error())
			return
		}

		// Update session last seen
		if session != nil {
			am.updateSessionLastSeen(session)
		}

		// Set user context
		am.setUserContext(c, user, session)

		c.Next()
	}
}

// RequireRole middleware that requires a specific role
func (am *AuthMiddleware) RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			am.respondUnauthorized(c, "Authentication required")
			return
		}

		role, ok := userRole.(string)
		if !ok {
			am.respondUnauthorized(c, "Invalid user context")
			return
		}

		if !am.hasRole(role, requiredRole) {
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"Insufficient permissions",
				map[string]string{"required_role": requiredRole, "user_role": role},
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitMiddleware provides rate limiting for login attempts
func (am *AuthMiddleware) RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only apply rate limiting to login endpoints
		if !strings.Contains(c.Request.URL.Path, "/login") {
			c.Next()
			return
		}

		clientIP := am.getClientIP(c)
		
		am.mutex.Lock()
		attempts, exists := am.loginAttempts[clientIP]
		am.mutex.Unlock()

		if exists && attempts.LockedUntil != nil && time.Now().Before(*attempts.LockedUntil) {
			response := models.NewErrorResponse(
				models.ErrCodeRateLimit,
				"Too many login attempts. Please try again later.",
				map[string]interface{}{
					"locked_until": attempts.LockedUntil.Format(time.RFC3339),
					"retry_after":  int(time.Until(*attempts.LockedUntil).Seconds()),
				},
			)
			c.JSON(http.StatusTooManyRequests, response)
			c.Abort()
			return
		}

		c.Next()
	}
}

// authenticateRequest authenticates a request using token or session
func (am *AuthMiddleware) authenticateRequest(c *gin.Context) (*models.User, *SessionData, error) {
	// Try token authentication first
	if user, err := am.authenticateToken(c); err == nil {
		return user, nil, nil
	}

	// Try session authentication if enabled
	if am.config.EnableSessions {
		if user, session, err := am.authenticateSession(c); err == nil {
			return user, session, nil
		}
	}

	return nil, nil, fmt.Errorf("authentication required")
}

// authenticateToken authenticates using JWT token
func (am *AuthMiddleware) authenticateToken(c *gin.Context) (*models.User, error) {
	// Get token from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return nil, fmt.Errorf("no authorization header")
	}

	// Extract Bearer token
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, fmt.Errorf("invalid authorization header format")
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == "" {
		return nil, fmt.Errorf("empty token")
	}

	// Validate token
	claims, err := am.config.JWTManager.ValidateToken(token)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %v", err)
	}

	// Get user from database
	user, err := am.config.DB.Users().GetByID(c.Request.Context(), claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	// Check if user is active
	if !user.IsActive {
		return nil, fmt.Errorf("user account is disabled")
	}

	// Check email verification if required
	if am.config.RequireVerification && !user.IsEmailVerified {
		return nil, fmt.Errorf("email verification required")
	}

	return user, nil
}

// authenticateSession authenticates using session cookie
func (am *AuthMiddleware) authenticateSession(c *gin.Context) (*models.User, *SessionData, error) {
	// Get session ID from cookie
	sessionID, err := c.Cookie(am.config.SessionCookieName)
	if err != nil {
		return nil, nil, fmt.Errorf("no session cookie")
	}

	// Get session from memory or database
	session, err := am.getSession(c.Request.Context(), sessionID)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid session")
	}

	// Check session expiry
	if time.Since(session.LastSeen) > am.config.SessionTimeout {
		am.invalidateSession(sessionID)
		return nil, nil, fmt.Errorf("session expired")
	}

	// Get user from database
	user, err := am.config.DB.Users().GetByID(c.Request.Context(), session.UserID)
	if err != nil {
		return nil, nil, fmt.Errorf("user not found")
	}

	// Check if user is active
	if !user.IsActive {
		am.invalidateSession(sessionID)
		return nil, nil, fmt.Errorf("user account is disabled")
	}

	return user, session, nil
}

// CreateSession creates a new user session
func (am *AuthMiddleware) CreateSession(ctx context.Context, user *models.User, c *gin.Context) (string, error) {
	if !am.config.EnableSessions {
		return "", fmt.Errorf("sessions not enabled")
	}

	// Generate session ID
	sessionID, err := am.generateSessionID()
	if err != nil {
		return "", fmt.Errorf("failed to generate session ID: %v", err)
	}

	// Create session data
	session := &SessionData{
		UserID:    user.ID,
		Username:  user.Username,
		Role:      user.Role,
		IPAddress: am.getClientIP(c),
		UserAgent: c.GetHeader("User-Agent"),
		CreatedAt: time.Now().UTC(),
		LastSeen:  time.Now().UTC(),
		IsActive:  true,
	}

	// Store session in memory
	am.mutex.Lock()
	am.sessions[sessionID] = session
	am.mutex.Unlock()

	// Store session in database
	if err := am.saveSessionToDB(ctx, sessionID, session); err != nil {
		// Remove from memory if database save fails
		am.mutex.Lock()
		delete(am.sessions, sessionID)
		am.mutex.Unlock()
		return "", fmt.Errorf("failed to save session: %v", err)
	}

	// Set session cookie
	c.SetCookie(
		am.config.SessionCookieName,
		sessionID,
		int(am.config.SessionTimeout.Seconds()),
		"/",
		"",
		false, // Set to true for HTTPS only
		true,  // HttpOnly
	)

	return sessionID, nil
}

// InvalidateSession invalidates a session
func (am *AuthMiddleware) InvalidateSession(ctx context.Context, sessionID string) error {
	// Remove from memory
	am.invalidateSession(sessionID)

	// Remove from database
	return am.removeSessionFromDB(ctx, sessionID)
}

// InvalidateUserSessions invalidates all sessions for a user
func (am *AuthMiddleware) InvalidateUserSessions(ctx context.Context, userID int) error {
	// Remove from memory
	am.mutex.Lock()
	for sessionID, session := range am.sessions {
		if session.UserID == userID {
			delete(am.sessions, sessionID)
		}
	}
	am.mutex.Unlock()

	// Remove from database
	return am.removeUserSessionsFromDB(ctx, userID)
}

// GetUserSessions gets all sessions for a user
func (am *AuthMiddleware) GetUserSessions(ctx context.Context, userID int) ([]SessionData, error) {
	var sessions []SessionData

	// Get from memory
	am.mutex.RLock()
	for _, session := range am.sessions {
		if session.UserID == userID && session.IsActive {
			sessions = append(sessions, *session)
		}
	}
	am.mutex.RUnlock()

	// Also get from database to ensure completeness
	dbSessions, err := am.getUserSessionsFromDB(ctx, userID)
	if err != nil {
		return sessions, err
	}

	// Merge and deduplicate
	sessionMap := make(map[string]SessionData)
	for _, session := range sessions {
		sessionMap[fmt.Sprintf("%d-%s", session.UserID, session.TokenHash)] = session
	}
	for _, session := range dbSessions {
		sessionMap[fmt.Sprintf("%d-%s", session.UserID, session.TokenHash)] = session
	}

	result := make([]SessionData, 0, len(sessionMap))
	for _, session := range sessionMap {
		result = append(result, session)
	}

	return result, nil
}

// RecordLoginAttempt records a login attempt for rate limiting
func (am *AuthMiddleware) RecordLoginAttempt(ctx context.Context, ipAddress, username, userAgent string, success bool, errorReason string) {
	// Record in database
	am.recordLoginAttemptDB(ctx, ipAddress, username, userAgent, success, errorReason)

	// Update in-memory rate limiting
	am.mutex.Lock()
	defer am.mutex.Unlock()

	attempts, exists := am.loginAttempts[ipAddress]
	if !exists {
		attempts = &LoginAttempts{}
		am.loginAttempts[ipAddress] = attempts
	}

	attempts.LastAttempt = time.Now()

	if success {
		// Reset on successful login
		attempts.Count = 0
		attempts.LockedUntil = nil
	} else {
		attempts.Count++
		if attempts.Count >= am.config.MaxLoginAttempts {
			lockUntil := time.Now().Add(am.config.LockoutDuration)
			attempts.LockedUntil = &lockUntil
		}
	}
}

// CleanupSessions removes expired sessions
func (am *AuthMiddleware) CleanupSessions(ctx context.Context) (int, error) {
	cutoff := time.Now().Add(-am.config.SessionTimeout)
	deleted := 0

	// Clean up memory sessions
	am.mutex.Lock()
	for sessionID, session := range am.sessions {
		if session.LastSeen.Before(cutoff) {
			delete(am.sessions, sessionID)
			deleted++
		}
	}
	am.mutex.Unlock()

	// Clean up database sessions
	dbDeleted, err := am.cleanupSessionsFromDB(ctx, cutoff)
	if err != nil {
		return deleted, err
	}

	return deleted + dbDeleted, nil
}

// Helper methods

func (am *AuthMiddleware) isAnonymousAllowed(path string) bool {
	for _, allowedPath := range am.config.AllowAnonymous {
		if strings.HasPrefix(path, allowedPath) {
			return true
		}
	}
	return false
}

func (am *AuthMiddleware) getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header first
	if forwarded := c.GetHeader("X-Forwarded-For"); forwarded != "" {
		if ips := strings.Split(forwarded, ","); len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	if realIP := c.GetHeader("X-Real-IP"); realIP != "" {
		return realIP
	}

	// Fall back to remote address
	return c.ClientIP()
}

func (am *AuthMiddleware) hasRole(userRole, requiredRole string) bool {
	// Simple role hierarchy: admin > manager > user
	roleHierarchy := map[string]int{
		"admin":   3,
		"manager": 2,
		"user":    1,
	}

	userLevel, exists := roleHierarchy[userRole]
	if !exists {
		return false
	}

	requiredLevel, exists := roleHierarchy[requiredRole]
	if !exists {
		return false
	}

	return userLevel >= requiredLevel
}

func (am *AuthMiddleware) setUserContext(c *gin.Context, user *models.User, session *SessionData) {
	c.Set("user_id", user.ID)
	c.Set("user_email", user.Email)
	c.Set("user_name", user.Username)
	c.Set("user_role", user.Role)
	c.Set("user_active", user.IsActive)

	if session != nil {
		c.Set("session_id", fmt.Sprintf("%p", session)) // Use memory address as session ID
		c.Set("session_created", session.CreatedAt)
		c.Set("session_last_seen", session.LastSeen)
	}
}

func (am *AuthMiddleware) respondUnauthorized(c *gin.Context, message string) {
	response := models.NewErrorResponse(
		models.ErrCodeAuthentication,
		message,
		nil,
	)
	c.JSON(http.StatusUnauthorized, response)
	c.Abort()
}

func (am *AuthMiddleware) generateSessionID() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (am *AuthMiddleware) getSession(ctx context.Context, sessionID string) (*SessionData, error) {
	// Try memory first
	am.mutex.RLock()
	session, exists := am.sessions[sessionID]
	am.mutex.RUnlock()

	if exists && session.IsActive {
		return session, nil
	}

	// Try database
	return am.getSessionFromDB(ctx, sessionID)
}

func (am *AuthMiddleware) invalidateSession(sessionID string) {
	am.mutex.Lock()
	delete(am.sessions, sessionID)
	am.mutex.Unlock()
}

func (am *AuthMiddleware) updateSessionLastSeen(session *SessionData) {
	am.mutex.Lock()
	session.LastSeen = time.Now().UTC()
	am.mutex.Unlock()

	// Optionally update database asynchronously
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		am.updateSessionLastSeenDB(ctx, session)
	}()
}

// Database operations (implement these based on your database schema)

func (am *AuthMiddleware) saveSessionToDB(ctx context.Context, sessionID string, session *SessionData) error {
	query := `
		INSERT INTO user_sessions (id, user_id, expires_at, created_at, last_seen, ip_address, user_agent, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET
			expires_at = EXCLUDED.expires_at,
			last_seen = EXCLUDED.last_seen,
			is_active = EXCLUDED.is_active`

	expiresAt := session.CreatedAt.Add(am.config.SessionTimeout)
	
	_, err := am.config.DB.Exec(query,
		sessionID,
		session.UserID,
		expiresAt,
		session.CreatedAt,
		session.LastSeen,
		session.IPAddress,
		session.UserAgent,
		session.IsActive,
	)
	return err
}

func (am *AuthMiddleware) getSessionFromDB(ctx context.Context, sessionID string) (*SessionData, error) {
	query := `
		SELECT user_id, ip_address, user_agent, created_at, last_seen, is_active
		FROM user_sessions 
		WHERE id = $1 AND is_active = true AND expires_at > NOW()`

	var session SessionData
	err := am.config.DB.QueryRow(query, sessionID).Scan(
		&session.UserID,
		&session.IPAddress,
		&session.UserAgent,
		&session.CreatedAt,
		&session.LastSeen,
		&session.IsActive,
	)
	if err != nil {
		return nil, err
	}

	// Get username and role from user table
	userQuery := `SELECT username, role FROM users WHERE id = $1`
	err = am.config.DB.QueryRow(userQuery, session.UserID).Scan(
		&session.Username,
		&session.Role,
	)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (am *AuthMiddleware) removeSessionFromDB(ctx context.Context, sessionID string) error {
	query := `UPDATE user_sessions SET is_active = false WHERE id = $1`
	_, err := am.config.DB.Exec(query, sessionID)
	return err
}

func (am *AuthMiddleware) removeUserSessionsFromDB(ctx context.Context, userID int) error {
	query := `UPDATE user_sessions SET is_active = false WHERE user_id = $1`
	_, err := am.config.DB.Exec(query, userID)
	return err
}

func (am *AuthMiddleware) getUserSessionsFromDB(ctx context.Context, userID int) ([]SessionData, error) {
	query := `
		SELECT id, user_id, ip_address, user_agent, created_at, last_seen, is_active
		FROM user_sessions 
		WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
		ORDER BY last_seen DESC`

	rows, err := am.config.DB.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []SessionData
	for rows.Next() {
		var session SessionData
		var sessionID string
		err := rows.Scan(
			&sessionID,
			&session.UserID,
			&session.IPAddress,
			&session.UserAgent,
			&session.CreatedAt,
			&session.LastSeen,
			&session.IsActive,
		)
		if err != nil {
			continue
		}
		sessions = append(sessions, session)
	}

	return sessions, nil
}

func (am *AuthMiddleware) updateSessionLastSeenDB(ctx context.Context, session *SessionData) error {
	query := `UPDATE user_sessions SET last_seen = $1 WHERE user_id = $2 AND is_active = true`
	_, err := am.config.DB.Exec(query, session.LastSeen, session.UserID)
	return err
}

func (am *AuthMiddleware) cleanupSessionsFromDB(ctx context.Context, cutoff time.Time) (int, error) {
	query := `UPDATE user_sessions SET is_active = false WHERE last_seen < $1 AND is_active = true`
	result, err := am.config.DB.Exec(query, cutoff)
	if err != nil {
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}

	return int(rowsAffected), nil
}

func (am *AuthMiddleware) recordLoginAttemptDB(ctx context.Context, ipAddress, username, userAgent string, success bool, errorReason string) {
	query := `
		INSERT INTO login_attempts (ip_address, username, success, timestamp, user_agent, error_reason)
		VALUES ($1, $2, $3, NOW(), $4, $5)`

	// Parse IP address
	var ipNet net.IP
	if ip := net.ParseIP(ipAddress); ip != nil {
		ipNet = ip
	}

	_, err := am.config.DB.Exec(query, ipNet, username, success, userAgent, errorReason)
	if err != nil {
		fmt.Printf("Failed to record login attempt: %v\n", err)
	}
}
