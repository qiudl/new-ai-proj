package handlers

import (
	"log"
	"sync"
	"time"

	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SSEManager manages Server-Sent Events connections and broadcasting
type SSEManager struct {
	userChannels map[int]chan *models.TimerEvent
	mutex        sync.RWMutex
	metrics      *SSEMetrics
}

// SSEMetrics tracks SSE performance metrics
type SSEMetrics struct {
	ActiveConnections int64
	TotalConnections  int64
	MessagesSent      int64
	ConnectionErrors  int64
	MessageErrors     int64
	LastUpdate        time.Time
	mutex             sync.RWMutex
}

// NewSSEManager creates a new SSE manager instance
func NewSSEManager() *SSEManager {
	return &SSEManager{
		userChannels: make(map[int]chan *models.TimerEvent),
		metrics: &SSEMetrics{
			LastUpdate: time.Now(),
		},
	}
}

// AddUserChannel adds a new user channel for SSE events
func (m *SSEManager) AddUserChannel(userID int, ch chan *models.TimerEvent) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	
	// Close existing channel if present
	if existingCh, exists := m.userChannels[userID]; exists {
		close(existingCh)
	}
	
	m.userChannels[userID] = ch
	m.updateMetrics(func(metrics *SSEMetrics) {
		metrics.ActiveConnections++
		metrics.TotalConnections++
	})
	
	log.Printf("[SSE] User %d connected, active connections: %d", userID, len(m.userChannels))
}

// RemoveUserChannel removes a user channel
func (m *SSEManager) RemoveUserChannel(userID int) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	
	if ch, exists := m.userChannels[userID]; exists {
		close(ch)
		delete(m.userChannels, userID)
		
		m.updateMetrics(func(metrics *SSEMetrics) {
			metrics.ActiveConnections--
		})
		
		log.Printf("[SSE] User %d disconnected, active connections: %d", userID, len(m.userChannels))
	}
}

// BroadcastToUser sends an event to a specific user
func (m *SSEManager) BroadcastToUser(userID int, event *models.TimerEvent) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	if ch, exists := m.userChannels[userID]; exists {
		// Generate event ID if not present
		if event.EventID == "" {
			event.EventID = uuid.New().String()
		}
		
		// Set timestamp if not present
		if event.Timestamp.IsZero() {
			event.Timestamp = time.Now()
		}
		
		// Non-blocking send to prevent goroutine leaks
		select {
		case ch <- event:
			m.updateMetrics(func(metrics *SSEMetrics) {
				metrics.MessagesSent++
			})
			log.Printf("[SSE] Sent %s event to user %d", event.Type, userID)
		default:
			m.updateMetrics(func(metrics *SSEMetrics) {
				metrics.MessageErrors++
			})
			log.Printf("[SSE] Failed to send event to user %d: channel full", userID)
		}
	}
}

// BroadcastToAll sends an event to all connected users
func (m *SSEManager) BroadcastToAll(event *models.TimerEvent) {
	m.mutex.RLock()
	userIDs := make([]int, 0, len(m.userChannels))
	for userID := range m.userChannels {
		userIDs = append(userIDs, userID)
	}
	m.mutex.RUnlock()
	
	for _, userID := range userIDs {
		// Create a copy of the event for each user
		userEvent := *event
		userEvent.UserID = userID
		m.BroadcastToUser(userID, &userEvent)
	}
}

// SendHeartbeat sends a heartbeat event to a user to keep connection alive
func (m *SSEManager) SendHeartbeat(userID int) {
	event := &models.TimerEvent{
		Type:      models.SSEEventHeartbeat,
		UserID:    userID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"message": "heartbeat",
			"server_time": time.Now().Unix(),
		},
	}
	
	m.BroadcastToUser(userID, event)
}

// GetActiveConnections returns the number of active connections
func (m *SSEManager) GetActiveConnections() int {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return len(m.userChannels)
}

// GetMetrics returns current SSE metrics
func (m *SSEManager) GetMetrics() SSEMetrics {
	m.metrics.mutex.RLock()
	defer m.metrics.mutex.RUnlock()
	
	metrics := *m.metrics
	metrics.ActiveConnections = int64(m.GetActiveConnections())
	return metrics
}

// updateMetrics updates SSE metrics thread-safely
func (m *SSEManager) updateMetrics(updateFunc func(*SSEMetrics)) {
	m.metrics.mutex.Lock()
	defer m.metrics.mutex.Unlock()
	
	updateFunc(m.metrics)
	m.metrics.LastUpdate = time.Now()
}

// HandleSSEConnection handles a new SSE connection
func (m *SSEManager) HandleSSEConnection(c *gin.Context, userID int) {
	// Set SSE headers
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
	c.Writer.Header().Set("Access-Control-Allow-Headers", "Cache-Control")
	
	// Create user channel
	ch := make(chan *models.TimerEvent, 10) // Buffered channel to prevent blocking
	m.AddUserChannel(userID, ch)
	
	// Clean up on connection close
	defer func() {
		m.RemoveUserChannel(userID)
		log.Printf("[SSE] Connection cleanup completed for user %d", userID)
	}()
	
	// Send initial connection event
	connectionEvent := &models.TimerEvent{
		Type:      models.SSEEventConnection,
		UserID:    userID,
		Timestamp: time.Now(),
		Data: &models.SSEConnectionData{
			Status:    "connected",
			UserID:    userID,
			Timestamp: time.Now(),
			Message:   "SSE connection established",
		},
	}
	
	// Send connection event immediately
	sseData := connectionEvent.ToSSEFormat()
	c.Writer.WriteString(sseData)
	c.Writer.Flush()
	
	// Set up heartbeat ticker
	heartbeatTicker := time.NewTicker(30 * time.Second)
	defer heartbeatTicker.Stop()
	
	// Event loop
	for {
		select {
		case event := <-ch:
			if event == nil {
				log.Printf("[SSE] Channel closed for user %d", userID)
				return
			}
			
			sseData := event.ToSSEFormat()
			if _, err := c.Writer.WriteString(sseData); err != nil {
				log.Printf("[SSE] Write error for user %d: %v", userID, err)
				m.updateMetrics(func(metrics *SSEMetrics) {
					metrics.ConnectionErrors++
				})
				return
			}
			
			c.Writer.Flush()
			
		case <-heartbeatTicker.C:
			m.SendHeartbeat(userID)
			
		case <-c.Request.Context().Done():
			log.Printf("[SSE] Client %d disconnected", userID)
			return
		}
	}
}

// CreateTimerEventFromCurrentResponse creates a timer event from timer response
func (m *SSEManager) CreateTimerEventFromCurrentResponse(userID int, eventType string, response *models.TimerCurrentResponse) *models.TimerEvent {
	timerData := &models.SSETimerData{
		UserID:         userID,
		TargetType:     "project_task",
		IsRunning:      response.IsRunning,
		IsPaused:       false, // Will be updated when pause feature is implemented
		ElapsedSeconds: response.ElapsedSeconds,
		FormattedTime:  response.FormattedTime,
	}
	
	if response.TaskID != nil {
		timerData.TargetID = *response.TaskID
	}
	if response.TaskTitle != nil {
		timerData.TargetTitle = *response.TaskTitle
	}
	if response.StartTime != nil {
		timerData.StartTime = response.StartTime
	}
	
	// Set status based on running state
	if response.IsRunning {
		timerData.Status = string(models.TimingStatusRunning)
	} else {
		timerData.Status = string(models.TimingStatusStopped)
	}
	
	return &models.TimerEvent{
		Type:      eventType,
		UserID:    userID,
		Timestamp: time.Now(),
		Data:      timerData,
	}
}

// Cleanup performs cleanup operations for the SSE manager
func (m *SSEManager) Cleanup() {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	
	// Close all channels and clear the map
	for userID, ch := range m.userChannels {
		close(ch)
		log.Printf("[SSE] Closed channel for user %d during cleanup", userID)
	}
	
	// Clear the map
	m.userChannels = make(map[int]chan *models.TimerEvent)
	
	log.Println("[SSE] Manager cleanup completed")
}