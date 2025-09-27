package database

import (
	"testing"
	"math"
)

// TestCalculateComprehensiveEfficiencyIndex tests the efficiency calculation algorithm
func TestCalculateComprehensiveEfficiencyIndex(t *testing.T) {
	repo := &PostgresTimerRepository{}

	tests := []struct {
		name              string
		totalHours        float64
		completedTasks    int
		timerSessions     int
		avgSessionDuration int
		topTaskSeconds    int
		totalSeconds      int
		expectedMin       float64
		expectedMax       float64
		description       string
	}{
		{
			name:              "No work",
			totalHours:        0,
			completedTasks:    0,
			timerSessions:     0,
			avgSessionDuration: 0,
			topTaskSeconds:    0,
			totalSeconds:      0,
			expectedMin:       0,
			expectedMax:       0,
			description:       "Should return 0 for no work",
		},
		{
			name:              "Perfect day",
			totalHours:        8.0,
			completedTasks:    5,
			timerSessions:     8,
			avgSessionDuration: 3600, // 1 hour sessions
			topTaskSeconds:    14400, // 4 hours on top task
			totalSeconds:      28800, // 8 hours total
			expectedMin:       85,
			expectedMax:       100,
			description:       "Perfect 8-hour workday should score very high",
		},
		{
			name:              "Short productive session",
			totalHours:        2.0,
			completedTasks:    2,
			timerSessions:     2,
			avgSessionDuration: 3600, // 1 hour sessions
			topTaskSeconds:    3600,  // 1 hour on top task
			totalSeconds:      7200,  // 2 hours total
			expectedMin:       45,
			expectedMax:       70,
			description:       "Short but productive session should score moderately",
		},
		{
			name:              "Long unfocused session",
			totalHours:        12.0,
			completedTasks:    2,
			timerSessions:     20,
			avgSessionDuration: 2160, // 36 minute sessions
			topTaskSeconds:    3600,  // Only 1 hour on top task
			totalSeconds:      43200, // 12 hours total
			expectedMin:       40,
			expectedMax:       70,
			description:       "Long but unfocused work should score lower",
		},
		{
			name:              "Very short sessions",
			totalHours:        4.0,
			completedTasks:    8,
			timerSessions:     24,
			avgSessionDuration: 600,  // 10 minute sessions
			topTaskSeconds:    1800,  // 30 minutes on top task
			totalSeconds:      14400, // 4 hours total
			expectedMin:       65,
			expectedMax:       85,
			description:       "Many very short sessions with high task completion can still score well",
		},
		{
			name:              "Optimal focused work",
			totalHours:        6.0,
			completedTasks:    4,
			timerSessions:     6,
			avgSessionDuration: 3600, // 1 hour sessions (optimal)
			topTaskSeconds:    7200,  // 2 hours on top task
			totalSeconds:      21600, // 6 hours total
			expectedMin:       75,
			expectedMax:       95,
			description:       "Optimal focused work pattern should score very high",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := repo.calculateComprehensiveEfficiencyIndex(
				tt.totalHours,
				tt.completedTasks,
				tt.timerSessions,
				tt.avgSessionDuration,
				tt.topTaskSeconds,
				tt.totalSeconds,
			)

			// Check if result is within expected range
			if result < tt.expectedMin || result > tt.expectedMax {
				t.Errorf("Test %s failed: got %.1f, expected between %.1f and %.1f. %s",
					tt.name, result, tt.expectedMin, tt.expectedMax, tt.description)
			}

			// Ensure result is within valid range
			if result < 0 || result > 100 {
				t.Errorf("Test %s failed: result %.1f is outside valid range [0, 100]", tt.name, result)
			}

			t.Logf("Test %s: efficiency=%.1f (expected: %.1f-%.1f) - %s",
				tt.name, result, tt.expectedMin, tt.expectedMax, tt.description)
		})
	}
}

// TestCalculateDynamicWeights tests the dynamic weight calculation
func TestCalculateDynamicWeights(t *testing.T) {
	repo := &PostgresTimerRepository{}

	tests := []struct {
		name           string
		totalHours     float64
		timerSessions  int
		completedTasks int
		description    string
	}{
		{
			name:           "Normal work pattern",
			totalHours:     8.0,
			timerSessions:  8,
			completedTasks: 4,
			description:    "Normal 8-hour work day",
		},
		{
			name:           "Short work session",
			totalHours:     1.5,
			timerSessions:  2,
			completedTasks: 1,
			description:    "Short work session should emphasize task completion",
		},
		{
			name:           "Long work session",
			totalHours:     12.0,
			timerSessions:  6,
			completedTasks: 2,
			description:    "Long work session should emphasize quality",
		},
		{
			name:           "Many short sessions",
			totalHours:     6.0,
			timerSessions:  20,
			completedTasks: 8,
			description:    "Many short sessions should emphasize focus",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			weights := repo.calculateDynamicWeights(tt.totalHours, tt.timerSessions, tt.completedTasks)

			// Check that all weights are positive
			if weights.Base <= 0 || weights.Time <= 0 || weights.Task <= 0 || weights.Quality <= 0 {
				t.Errorf("Test %s failed: all weights should be positive, got Base=%.2f, Time=%.2f, Task=%.2f, Quality=%.2f",
					tt.name, weights.Base, weights.Time, weights.Task, weights.Quality)
			}

			// Check that weights are reasonable (between 0.5 and 1.5)
			checkWeight := func(name string, weight float64) {
				if weight < 0.5 || weight > 1.5 {
					t.Errorf("Test %s failed: %s weight %.2f is outside reasonable range [0.5, 1.5]",
						tt.name, name, weight)
				}
			}

			checkWeight("Base", weights.Base)
			checkWeight("Time", weights.Time)
			checkWeight("Task", weights.Task)
			checkWeight("Quality", weights.Quality)

			t.Logf("Test %s: Base=%.2f, Time=%.2f, Task=%.2f, Quality=%.2f - %s",
				tt.name, weights.Base, weights.Time, weights.Task, weights.Quality, tt.description)
		})
	}
}

// TestCalculateBaseScore tests the base score calculation
func TestCalculateBaseScore(t *testing.T) {
	repo := &PostgresTimerRepository{}

	tests := []struct {
		name        string
		totalHours  float64
		weight      float64
		expectedMin float64
		expectedMax float64
	}{
		{"Zero hours", 0, 1.0, 0, 0},
		{"Half hour", 0.5, 1.0, 7, 8},
		{"One hour", 1.0, 1.0, 14, 16},
		{"Four hours", 4.0, 1.0, 29, 31},
		{"Eight hours", 8.0, 1.0, 29, 31},
		{"Twelve hours", 12.0, 1.0, 24, 31}, // Should have slight penalty for overwork
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := repo.calculateBaseScore(tt.totalHours, tt.weight)

			if result < tt.expectedMin || result > tt.expectedMax {
				t.Errorf("Test %s failed: got %.1f, expected between %.1f and %.1f",
					tt.name, result, tt.expectedMin, tt.expectedMax)
			}

			t.Logf("Test %s: hours=%.1f, score=%.1f", tt.name, tt.totalHours, result)
		})
	}
}

// TestCalculateTimeEfficiency tests the time efficiency calculation
func TestCalculateTimeEfficiency(t *testing.T) {
	repo := &PostgresTimerRepository{}

	tests := []struct {
		name               string
		timerSessions      int
		avgSessionDuration int
		totalHours         float64
		weight             float64
		expectedMin        float64
		expectedMax        float64
		description        string
	}{
		{
			name:               "No sessions",
			timerSessions:      0,
			avgSessionDuration: 0,
			totalHours:         0,
			weight:             1.0,
			expectedMin:        0,
			expectedMax:        0,
			description:        "No sessions should return 0",
		},
		{
			name:               "Optimal 30-60 min sessions",
			timerSessions:      8,
			avgSessionDuration: 2400, // 40 minutes
			totalHours:         8.0,
			weight:             1.0,
			expectedMin:        15,
			expectedMax:        20,
			description:        "Optimal session length should score high",
		},
		{
			name:               "Very short sessions",
			timerSessions:      20,
			avgSessionDuration: 300, // 5 minutes
			totalHours:         4.0,
			weight:             1.0,
			expectedMin:        5,
			expectedMax:        15,
			description:        "Very short sessions should score lower",
		},
		{
			name:               "Very long sessions",
			timerSessions:      2,
			avgSessionDuration: 14400, // 4 hours
			totalHours:         8.0,
			weight:             1.0,
			expectedMin:        5,
			expectedMax:        15,
			description:        "Very long sessions should score lower",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := repo.calculateTimeEfficiency(tt.timerSessions, tt.avgSessionDuration, tt.totalHours, tt.weight)

			if result < tt.expectedMin || result > tt.expectedMax {
				t.Errorf("Test %s failed: got %.1f, expected between %.1f and %.1f. %s",
					tt.name, result, tt.expectedMin, tt.expectedMax, tt.description)
			}

			t.Logf("Test %s: sessions=%d, avgDuration=%d, score=%.1f - %s",
				tt.name, tt.timerSessions, tt.avgSessionDuration, result, tt.description)
		})
	}
}

// TestAlgorithmConsistency tests that the algorithm produces consistent results
func TestAlgorithmConsistency(t *testing.T) {
	repo := &PostgresTimerRepository{}

	// Test the same input multiple times
	totalHours := 6.0
	completedTasks := 3
	timerSessions := 6
	avgSessionDuration := 3600
	topTaskSeconds := 7200
	totalSeconds := 21600

	results := make([]float64, 10)
	for i := 0; i < 10; i++ {
		results[i] = repo.calculateComprehensiveEfficiencyIndex(
			totalHours, completedTasks, timerSessions, avgSessionDuration, topTaskSeconds, totalSeconds)
	}

	// All results should be identical
	firstResult := results[0]
	for i, result := range results {
		if math.Abs(result-firstResult) > 0.001 { // Allow tiny floating point differences
			t.Errorf("Algorithm inconsistency: iteration %d gave %.3f, expected %.3f", i, result, firstResult)
		}
	}

	t.Logf("Algorithm consistency test passed: all 10 iterations returned %.1f", firstResult)
}

// TestEdgeCases tests edge cases and boundary conditions
func TestEdgeCases(t *testing.T) {
	repo := &PostgresTimerRepository{}

	edgeCases := []struct {
		name              string
		totalHours        float64
		completedTasks    int
		timerSessions     int
		avgSessionDuration int
		topTaskSeconds    int
		totalSeconds      int
		description       string
	}{
		{
			name:              "Massive overwork",
			totalHours:        24.0,
			completedTasks:    1,
			timerSessions:     48,
			avgSessionDuration: 1800,
			topTaskSeconds:    3600,
			totalSeconds:      86400,
			description:       "24-hour work day should be penalized",
		},
		{
			name:              "Perfect efficiency but minimal work",
			totalHours:        0.1,
			completedTasks:    1,
			timerSessions:     1,
			avgSessionDuration: 360,
			topTaskSeconds:    360,
			totalSeconds:      360,
			description:       "Minimal but perfect work",
		},
		{
			name:              "Extreme session fragmentation",
			totalHours:        4.0,
			completedTasks:    100,
			timerSessions:     144, // Every minute
			avgSessionDuration: 100,
			topTaskSeconds:    360,
			totalSeconds:      14400,
			description:       "Extremely fragmented work",
		},
	}

	for _, tc := range edgeCases {
		t.Run(tc.name, func(t *testing.T) {
			result := repo.calculateComprehensiveEfficiencyIndex(
				tc.totalHours, tc.completedTasks, tc.timerSessions,
				tc.avgSessionDuration, tc.topTaskSeconds, tc.totalSeconds)

			// Just ensure it doesn't crash and returns a valid result
			if result < 0 || result > 100 || math.IsNaN(result) || math.IsInf(result, 0) {
				t.Errorf("Test %s failed: invalid result %.1f", tc.name, result)
			}

			t.Logf("Test %s: efficiency=%.1f - %s", tc.name, result, tc.description)
		})
	}
}