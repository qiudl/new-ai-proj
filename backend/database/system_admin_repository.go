package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// SystemAdminRepository handles database operations for system administrators
type SystemAdminRepository struct {
	db *sql.DB
}

// NewSystemAdminRepository creates a new system admin repository
func NewSystemAdminRepository(db *sql.DB) *SystemAdminRepository {
	return &SystemAdminRepository{db: db}
}

// SystemAdminInfo represents system administrator information
type SystemAdminInfo struct {
	UserID             int                    `json:"user_id"`
	Username           string                 `json:"username"`
	Email              string                 `json:"email"`
	IsSystemAdmin      bool                   `json:"is_system_admin"`
	AdminLevel         int                    `json:"admin_level"`
	AdminScopes        map[string]interface{} `json:"admin_scopes"`
	SystemRoleID       *int                   `json:"system_role_id,omitempty"`
	AdminActivatedAt   *time.Time             `json:"admin_activated_at,omitempty"`
	AdminDeactivatedAt *time.Time             `json:"admin_deactivated_at,omitempty"`
	AdminNotes         *string                `json:"admin_notes,omitempty"`
}

// GetSystemAdminByUserID retrieves system admin info by user ID
func (r *SystemAdminRepository) GetSystemAdminByUserID(ctx context.Context, userID int) (*SystemAdminInfo, error) {
	query := `
		SELECT
			id,
			username,
			email,
			COALESCE(is_system_admin, false) as is_system_admin,
			COALESCE(admin_level, 0) as admin_level,
			COALESCE(admin_scopes, '{}'::jsonb) as admin_scopes,
			system_role_id,
			admin_activated_at,
			admin_deactivated_at,
			admin_notes
		FROM system_users
		WHERE id = $1
		  AND is_active = true
		  AND deleted_at IS NULL`

	var adminInfo SystemAdminInfo
	var adminScopesJSON []byte

	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&adminInfo.UserID,
		&adminInfo.Username,
		&adminInfo.Email,
		&adminInfo.IsSystemAdmin,
		&adminInfo.AdminLevel,
		&adminScopesJSON,
		&adminInfo.SystemRoleID,
		&adminInfo.AdminActivatedAt,
		&adminInfo.AdminDeactivatedAt,
		&adminInfo.AdminNotes,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found or not a system user")
		}
		return nil, fmt.Errorf("failed to get system admin info: %w", err)
	}

	// Parse JSONB admin_scopes
	if err := json.Unmarshal(adminScopesJSON, &adminInfo.AdminScopes); err != nil {
		return nil, fmt.Errorf("failed to parse admin_scopes: %w", err)
	}

	return &adminInfo, nil
}

// GetSystemAdminByUsername retrieves system admin info by username
func (r *SystemAdminRepository) GetSystemAdminByUsername(ctx context.Context, username string) (*SystemAdminInfo, error) {
	query := `
		SELECT
			id,
			username,
			email,
			COALESCE(is_system_admin, false) as is_system_admin,
			COALESCE(admin_level, 0) as admin_level,
			COALESCE(admin_scopes, '{}'::jsonb) as admin_scopes,
			system_role_id,
			admin_activated_at,
			admin_deactivated_at,
			admin_notes
		FROM system_users
		WHERE username = $1
		  AND is_active = true
		  AND deleted_at IS NULL`

	var adminInfo SystemAdminInfo
	var adminScopesJSON []byte

	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&adminInfo.UserID,
		&adminInfo.Username,
		&adminInfo.Email,
		&adminInfo.IsSystemAdmin,
		&adminInfo.AdminLevel,
		&adminScopesJSON,
		&adminInfo.SystemRoleID,
		&adminInfo.AdminActivatedAt,
		&adminInfo.AdminDeactivatedAt,
		&adminInfo.AdminNotes,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found: %s", username)
		}
		return nil, fmt.Errorf("failed to get system admin info: %w", err)
	}

	// Parse JSONB admin_scopes
	if err := json.Unmarshal(adminScopesJSON, &adminInfo.AdminScopes); err != nil {
		return nil, fmt.Errorf("failed to parse admin_scopes: %w", err)
	}

	return &adminInfo, nil
}

// ListSystemAdmins retrieves all active system administrators
func (r *SystemAdminRepository) ListSystemAdmins(ctx context.Context, filters SystemAdminFilters) ([]*SystemAdminInfo, error) {
	query := `
		SELECT
			id,
			username,
			email,
			COALESCE(is_system_admin, false) as is_system_admin,
			COALESCE(admin_level, 0) as admin_level,
			COALESCE(admin_scopes, '{}'::jsonb) as admin_scopes,
			system_role_id,
			admin_activated_at,
			admin_deactivated_at,
			admin_notes
		FROM system_users
		WHERE is_system_admin = true
		  AND is_active = true
		  AND deleted_at IS NULL`

	// Add optional filters
	args := []interface{}{}
	argPos := 1

	if filters.MinAdminLevel > 0 {
		query += fmt.Sprintf(" AND admin_level >= $%d", argPos)
		args = append(args, filters.MinAdminLevel)
		argPos++
	}

	if filters.MaxAdminLevel > 0 {
		query += fmt.Sprintf(" AND admin_level <= $%d", argPos)
		args = append(args, filters.MaxAdminLevel)
		argPos++
	}

	query += " ORDER BY admin_level ASC, username ASC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list system admins: %w", err)
	}
	defer rows.Close()

	var admins []*SystemAdminInfo

	for rows.Next() {
		var adminInfo SystemAdminInfo
		var adminScopesJSON []byte

		err := rows.Scan(
			&adminInfo.UserID,
			&adminInfo.Username,
			&adminInfo.Email,
			&adminInfo.IsSystemAdmin,
			&adminInfo.AdminLevel,
			&adminScopesJSON,
			&adminInfo.SystemRoleID,
			&adminInfo.AdminActivatedAt,
			&adminInfo.AdminDeactivatedAt,
			&adminInfo.AdminNotes,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan admin row: %w", err)
		}

		// Parse JSONB
		if err := json.Unmarshal(adminScopesJSON, &adminInfo.AdminScopes); err != nil {
			return nil, fmt.Errorf("failed to parse admin_scopes: %w", err)
		}

		admins = append(admins, &adminInfo)
	}

	return admins, nil
}

// SystemAdminFilters defines filters for listing system admins
type SystemAdminFilters struct {
	MinAdminLevel int
	MaxAdminLevel int
}

// GrantSystemAdminRequest represents request to grant system admin privileges
type GrantSystemAdminRequest struct {
	TargetUserID     int                    `json:"target_user_id"`
	AdminLevel       int                    `json:"admin_level"`
	AdminScopes      map[string]interface{} `json:"admin_scopes"`
	SystemRoleID     *int                   `json:"system_role_id,omitempty"`
	Notes            string                 `json:"notes"`
	OperatorUserID   int                    `json:"operator_user_id"`
	OperatorUsername string                 `json:"operator_username"`
}

// GrantSystemAdmin grants system administrator privileges to a user
func (r *SystemAdminRepository) GrantSystemAdmin(ctx context.Context, req *GrantSystemAdminRequest) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Convert admin_scopes to JSONB
	adminScopesJSON, err := json.Marshal(req.AdminScopes)
	if err != nil {
		return fmt.Errorf("failed to marshal admin_scopes: %w", err)
	}

	// Update system_users table
	updateQuery := `
		UPDATE system_users
		SET is_system_admin = true,
		    admin_level = $1,
		    admin_scopes = $2::jsonb,
		    system_role_id = $3,
		    admin_activated_at = NOW(),
		    admin_deactivated_at = NULL,
		    admin_notes = $4,
		    updated_at = NOW()
		WHERE id = $5 AND deleted_at IS NULL`

	result, err := tx.ExecContext(ctx, updateQuery,
		req.AdminLevel,
		adminScopesJSON,
		req.SystemRoleID,
		req.Notes,
		req.TargetUserID,
	)
	if err != nil {
		return fmt.Errorf("failed to grant system admin: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found or already deleted")
	}

	// Log audit entry
	if err := r.logAuditEntry(ctx, tx, AuditLogEntry{
		OperatorUserID:   req.OperatorUserID,
		OperatorUsername: req.OperatorUsername,
		TargetUserID:     &req.TargetUserID,
		Action:           "grant_system_admin",
		ActionType:       "create",
		ChangeSummary:    fmt.Sprintf("Granted system admin privileges to user %d (Level %d)", req.TargetUserID, req.AdminLevel),
		NewValue: map[string]interface{}{
			"admin_level":  req.AdminLevel,
			"admin_scopes": req.AdminScopes,
			"notes":        req.Notes,
		},
		RiskLevel: "high",
	}); err != nil {
		return fmt.Errorf("failed to log audit entry: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// RevokeSystemAdminRequest represents request to revoke system admin privileges
type RevokeSystemAdminRequest struct {
	TargetUserID     int    `json:"target_user_id"`
	Reason           string `json:"reason"`
	OperatorUserID   int    `json:"operator_user_id"`
	OperatorUsername string `json:"operator_username"`
}

// RevokeSystemAdmin revokes system administrator privileges from a user
func (r *SystemAdminRepository) RevokeSystemAdmin(ctx context.Context, req *RevokeSystemAdminRequest) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Get current admin info for audit log
	var oldAdminLevel int
	var oldAdminScopes []byte
	queryOldValue := `SELECT admin_level, admin_scopes FROM system_users WHERE id = $1`
	err = tx.QueryRowContext(ctx, queryOldValue, req.TargetUserID).Scan(&oldAdminLevel, &oldAdminScopes)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to get current admin info: %w", err)
	}

	// Update system_users table
	updateQuery := `
		UPDATE system_users
		SET is_system_admin = false,
		    admin_level = 0,
		    admin_scopes = '{}'::jsonb,
		    admin_deactivated_at = NOW(),
		    admin_notes = CASE
		        WHEN admin_notes IS NULL THEN $1
		        ELSE admin_notes || E'\n' || $1
		    END,
		    updated_at = NOW()
		WHERE id = $2 AND deleted_at IS NULL`

	note := fmt.Sprintf("[%s] Revoked: %s", time.Now().Format("2006-01-02 15:04"), req.Reason)
	result, err := tx.ExecContext(ctx, updateQuery, note, req.TargetUserID)
	if err != nil {
		return fmt.Errorf("failed to revoke system admin: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found or already deleted")
	}

	// Parse old admin scopes for audit log
	var oldScopes map[string]interface{}
	json.Unmarshal(oldAdminScopes, &oldScopes)

	// Log audit entry
	if err := r.logAuditEntry(ctx, tx, AuditLogEntry{
		OperatorUserID:   req.OperatorUserID,
		OperatorUsername: req.OperatorUsername,
		TargetUserID:     &req.TargetUserID,
		Action:           "revoke_system_admin",
		ActionType:       "delete",
		ChangeSummary:    fmt.Sprintf("Revoked system admin privileges from user %d. Reason: %s", req.TargetUserID, req.Reason),
		OldValue: map[string]interface{}{
			"admin_level":  oldAdminLevel,
			"admin_scopes": oldScopes,
		},
		NewValue: map[string]interface{}{
			"admin_level":  0,
			"admin_scopes": map[string]interface{}{},
		},
		RiskLevel: "high",
	}); err != nil {
		return fmt.Errorf("failed to log audit entry: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// AuditLogEntry represents an audit log entry
type AuditLogEntry struct {
	OperatorUserID   int                    `json:"operator_user_id"`
	OperatorUsername string                 `json:"operator_username"`
	TargetUserID     *int                   `json:"target_user_id,omitempty"`
	TargetUsername   *string                `json:"target_username,omitempty"`
	Action           string                 `json:"action"`
	ActionType       string                 `json:"action_type"`
	ChangeSummary    string                 `json:"change_summary"`
	OldValue         map[string]interface{} `json:"old_value,omitempty"`
	NewValue         map[string]interface{} `json:"new_value,omitempty"`
	RiskLevel        string                 `json:"risk_level"`
}

// logAuditEntry logs an audit entry to system_admin_audit_logs table
func (r *SystemAdminRepository) logAuditEntry(ctx context.Context, tx *sql.Tx, entry AuditLogEntry) error {
	oldValueJSON, _ := json.Marshal(entry.OldValue)
	newValueJSON, _ := json.Marshal(entry.NewValue)

	query := `
		INSERT INTO system_admin_audit_logs (
			operator_user_id,
			operator_username,
			operator_role,
			target_user_id,
			target_username,
			action,
			action_type,
			change_summary,
			old_value,
			new_value,
			risk_level,
			created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`

	_, err := tx.ExecContext(ctx, query,
		entry.OperatorUserID,
		entry.OperatorUsername,
		"system_admin", // operator_role
		entry.TargetUserID,
		entry.TargetUsername,
		entry.Action,
		entry.ActionType,
		entry.ChangeSummary,
		oldValueJSON,
		newValueJSON,
		entry.RiskLevel,
	)

	if err != nil {
		return fmt.Errorf("failed to insert audit log: %w", err)
	}

	return nil
}

// GetAuditLogs retrieves audit logs with pagination
func (r *SystemAdminRepository) GetAuditLogs(ctx context.Context, filters AuditLogFilters) ([]*AuditLogRecord, int, error) {
	query := `
		SELECT
			id,
			operator_user_id,
			operator_username,
			target_user_id,
			target_username,
			action,
			action_type,
			change_summary,
			risk_level,
			created_at
		FROM system_admin_audit_logs
		WHERE 1=1`

	args := []interface{}{}
	argPos := 1

	if filters.TargetUserID > 0 {
		query += fmt.Sprintf(" AND target_user_id = $%d", argPos)
		args = append(args, filters.TargetUserID)
		argPos++
	}

	if filters.OperatorUserID > 0 {
		query += fmt.Sprintf(" AND operator_user_id = $%d", argPos)
		args = append(args, filters.OperatorUserID)
		argPos++
	}

	query += " ORDER BY created_at DESC"

	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argPos, argPos+1)
		args = append(args, filters.Limit, filters.Offset)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get audit logs: %w", err)
	}
	defer rows.Close()

	var records []*AuditLogRecord

	for rows.Next() {
		var record AuditLogRecord
		err := rows.Scan(
			&record.ID,
			&record.OperatorUserID,
			&record.OperatorUsername,
			&record.TargetUserID,
			&record.TargetUsername,
			&record.Action,
			&record.ActionType,
			&record.ChangeSummary,
			&record.RiskLevel,
			&record.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan audit log row: %w", err)
		}

		records = append(records, &record)
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM system_admin_audit_logs WHERE 1=1"
	countArgs := []interface{}{}
	countArgPos := 1

	if filters.TargetUserID > 0 {
		countQuery += fmt.Sprintf(" AND target_user_id = $%d", countArgPos)
		countArgs = append(countArgs, filters.TargetUserID)
		countArgPos++
	}

	if filters.OperatorUserID > 0 {
		countQuery += fmt.Sprintf(" AND operator_user_id = $%d", countArgPos)
		countArgs = append(countArgs, filters.OperatorUserID)
	}

	var total int
	err = r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %w", err)
	}

	return records, total, nil
}

// AuditLogFilters defines filters for audit log queries
type AuditLogFilters struct {
	TargetUserID   int
	OperatorUserID int
	Limit          int
	Offset         int
}

// AuditLogRecord represents an audit log record
type AuditLogRecord struct {
	ID               int        `json:"id"`
	OperatorUserID   int        `json:"operator_user_id"`
	OperatorUsername string     `json:"operator_username"`
	TargetUserID     *int       `json:"target_user_id,omitempty"`
	TargetUsername   *string    `json:"target_username,omitempty"`
	Action           string     `json:"action"`
	ActionType       string     `json:"action_type"`
	ChangeSummary    string     `json:"change_summary"`
	RiskLevel        string     `json:"risk_level"`
	CreatedAt        time.Time  `json:"created_at"`
}
