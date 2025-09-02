package database

import (
	"database/sql"
	"time"
)

// UserStatsRepository handles user statistics queries
type UserStatsRepository struct {
	db DB
}

// NewUserStatsRepository creates a new user statistics repository
func NewUserStatsRepository(db DB) *UserStatsRepository {
	return &UserStatsRepository{db: db}
}

// BasicStats represents basic user statistics
type BasicStats struct {
	TotalUsers            int `json:"total_users" db:"total_users"`
	ActiveUsers           int `json:"active_users" db:"active_users"`
	InactiveUsers         int `json:"inactive_users" db:"inactive_users"`
	SuspendedUsers        int `json:"suspended_users" db:"suspended_users"`
	SystemUsers           int `json:"system_users" db:"system_users"`
	CompanyUsers          int `json:"company_users" db:"company_users"`
	ActiveLastWeek        int `json:"active_last_week" db:"active_last_week"`
	ActiveLastMonth       int `json:"active_last_month" db:"active_last_month"`
	NewRegistrationsWeek  int `json:"new_registrations_week" db:"new_registrations_week"`
	NewRegistrationsMonth int `json:"new_registrations_month" db:"new_registrations_month"`
}

// RoleStats represents user role distribution statistics
type RoleStats struct {
	Role           string `json:"role" db:"role"`
	UserType       string `json:"user_type" db:"user_type"`
	UserCount      int    `json:"user_count" db:"user_count"`
	ActiveCount    int    `json:"active_count" db:"active_count"`
	RecentlyActive int    `json:"recently_active" db:"recently_active"`
}

// UserActivity represents individual user activity statistics
type UserActivity struct {
	UserID              int        `json:"user_id" db:"user_id"`
	Username            string     `json:"username" db:"username"`
	Email               string     `json:"email" db:"email"`
	UserType            string     `json:"user_type" db:"user_type"`
	Role                string     `json:"role" db:"role"`
	Status              string     `json:"status" db:"status"`
	LastLoginAt         *time.Time `json:"last_login_at" db:"last_login_at"`
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
	AssignedTasks       int        `json:"assigned_tasks" db:"assigned_tasks"`
	CompletedTasks      int        `json:"completed_tasks" db:"completed_tasks"`
	InProgressTasks     int        `json:"in_progress_tasks" db:"in_progress_tasks"`
	TotalTimeMinutes    int        `json:"total_time_minutes" db:"total_time_minutes"`
	ActiveTimerSessions int        `json:"active_timer_sessions" db:"active_sessions"`
	LoginActivity       string     `json:"login_activity" db:"login_activity"`
}

// CompanyStats represents company user statistics
type CompanyStats struct {
	CompanyID           int        `json:"company_id" db:"company_id"`
	CompanyName         string     `json:"company_name" db:"company_name"`
	CompanyCode         string     `json:"company_code" db:"company_code"`
	TotalCompanyUsers   int        `json:"total_company_users" db:"total_company_users"`
	ActiveCompanyUsers  int        `json:"active_company_users" db:"active_company_users"`
	PrimaryContacts     int        `json:"primary_contacts" db:"primary_contacts"`
	RecentlyActiveUsers int        `json:"recently_active_users" db:"recently_active_users"`
	ExpiringAccounts    int        `json:"expiring_accounts" db:"expiring_accounts"`
	FirstUserCreated    *time.Time `json:"first_user_created" db:"first_user_created"`
	LastCompanyActivity *time.Time `json:"last_company_activity" db:"last_company_activity"`
}

// RegistrationTrend represents user registration trends
type RegistrationTrend struct {
	WeekStart            time.Time `json:"week_start" db:"week_start"`
	Registrations        int       `json:"registrations" db:"registrations"`
	SystemRegistrations  int       `json:"system_registrations" db:"system_registrations"`
	CompanyRegistrations int       `json:"company_registrations" db:"company_registrations"`
	CumulativeTotal      int       `json:"cumulative_total" db:"cumulative_total"`
}

// UserPerformance represents user performance metrics
type UserPerformance struct {
	UserID               int     `json:"user_id" db:"user_id"`
	Username             string  `json:"username" db:"username"`
	Role                 string  `json:"role" db:"role"`
	UserType             string  `json:"user_type" db:"user_type"`
	TotalTasksAssigned   int     `json:"total_tasks_assigned" db:"total_tasks_assigned"`
	CompletedTasks       int     `json:"completed_tasks" db:"completed_tasks"`
	CompletionPercentage float64 `json:"completion_percentage" db:"completion_percentage"`
	TotalHoursLogged     float64 `json:"total_hours_logged" db:"total_hours_logged"`
	AvgSessionHours      float64 `json:"avg_session_hours" db:"avg_session_hours"`
	DaysSinceLastLogin   int     `json:"days_since_last_login" db:"days_since_last_login"`
	ProjectsInvolved     int     `json:"projects_involved" db:"projects_involved"`
}

// GetBasicStats retrieves basic user statistics
func (r *UserStatsRepository) GetBasicStats() (*BasicStats, error) {
	var stats BasicStats
	dbConn := r.db.GetDB().(*sql.DB)

	query := `SELECT * FROM user_basic_stats_view`
	err := dbConn.QueryRow(query).Scan(
		&stats.TotalUsers,
		&stats.ActiveUsers,
		&stats.InactiveUsers,
		&stats.SuspendedUsers,
		&stats.SystemUsers,
		&stats.CompanyUsers,
		&stats.ActiveLastWeek,
		&stats.ActiveLastMonth,
		&stats.NewRegistrationsWeek,
		&stats.NewRegistrationsMonth,
	)

	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// GetRoleStats retrieves user role distribution statistics
func (r *UserStatsRepository) GetRoleStats() ([]RoleStats, error) {
	var stats []RoleStats
	dbConn := r.db.GetDB().(*sql.DB)

	query := `SELECT role, user_type, user_count, active_count, recently_active 
	          FROM user_role_stats_view`

	rows, err := dbConn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var stat RoleStats
		err := rows.Scan(
			&stat.Role,
			&stat.UserType,
			&stat.UserCount,
			&stat.ActiveCount,
			&stat.RecentlyActive,
		)
		if err != nil {
			return nil, err
		}
		stats = append(stats, stat)
	}

	return stats, nil
}

// GetUserActivity retrieves user activity statistics with pagination
func (r *UserStatsRepository) GetUserActivity(limit, offset int) ([]UserActivity, error) {
	var activities []UserActivity
	dbConn := r.db.GetDB().(*sql.DB)

	query := `SELECT user_id, username, email, user_type, role, status,
	                 last_login_at, created_at, assigned_tasks, completed_tasks,
	                 in_progress_tasks, total_time_minutes, active_timer_sessions,
	                 login_activity
	          FROM user_activity_stats_view
	          ORDER BY total_time_minutes DESC, completed_tasks DESC
	          LIMIT $1 OFFSET $2`

	rows, err := dbConn.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var activity UserActivity
		err := rows.Scan(
			&activity.UserID,
			&activity.Username,
			&activity.Email,
			&activity.UserType,
			&activity.Role,
			&activity.Status,
			&activity.LastLoginAt,
			&activity.CreatedAt,
			&activity.AssignedTasks,
			&activity.CompletedTasks,
			&activity.InProgressTasks,
			&activity.TotalTimeMinutes,
			&activity.ActiveTimerSessions,
			&activity.LoginActivity,
		)
		if err != nil {
			return nil, err
		}
		activities = append(activities, activity)
	}

	return activities, nil
}

// GetCompanyStats retrieves company user statistics
func (r *UserStatsRepository) GetCompanyStats() ([]CompanyStats, error) {
	var stats []CompanyStats
	dbConn := r.db.GetDB().(*sql.DB)

	query := `SELECT company_id, company_name, company_code, total_company_users,
	                 active_company_users, primary_contacts, recently_active_users,
	                 expiring_accounts, first_user_created, last_company_activity
	          FROM user_company_stats_view`

	rows, err := dbConn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var stat CompanyStats
		err := rows.Scan(
			&stat.CompanyID,
			&stat.CompanyName,
			&stat.CompanyCode,
			&stat.TotalCompanyUsers,
			&stat.ActiveCompanyUsers,
			&stat.PrimaryContacts,
			&stat.RecentlyActiveUsers,
			&stat.ExpiringAccounts,
			&stat.FirstUserCreated,
			&stat.LastCompanyActivity,
		)
		if err != nil {
			return nil, err
		}
		stats = append(stats, stat)
	}

	return stats, nil
}

// GetRegistrationTrends retrieves user registration trends
func (r *UserStatsRepository) GetRegistrationTrends() ([]RegistrationTrend, error) {
	var trends []RegistrationTrend
	dbConn := r.db.GetDB().(*sql.DB)

	query := `SELECT week_start, registrations, system_registrations,
	                 company_registrations, cumulative_total
	          FROM user_registration_trends_view`

	rows, err := dbConn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var trend RegistrationTrend
		err := rows.Scan(
			&trend.WeekStart,
			&trend.Registrations,
			&trend.SystemRegistrations,
			&trend.CompanyRegistrations,
			&trend.CumulativeTotal,
		)
		if err != nil {
			return nil, err
		}
		trends = append(trends, trend)
	}

	return trends, nil
}

// GetUserPerformance retrieves user performance metrics with pagination
func (r *UserStatsRepository) GetUserPerformance(limit, offset int) ([]UserPerformance, error) {
	var performances []UserPerformance
	dbConn := r.db.GetDB().(*sql.DB)

	query := `SELECT user_id, username, role, user_type, total_tasks_assigned,
	                 completed_tasks, completion_percentage, total_hours_logged,
	                 avg_session_hours, days_since_last_login, projects_involved
	          FROM user_performance_view
	          ORDER BY completion_percentage DESC, total_hours_logged DESC
	          LIMIT $1 OFFSET $2`

	rows, err := dbConn.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var perf UserPerformance
		err := rows.Scan(
			&perf.UserID,
			&perf.Username,
			&perf.Role,
			&perf.UserType,
			&perf.TotalTasksAssigned,
			&perf.CompletedTasks,
			&perf.CompletionPercentage,
			&perf.TotalHoursLogged,
			&perf.AvgSessionHours,
			&perf.DaysSinceLastLogin,
			&perf.ProjectsInvolved,
		)
		if err != nil {
			return nil, err
		}
		performances = append(performances, perf)
	}

	return performances, nil
}

// GetActiveUsersCount returns the count of active users with recent activity
func (r *UserStatsRepository) GetActiveUsersCount(days int) (int, error) {
	dbConn := r.db.GetDB().(*sql.DB)

	query := `SELECT COUNT(*) FROM users 
	          WHERE status = 'active' 
	          AND last_login_at >= NOW() - INTERVAL '%d days'`

	var count int
	err := dbConn.QueryRow(query, days).Scan(&count)
	return count, err
}

// GetTopPerformers returns top performing users by completion rate
func (r *UserStatsRepository) GetTopPerformers(limit int) ([]UserPerformance, error) {
	var performers []UserPerformance
	dbConn := r.db.GetDB().(*sql.DB)

	query := `SELECT user_id, username, role, user_type, total_tasks_assigned,
	                 completed_tasks, completion_percentage, total_hours_logged,
	                 avg_session_hours, days_since_last_login, projects_involved
	          FROM user_performance_view
	          WHERE total_tasks_assigned >= 3  -- Only users with significant task assignment
	          ORDER BY completion_percentage DESC, completed_tasks DESC
	          LIMIT $1`

	rows, err := dbConn.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var perf UserPerformance
		err := rows.Scan(
			&perf.UserID,
			&perf.Username,
			&perf.Role,
			&perf.UserType,
			&perf.TotalTasksAssigned,
			&perf.CompletedTasks,
			&perf.CompletionPercentage,
			&perf.TotalHoursLogged,
			&perf.AvgSessionHours,
			&perf.DaysSinceLastLogin,
			&perf.ProjectsInvolved,
		)
		if err != nil {
			return nil, err
		}
		performers = append(performers, perf)
	}

	return performers, nil
}
