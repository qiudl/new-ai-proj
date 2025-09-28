package services

import (
	"context"
	"database/sql"
	"fmt"
	"math/rand"
	"time"

	"ai-project-backend/database"
)

// WorkPattern represents a work pattern template
type WorkPattern struct {
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	DailyHours   struct {
		Min float64 `json:"min"`
		Max float64 `json:"max"`
	} `json:"daily_hours"`
	SessionCount struct {
		Min int `json:"min"`
		Max int `json:"max"`
	} `json:"session_count"`
	SessionLength struct {
		Min int `json:"min"` // minutes
		Max int `json:"max"` // minutes
	} `json:"session_length"`
	BreakPattern   []int   `json:"break_pattern"` // minutes between sessions
	EfficiencyRange struct {
		Min float64 `json:"min"`
		Max float64 `json:"max"`
	} `json:"efficiency_range"`
}

// TaskTemplate represents a task template for data generation
type TaskTemplate struct {
	Category     string  `json:"category"`
	Priority     string  `json:"priority"`
	TitlePattern string  `json:"title_pattern"`
	Duration     struct {
		Min int `json:"min"` // minutes
		Max int `json:"max"` // minutes
	} `json:"duration"`
	Complexity float64 `json:"complexity"`
}

// GeneratorConfig holds configuration for test data generation
type GeneratorConfig struct {
	StartDate    time.Time `json:"start_date"`
	EndDate      time.Time `json:"end_date"`
	UserID       int       `json:"user_id"`
	WorkPattern  string    `json:"work_pattern"`
	DryRun       bool      `json:"dry_run"`
	TaskCategories []string `json:"task_categories"`
}

// GenerateResponse represents the result of data generation
type GenerateResponse struct {
	TasksCreated    int                    `json:"tasks_created"`
	SessionsCreated int                    `json:"sessions_created"`
	DateRange       string                 `json:"date_range"`
	WorkPattern     string                 `json:"work_pattern"`
	TotalHours      float64                `json:"total_hours"`
	Metadata        map[string]interface{} `json:"metadata"`
}

// TestDataGeneratorService handles test data generation
type TestDataGeneratorService struct {
	db         *sql.DB
	taskRepo   database.TaskRepository
	timerRepo  database.TimerRepository
	random     *rand.Rand
	patterns   map[string]WorkPattern
	templates  []TaskTemplate
}

// NewTestDataGeneratorService creates a new test data generator service
func NewTestDataGeneratorService(
	db *sql.DB,
	taskRepo database.TaskRepository,
	timerRepo database.TimerRepository,
) *TestDataGeneratorService {
	
	service := &TestDataGeneratorService{
		db:        db,
		taskRepo:  taskRepo,
		timerRepo: timerRepo,
		random:    rand.New(rand.NewSource(time.Now().UnixNano())),
		patterns:  make(map[string]WorkPattern),
		templates: make([]TaskTemplate, 0),
	}
	
	// Initialize predefined patterns and templates
	service.initializePatterns()
	service.initializeTaskTemplates()
	
	return service
}

// initializePatterns sets up predefined work patterns
func (s *TestDataGeneratorService) initializePatterns() {
	s.patterns["focused_developer"] = WorkPattern{
		Name:        "focused_developer",
		Description: "专注型开发者：长时间专注，少量中断",
		DailyHours: struct {
			Min float64 `json:"min"`
			Max float64 `json:"max"`
		}{Min: 6.0, Max: 9.0},
		SessionCount: struct {
			Min int `json:"min"`
			Max int `json:"max"`
		}{Min: 3, Max: 5},
		SessionLength: struct {
			Min int `json:"min"`
			Max int `json:"max"`
		}{Min: 90, Max: 240},
		BreakPattern: []int{15, 30, 60},
		EfficiencyRange: struct {
			Min float64 `json:"min"`
			Max float64 `json:"max"`
		}{Min: 0.75, Max: 0.95},
	}
	
	s.patterns["meeting_heavy"] = WorkPattern{
		Name:        "meeting_heavy",
		Description: "会议密集型：短时间工作，频繁切换",
		DailyHours: struct {
			Min float64 `json:"min"`
			Max float64 `json:"max"`
		}{Min: 4.0, Max: 7.0},
		SessionCount: struct {
			Min int `json:"min"`
			Max int `json:"max"`
		}{Min: 6, Max: 12},
		SessionLength: struct {
			Min int `json:"min"`
			Max int `json:"max"`
		}{Min: 15, Max: 90},
		BreakPattern: []int{5, 15, 30},
		EfficiencyRange: struct {
			Min float64 `json:"min"`
			Max float64 `json:"max"`
		}{Min: 0.5, Max: 0.75},
	}
	
	s.patterns["balanced_worker"] = WorkPattern{
		Name:        "balanced_worker", 
		Description: "平衡型工作者：中等专注时间，规律作息",
		DailyHours: struct {
			Min float64 `json:"min"`
			Max float64 `json:"max"`
		}{Min: 7.0, Max: 8.0},
		SessionCount: struct {
			Min int `json:"min"`
			Max int `json:"max"`
		}{Min: 4, Max: 6},
		SessionLength: struct {
			Min int `json:"min"`
			Max int `json:"max"`
		}{Min: 60, Max: 150},
		BreakPattern: []int{10, 20, 45},
		EfficiencyRange: struct {
			Min float64 `json:"min"`
			Max float64 `json:"max"`
		}{Min: 0.65, Max: 0.85},
	}
	
	s.patterns["creative_burst"] = WorkPattern{
		Name:        "creative_burst",
		Description: "创意爆发型：不规律工作，高强度集中",
		DailyHours: struct {
			Min float64 `json:"min"`
			Max float64 `json:"max"`
		}{Min: 3.0, Max: 12.0},
		SessionCount: struct {
			Min int `json:"min"`
			Max int `json:"max"`
		}{Min: 2, Max: 8},
		SessionLength: struct {
			Min int `json:"min"`
			Max int `json:"max"`
		}{Min: 30, Max: 360},
		BreakPattern: []int{30, 60, 120},
		EfficiencyRange: struct {
			Min float64 `json:"min"`
			Max float64 `json:"max"`
		}{Min: 0.6, Max: 0.98},
	}
}

// initializeTaskTemplates sets up predefined task templates
func (s *TestDataGeneratorService) initializeTaskTemplates() {
	s.templates = []TaskTemplate{
		{
			Category:     "开发",
			Priority:     "high",
			TitlePattern: "实现{feature}功能",
			Duration: struct {
				Min int `json:"min"`
				Max int `json:"max"`
			}{Min: 120, Max: 480},
			Complexity: 0.8,
		},
		{
			Category:     "调试",
			Priority:     "medium",
			TitlePattern: "修复{component}问题",
			Duration: struct {
				Min int `json:"min"`
				Max int `json:"max"`
			}{Min: 30, Max: 180},
			Complexity: 0.6,
		},
		{
			Category:     "文档",
			Priority:     "low",
			TitlePattern: "编写{module}文档",
			Duration: struct {
				Min int `json:"min"`
				Max int `json:"max"`
			}{Min: 60, Max: 240},
			Complexity: 0.4,
		},
		{
			Category:     "测试",
			Priority:     "medium",
			TitlePattern: "测试{feature}功能",
			Duration: struct {
				Min int `json:"min"`
				Max int `json:"max"`
			}{Min: 45, Max: 150},
			Complexity: 0.5,
		},
		{
			Category:     "会议",
			Priority:     "medium",
			TitlePattern: "{meeting_type}会议",
			Duration: struct {
				Min int `json:"min"`
				Max int `json:"max"`
			}{Min: 30, Max: 120},
			Complexity: 0.3,
		},
		{
			Category:     "研究",
			Priority:     "low",
			TitlePattern: "研究{technology}技术",
			Duration: struct {
				Min int `json:"min"`
				Max int `json:"max"`
			}{Min: 90, Max: 300},
			Complexity: 0.7,
		},
	}
}

// GenerateTimerData generates test timer data based on configuration
func (s *TestDataGeneratorService) GenerateTimerData(ctx context.Context, config GeneratorConfig) (*GenerateResponse, error) {
	// Validate configuration
	if err := s.validateConfig(config); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}
	
	// Select work pattern
	pattern, exists := s.patterns[config.WorkPattern]
	if !exists {
		pattern = s.patterns["balanced_worker"] // default pattern
	}
	
	// Generate schedule for the date range
	schedule := s.generateSchedule(config.StartDate, config.EndDate, pattern)
	
	// Create tasks based on schedule
	tasks, err := s.generateTasks(ctx, schedule.TaskCount, config.TaskCategories, config.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tasks: %w", err)
	}
	
	// Generate timer sessions
	sessions, err := s.generateTimerSessions(ctx, schedule, tasks, pattern, config.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate timer sessions: %w", err)
	}
	
	// Calculate statistics
	totalHours := s.calculateTotalHours(sessions)
	
	// If not dry run, persist data to database
	if !config.DryRun {
		if err := s.persistData(ctx, tasks, sessions); err != nil {
			return nil, fmt.Errorf("failed to persist data: %w", err)
		}
	}
	
	return &GenerateResponse{
		TasksCreated:    len(tasks),
		SessionsCreated: len(sessions),
		DateRange:       fmt.Sprintf("%s to %s", config.StartDate.Format("2006-01-02"), config.EndDate.Format("2006-01-02")),
		WorkPattern:     pattern.Name,
		TotalHours:      totalHours,
		Metadata: map[string]interface{}{
			"pattern_description": pattern.Description,
			"avg_session_length":  s.calculateAvgSessionLength(sessions),
			"tasks_by_category":   s.groupTasksByCategory(tasks),
		},
	}, nil
}

// validateConfig validates the generator configuration
func (s *TestDataGeneratorService) validateConfig(config GeneratorConfig) error {
	if config.StartDate.After(config.EndDate) {
		return fmt.Errorf("start date must be before end date")
	}
	
	if config.UserID <= 0 {
		return fmt.Errorf("user ID must be positive")
	}
	
	daysDiff := config.EndDate.Sub(config.StartDate).Hours() / 24
	if daysDiff > 30 {
		return fmt.Errorf("date range cannot exceed 30 days")
	}
	
	return nil
}

// DaySchedule represents a day's work schedule
type DaySchedule struct {
	Date         time.Time
	TotalHours   float64
	SessionCount int
	Sessions     []SessionSchedule
}

// SessionSchedule represents a scheduled work session
type SessionSchedule struct {
	StartTime     time.Time
	DurationMins  int
	TaskIndex     int
	BreakAfterMins int
}

// WorkSchedule represents the complete work schedule
type WorkSchedule struct {
	Days      []DaySchedule
	TaskCount int
}

// generateSchedule creates a work schedule based on the pattern
func (s *TestDataGeneratorService) generateSchedule(startDate, endDate time.Time, pattern WorkPattern) *WorkSchedule {
	schedule := &WorkSchedule{
		Days:      make([]DaySchedule, 0),
		TaskCount: 0,
	}
	
	currentDate := startDate
	taskIndex := 0
	
	for currentDate.Before(endDate) || currentDate.Equal(endDate) {
		// Skip weekends for realistic work patterns
		if currentDate.Weekday() == time.Saturday || currentDate.Weekday() == time.Sunday {
			currentDate = currentDate.AddDate(0, 0, 1)
			continue
		}
		
		daySchedule := s.generateDaySchedule(currentDate, pattern, &taskIndex)
		schedule.Days = append(schedule.Days, daySchedule)
		
		currentDate = currentDate.AddDate(0, 0, 1)
	}
	
	schedule.TaskCount = taskIndex
	return schedule
}

// generateDaySchedule creates a schedule for a single day
func (s *TestDataGeneratorService) generateDaySchedule(date time.Time, pattern WorkPattern, taskIndex *int) DaySchedule {
	// Randomize daily parameters within pattern constraints
	dailyHours := s.randomFloat(pattern.DailyHours.Min, pattern.DailyHours.Max)
	sessionCount := s.randomInt(pattern.SessionCount.Min, pattern.SessionCount.Max)
	
	daySchedule := DaySchedule{
		Date:         date,
		TotalHours:   dailyHours,
		SessionCount: sessionCount,
		Sessions:     make([]SessionSchedule, 0, sessionCount),
	}
	
	// Distribute work time across sessions
	remainingMinutes := int(dailyHours * 60)
	startHour := 9 // Start work at 9 AM
	currentTime := time.Date(date.Year(), date.Month(), date.Day(), startHour, 0, 0, 0, date.Location())
	
	for i := 0; i < sessionCount && remainingMinutes > 0; i++ {
		// Calculate session duration
		minDuration := pattern.SessionLength.Min
		maxDuration := pattern.SessionLength.Max
		if remainingMinutes < maxDuration {
			maxDuration = remainingMinutes
		}
		if minDuration > maxDuration {
			minDuration = maxDuration
		}
		
		sessionDuration := s.randomInt(minDuration, maxDuration)
		if sessionDuration > remainingMinutes {
			sessionDuration = remainingMinutes
		}
		
		// Add some variation to start time
		if i > 0 {
			breakDuration := pattern.BreakPattern[s.random.Intn(len(pattern.BreakPattern))]
			currentTime = currentTime.Add(time.Duration(breakDuration) * time.Minute)
		}
		
		session := SessionSchedule{
			StartTime:    currentTime,
			DurationMins: sessionDuration,
			TaskIndex:    *taskIndex,
		}
		
		daySchedule.Sessions = append(daySchedule.Sessions, session)
		
		// Update counters
		remainingMinutes -= sessionDuration
		currentTime = currentTime.Add(time.Duration(sessionDuration) * time.Minute)
		*taskIndex++
	}
	
	return daySchedule
}

// randomFloat generates a random float between min and max
func (s *TestDataGeneratorService) randomFloat(min, max float64) float64 {
	return min + s.random.Float64()*(max-min)
}

// randomInt generates a random int between min and max (inclusive)
func (s *TestDataGeneratorService) randomInt(min, max int) int {
	if min >= max {
		return min
	}
	return min + s.random.Intn(max-min+1)
}

// GetAvailablePatterns returns list of available work patterns
func (s *TestDataGeneratorService) GetAvailablePatterns() map[string]WorkPattern {
	return s.patterns
}

// GetTaskTemplates returns available task templates
func (s *TestDataGeneratorService) GetTaskTemplates() []TaskTemplate {
	return s.templates
}

// GetDB returns the database connection
func (s *TestDataGeneratorService) GetDB() *sql.DB {
	return s.db
}