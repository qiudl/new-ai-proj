package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// OKRHandler handles OKR-related HTTP requests
type OKRHandler struct {
	db database.DB
}

// NewOKRHandler creates a new OKR handler
func NewOKRHandler(db database.DB) *OKRHandler {
	return &OKRHandler{db: db}
}

// CreateObjective handles POST /api/v1/okr/objectives
func (h *OKRHandler) CreateObjective(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.CreateOKRObjectiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	// Validate quarter format
	if _, _, err := models.ParseQuarter(req.Quarter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quarter format", "details": err.Error()})
		return
	}

	// Create objective
	uid := userID.(int)
	ctx := c.Request.Context()

	// Get user to determine enterprise_id
	user, err := h.db.Users().GetByID(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info", "details": err.Error()})
		return
	}

	objective := &models.OKRObjective{
		Title:        req.Title,
		Description:  req.Description,
		Quarter:      req.Quarter,
		Status:       models.OKRStatusActive,
		Progress:     0,
		AssigneeID:   &uid,
		EnterpriseID: user.CompanyID, // Use user's company_id (mapped to enterprise)
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
		CreatedBy:    &uid,
	}

	err = h.db.OKR().CreateObjective(ctx, objective)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create objective", "details": err.Error()})
		return
	}

	// Create key results if provided
	for _, krReq := range req.KeyResults {
		keyResult := &models.OKRKeyResult{
			ObjectiveID:  objective.ID,
			Title:        krReq.Title,
			Description:  krReq.Description,
			Type:         krReq.Type,
			TargetValue:  krReq.TargetValue,
			CurrentValue: 0,
			Unit:         krReq.Unit,
			Progress:     0,
			Status:       models.KRStatusNotStarted,
		}

		err = h.db.OKR().CreateKeyResult(ctx, keyResult)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create key result", "details": err.Error()})
			return
		}

		objective.KeyResults = append(objective.KeyResults, *keyResult)
	}

	c.JSON(http.StatusCreated, objective)
}

// ListObjectives handles GET /api/v1/okr/objectives
func (h *OKRHandler) ListObjectives(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	quarter := c.Query("quarter")
	if quarter == "" {
		quarter = models.GetCurrentQuarter()
	}

	ctx := c.Request.Context()
	objectives, err := h.db.OKR().GetObjectivesByUser(ctx, uid, quarter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get objectives", "details": err.Error()})
		return
	}

	response := models.OKRListResponse{
		Objectives: objectives,
		Total:      len(objectives),
		Quarter:    quarter,
	}

	c.JSON(http.StatusOK, response)
}

// GetObjective handles GET /api/v1/okr/objectives/:id
func (h *OKRHandler) GetObjective(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid objective ID"})
		return
	}

	ctx := c.Request.Context()
	objective, err := h.db.OKR().GetObjectiveByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Objective not found"})
		return
	}

	// Check if user has access to this objective
	uid := userID.(int)
	if objective.AssigneeID == nil || *objective.AssigneeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, objective)
}

// UpdateObjective handles PUT /api/v1/okr/objectives/:id
func (h *OKRHandler) UpdateObjective(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid objective ID"})
		return
	}

	var req models.UpdateOKRObjectiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	ctx := c.Request.Context()
	objective, err := h.db.OKR().GetObjectiveByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Objective not found"})
		return
	}

	// Check if user has access to this objective
	uid := userID.(int)
	if objective.AssigneeID == nil || *objective.AssigneeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Update fields
	if req.Title != nil {
		objective.Title = *req.Title
	}
	if req.Description != nil {
		objective.Description = *req.Description
	}
	if req.Status != nil {
		objective.Status = *req.Status
	}
	if req.Progress != nil {
		objective.Progress = *req.Progress
	}
	if req.StartDate != nil {
		objective.StartDate = req.StartDate.Time
	}
	if req.EndDate != nil {
		objective.EndDate = req.EndDate.Time
	}

	err = h.db.OKR().UpdateObjective(ctx, objective)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update objective", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, objective)
}

// DeleteObjective handles DELETE /api/v1/okr/objectives/:id
func (h *OKRHandler) DeleteObjective(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid objective ID"})
		return
	}

	ctx := c.Request.Context()
	objective, err := h.db.OKR().GetObjectiveByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Objective not found"})
		return
	}

	// Check if user has access to this objective
	uid := userID.(int)
	if objective.AssigneeID == nil || *objective.AssigneeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	err = h.db.OKR().DeleteObjective(ctx, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete objective", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Objective deleted successfully"})
}

// CreateKeyResult handles POST /api/v1/okr/objectives/:id/key-results
func (h *OKRHandler) CreateKeyResult(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	idStr := c.Param("id")
	objectiveID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid objective ID"})
		return
	}

	var req models.CreateKeyResultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	ctx := c.Request.Context()
	objective, err := h.db.OKR().GetObjectiveByID(ctx, objectiveID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Objective not found"})
		return
	}

	// Check if user has access to this objective
	uid := userID.(int)
	if objective.AssigneeID == nil || *objective.AssigneeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	keyResult := &models.OKRKeyResult{
		ObjectiveID:  objectiveID,
		Title:        req.Title,
		Description:  req.Description,
		Type:         req.Type,
		TargetValue:  req.TargetValue,
		CurrentValue: 0,
		Unit:         req.Unit,
		Progress:     0,
		Status:       models.KRStatusNotStarted,
	}

	err = h.db.OKR().CreateKeyResult(ctx, keyResult)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create key result", "details": err.Error()})
		return
	}

	// Recalculate objective progress after adding a key result
	krs, err := h.db.OKR().GetKeyResultsByObjective(ctx, objectiveID)
	if err == nil && len(krs) > 0 {
		sum := 0
		for _, kr := range krs {
			sum += kr.Progress
		}
		objective.Progress = sum / len(krs)
		_ = h.db.OKR().UpdateObjective(ctx, objective)
	}

	c.JSON(http.StatusCreated, keyResult)
}

// GetKeyResult handles GET /api/v1/okr/key-results/:id
func (h *OKRHandler) GetKeyResult(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key result ID"})
		return
	}

	ctx := c.Request.Context()
	keyResult, err := h.db.OKR().GetKeyResultByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key result not found"})
		return
	}

	// Check if user has access to this key result by checking the objective
	uid := userID.(int)
	objective, err := h.db.OKR().GetObjectiveByID(ctx, keyResult.ObjectiveID)
	if err != nil || objective.AssigneeID == nil || *objective.AssigneeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, keyResult)
}

// UpdateKeyResult handles PUT /api/v1/okr/key-results/:id
func (h *OKRHandler) UpdateKeyResult(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key result ID"})
		return
	}

	var req models.UpdateKeyResultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	ctx := c.Request.Context()

	// Fetch key result directly by ID
	keyResult, err := h.db.OKR().GetKeyResultByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key result not found"})
		return
	}

	// Get objective to check access
	objective, err := h.db.OKR().GetObjectiveByID(ctx, keyResult.ObjectiveID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Objective not found"})
		return
	}

	// Check if user has access to this objective
	uidInt := userID.(int)
	if objective.AssigneeID == nil || *objective.AssigneeID != uidInt {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Update fields
	if req.Title != nil {
		keyResult.Title = *req.Title
	}
	if req.Description != nil {
		keyResult.Description = *req.Description
	}

	// If current value provided, set it first
	if req.CurrentValue != nil {
		keyResult.CurrentValue = *req.CurrentValue
	}

// Determine progress
	prevValue := keyResult.CurrentValue
	_ = keyResult.Progress  // Keep for potential future use
	if req.Progress != nil {
		// clamp to [0,100]
		p := *req.Progress
		if p < 0 {
			p = 0
		}
		if p > 100 {
			p = 100
		}
		keyResult.Progress = p
	} else if req.CurrentValue != nil {
		// auto-calc progress from currentValue and targetValue based on type
		switch keyResult.Type {
		case models.KRTypePercentage:
			p := int(math.Round(*req.CurrentValue))
			if p < 0 {
				p = 0
			}
			if p > 100 {
				p = 100
			}
			keyResult.Progress = p
		case models.KRTypeNumber:
			if keyResult.TargetValue > 0 {
				ratio := *req.CurrentValue / keyResult.TargetValue
				p := int(math.Round(ratio * 100))
				if p < 0 {
					p = 0
				}
				if p > 100 {
					p = 100
				}
				keyResult.Progress = p
			}
		case models.KRTypeBoolean:
			if *req.CurrentValue >= 1 {
				keyResult.Progress = 100
			} else {
				keyResult.Progress = 0
			}
		}
	}

	// Determine status if not explicitly provided
	if req.Status != nil {
		keyResult.Status = *req.Status
	} else {
		// auto status based on progress and schedule
		p := keyResult.Progress
		if p >= 100 {
			keyResult.Status = models.KRStatusCompleted
		} else if p <= 0 {
			keyResult.Status = models.KRStatusNotStarted
		} else {
			// at risk if past half of the objective duration and progress < 50
			mid := objective.StartDate.Add(objective.EndDate.Sub(objective.StartDate) / 2)
			if time.Now().After(mid) && p < 50 {
				keyResult.Status = models.KRStatusAtRisk
			} else {
				keyResult.Status = models.KRStatusInProgress
			}
		}
	}

	if err := h.db.OKR().UpdateKeyResult(ctx, keyResult); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update key result", "details": err.Error()})
		return
	}

	// Recalculate and persist objective progress based on all key results
	krs, err := h.db.OKR().GetKeyResultsByObjective(ctx, keyResult.ObjectiveID)
	if err == nil {
		if len(krs) > 0 {
			sum := 0
			for _, kr := range krs {
				sum += kr.Progress
			}
			objective.Progress = sum / len(krs)
		} else {
			objective.Progress = 0
		}
_ = h.db.OKR().UpdateObjective(ctx, objective)
	}

	// Write progress log
	var uid *int
	if v, ok := c.Get("user_id"); ok {
		if id, ok2 := v.(int); ok2 {
			uid = &id
		}
	}
	method := "manual"
	if req.Progress == nil && req.CurrentValue != nil {
		method = "auto"
	}
	// Log the change using new audit format
	prevValStr := strconv.FormatFloat(prevValue, 'f', -1, 64)
	newValStr := strconv.FormatFloat(keyResult.CurrentValue, 'f', -1, 64)
	h.logOKRAuditChange(ctx, *uid, nil, &keyResult.ID, method, "current_value", 
		&prevValStr, &newValStr, nil, c)

	c.JSON(http.StatusOK, keyResult)
}

// DeleteKeyResult handles DELETE /api/v1/okr/key-results/:id
func (h *OKRHandler) DeleteKeyResult(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key result ID"})
		return
	}

	ctx := c.Request.Context()

	// Fetch key result and its objective for access control
	kr, err := h.db.OKR().GetKeyResultByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key result not found"})
		return
	}

	objective, err := h.db.OKR().GetObjectiveByID(ctx, kr.ObjectiveID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Objective not found"})
		return
	}

	uidInt := userID.(int)
	if objective.AssigneeID == nil || *objective.AssigneeID != uidInt {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := h.db.OKR().DeleteKeyResult(ctx, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete key result", "details": err.Error()})
		return
	}

	// Recalculate objective progress after deletion
	krs, err := h.db.OKR().GetKeyResultsByObjective(ctx, kr.ObjectiveID)
	if err == nil {
		if len(krs) > 0 {
			sum := 0
			for _, k := range krs {
				sum += k.Progress
			}
			objective.Progress = sum / len(krs)
		} else {
			objective.Progress = 0
		}
_ = h.db.OKR().UpdateObjective(ctx, objective)
	}

	// Log deletion using new audit format
	var uid int
	if v, ok := c.Get("user_id"); ok {
		if id, ok2 := v.(int); ok2 {
			uid = id
		}
	}
	reason := "key result deleted"
	prevValStr := strconv.FormatFloat(kr.CurrentValue, 'f', -1, 64)
	h.logOKRAuditChange(ctx, uid, nil, &kr.ID, models.ChangeTypeManual, "status", 
		&prevValStr, nil, &reason, c)

	c.JSON(http.StatusOK, gin.H{"message": "Key result deleted successfully"})
}

// GetOKRStats handles GET /api/v1/okr/stats
func (h *OKRHandler) GetOKRStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	quarter := c.Query("quarter")
	if quarter == "" {
		quarter = models.GetCurrentQuarter()
	}

	ctx := c.Request.Context()
	stats, err := h.db.OKR().GetUserOKRStats(ctx, uid, quarter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get OKR stats", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetAvailableQuarters handles GET /api/v1/okr/quarters
func (h *OKRHandler) GetAvailableQuarters(c *gin.Context) {
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Generate available quarters (current and next 4 quarters)
	now := time.Now()
	quarters := make([]string, 0, 5)
	
	for i := 0; i < 5; i++ {
		quarterDate := now.AddDate(0, i*3, 0)
		quarter := models.GetQuarterFromDate(quarterDate)
		quarters = append(quarters, quarter)
	}

c.JSON(http.StatusOK, gin.H{"quarters": quarters})
}

// ListProgressLogsByObjective handles GET /api/v1/okr/objectives/:id/progress-logs
func (h *OKRHandler) ListProgressLogsByObjective(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	uid := userID.(int)
	idStr := c.Param("id")
	objectiveID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid objective ID"})
		return
	}
	ctx := c.Request.Context()
	objective, err := h.db.OKR().GetObjectiveByID(ctx, objectiveID)
	if err != nil || objective.AssigneeID == nil || *objective.AssigneeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	limit := 50
	offset := 0
	logs, total, err := h.db.OKR().GetProgressLogsByObjective(ctx, objectiveID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch logs"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"total": total, "logs": logs})
}

// ==================== Task-KeyResult Association Handlers ====================

// CreateTaskKRAssociation handles POST /api/v1/okr/tasks/:task_id/key-results/:kr_id/associate
func (h *OKRHandler) CreateTaskKRAssociation(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	taskIDStr := c.Param("task_id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	krIDStr := c.Param("kr_id")
	krID, err := strconv.Atoi(krIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key result ID"})
		return
	}

	var req models.CreateTaskKRAssociationRequest
	req.TaskID = taskID
	req.KeyResultID = krID
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	// Default values if not provided
	if req.Weight == 0 {
		req.Weight = 100.0
	}
	if req.SyncMode == "" {
		req.SyncMode = "auto"
	}

	ctx := c.Request.Context()
	uid := userID.(int)

	// Verify user has access to the key result (via its objective)
	kr, err := h.db.OKR().GetKeyResultByID(ctx, krID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key result not found"})
		return
	}

	objective, err := h.db.OKR().GetObjectiveByID(ctx, kr.ObjectiveID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Objective not found"})
		return
	}

	if objective.AssigneeID == nil || *objective.AssigneeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Verify user has access to the task
	_, err = h.db.Tasks().GetByID(ctx, taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Check if association already exists
	if existing, _ := h.db.OKR().GetTaskKRAssociation(ctx, taskID, krID); existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Association already exists"})
		return
	}

	// Create association
	assoc := &models.TaskKeyResultAssociation{
		TaskID:      req.TaskID,
		KeyResultID: req.KeyResultID,
		Weight:      req.Weight,
		SyncMode:    req.SyncMode,
	}

	if err := h.db.OKR().CreateTaskKRAssociation(ctx, assoc); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create association", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, assoc)
}

// GetTaskKRAssociations handles GET /api/v1/okr/tasks/:task_id/associations
func (h *OKRHandler) GetTaskKRAssociations(c *gin.Context) {
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	taskIDStr := c.Param("task_id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	ctx := c.Request.Context()

	// Get associations for the task
	associations, err := h.db.OKR().GetTaskKRAssociationsByTask(ctx, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get associations", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"associations": associations})
}

// GetKeyResultTaskAssociations handles GET /api/v1/okr/key-results/:kr_id/tasks
func (h *OKRHandler) GetKeyResultTaskAssociations(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	krIDStr := c.Param("kr_id")
	krID, err := strconv.Atoi(krIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key result ID"})
		return
	}

	ctx := c.Request.Context()
	uid := userID.(int)

	// Verify access to key result
	kr, err := h.db.OKR().GetKeyResultByID(ctx, krID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key result not found"})
		return
	}

	objective, err := h.db.OKR().GetObjectiveByID(ctx, kr.ObjectiveID)
	if err != nil || objective.AssigneeID == nil || *objective.AssigneeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Get task associations for the key result
	associations, err := h.db.OKR().GetTaskKRAssociationsByKeyResult(ctx, krID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get task associations", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tasks": associations})
}

// SyncKeyResultProgress handles POST /api/v1/okr/key-results/:kr_id/sync-progress
func (h *OKRHandler) SyncKeyResultProgress(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	krIDStr := c.Param("kr_id")
	krID, err := strconv.Atoi(krIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key result ID"})
		return
	}

	ctx := c.Request.Context()
	uid := userID.(int)

	// Verify access to key result
	kr, err := h.db.OKR().GetKeyResultByID(ctx, krID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key result not found"})
		return
	}

	objective, err := h.db.OKR().GetObjectiveByID(ctx, kr.ObjectiveID)
	if err != nil || objective.AssigneeID == nil || *objective.AssigneeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Calculate new progress from associated tasks
	newProgress, err := h.db.OKR().CalculateKeyResultProgressFromTasks(ctx, krID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate progress", "details": err.Error()})
		return
	}

	// Update key result progress
	oldProgress := kr.Progress
	kr.Progress = newProgress

	if err := h.db.OKR().UpdateKeyResult(ctx, kr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update progress", "details": err.Error()})
		return
	}

	// Log progress sync using new audit format
	reason := "Progress synced from associated tasks"
	oldProgStr := strconv.Itoa(oldProgress)
	newProgStr := strconv.Itoa(newProgress)
	h.logOKRAuditChange(ctx, uid, nil, &kr.ID, models.ChangeTypeSync, "progress", 
		&oldProgStr, &newProgStr, &reason, c)

	c.JSON(http.StatusOK, gin.H{
		"message":      "Progress synced successfully",
		"old_progress": oldProgress,
		"new_progress": newProgress,
		"key_result":   kr,
	})
}

// ListProgressLogsByKeyResult handles GET /api/v1/okr/key-results/:id/progress-logs
func (h *OKRHandler) ListProgressLogsByKeyResult(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	uid := userID.(int)
	idStr := c.Param("id")
	keyResultID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key result ID"})
		return
	}
	ctx := c.Request.Context()
	kr, err := h.db.OKR().GetKeyResultByID(ctx, keyResultID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key result not found"})
		return
	}
	objective, err := h.db.OKR().GetObjectiveByID(ctx, kr.ObjectiveID)
	if err != nil || objective.AssigneeID == nil || *objective.AssigneeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	limit := 50
	offset := 0
	logs, total, err := h.db.OKR().GetProgressLogsByKeyResult(ctx, keyResultID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch logs"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"total": total, "logs": logs})
}

// logOKRAuditChange is a helper function to record audit logs
func (h *OKRHandler) logOKRAuditChange(
	ctx context.Context, 
	userID int,
	objectiveID *int,
	keyResultID *int,
	changeType, fieldName string,
	previousValue, newValue *string,
	reason *string,
	c *gin.Context,
) {
	var ipAddress, userAgent *string
	
	// Get IP address
	if ip := c.ClientIP(); ip != "" {
		ipAddress = &ip
	}
	
	// Get user agent
	if ua := c.GetHeader("User-Agent"); ua != "" {
		userAgent = &ua
	}
	
	log := &models.OKRProgressLog{
		ObjectiveID:   objectiveID,
		KeyResultID:   keyResultID,
		UserID:        userID,
		ChangeType:    changeType,
		FieldName:     fieldName,
		PreviousValue: previousValue,
		NewValue:      newValue,
		Reason:        reason,
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
	}
	
	// Log the change (do not fail the main operation if logging fails)
	_ = h.db.OKR().CreateProgressLog(ctx, log)
}
