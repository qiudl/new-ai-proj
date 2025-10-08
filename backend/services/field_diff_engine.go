package services

import (
	"ai-project-backend/models"
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"
)

// FieldDiffEngine 字段差异计算引擎
type FieldDiffEngine struct{}

// NewFieldDiffEngine 创建新的字段差异引擎
func NewFieldDiffEngine() *FieldDiffEngine {
	return &FieldDiffEngine{}
}

// TaskDiff 任务差异结构
type TaskDiff struct {
	// 基础字段差异
	TitleChanged       bool
	DescriptionChanged bool
	StatusChanged      bool
	PriorityChanged    bool
	AssigneeChanged    bool
	DueDateChanged     bool
	EstimatedTimeChanged bool
	TagsChanged        bool
	
	// 变更前后的值
	OldTitle       string
	NewTitle       string
	OldDescription string
	NewDescription string
	OldStatus      string
	NewStatus      string
	OldPriority    string
	NewPriority    string
	OldAssigneeID  *int64
	NewAssigneeID  *int64
	OldDueDate     *time.Time
	NewDueDate     *time.Time
	OldEstimatedMinutes *int
	NewEstimatedMinutes *int
	OldTags        []string
	NewTags        []string
	
	// 关系变更
	ParentChanged      bool
	ChildrenChanged    bool
	DependenciesChanged bool
	OldParentID        *int64
	NewParentID        *int64
	
	// 自定义字段变更
	CustomFieldsChanged bool
	CustomFieldsDiff    map[string]*FieldChange
	
	// 元信息
	ChangedFields      []string
	ChangeCount        int
	HasSignificantChanges bool // 是否有重要变更（非时间戳类）
}

// FieldChange 字段变更详情
type FieldChange struct {
	FieldName    string      `json:"field_name"`
	FieldType    string      `json:"field_type"`
	OldValue     interface{} `json:"old_value"`
	NewValue     interface{} `json:"new_value"`
	ChangeType   string      `json:"change_type"` // created, updated, deleted
	IsSignificant bool       `json:"is_significant"`
	Description  string      `json:"description"`
}

// ComputeDetailedDiff 计算任务的详细差异
func (e *FieldDiffEngine) ComputeDetailedDiff(oldTask, newTask *models.Task) *TaskDiff {
	diff := &TaskDiff{
		CustomFieldsDiff: make(map[string]*FieldChange),
		ChangedFields:    []string{},
	}
	
	if oldTask == nil && newTask != nil {
		// 新创建的任务
		return e.computeCreationDiff(newTask)
	}
	
	if oldTask != nil && newTask == nil {
		// 任务被删除
		return e.computeDeletionDiff(oldTask)
	}
	
	if oldTask == nil && newTask == nil {
		return diff
	}
	
	// 比较基础字段
	e.compareBasicFields(oldTask, newTask, diff)
	
	// 比较关系字段
	e.compareRelationFields(oldTask, newTask, diff)
	
	// 比较自定义字段
	e.compareCustomFields(oldTask, newTask, diff)
	
	// 计算变更统计
	e.calculateChangeStatistics(diff)
	
	return diff
}

// compareBasicFields 比较基础字段
func (e *FieldDiffEngine) compareBasicFields(oldTask, newTask *models.Task, diff *TaskDiff) {
	// 标题变更
	if oldTask.Title != newTask.Title {
		diff.TitleChanged = true
		diff.OldTitle = oldTask.Title
		diff.NewTitle = newTask.Title
		diff.ChangedFields = append(diff.ChangedFields, "title")
	}
	
	// 描述变更
	oldDesc := ""
	if oldTask.Description != nil {
		oldDesc = *oldTask.Description
	}
	newDesc := ""
	if newTask.Description != nil {
		newDesc = *newTask.Description
	}
	if oldDesc != newDesc {
		diff.DescriptionChanged = true
		diff.OldDescription = oldDesc
		diff.NewDescription = newDesc
		diff.ChangedFields = append(diff.ChangedFields, "description")
	}
	
	// 状态变更
	if oldTask.Status != newTask.Status {
		diff.StatusChanged = true
		diff.OldStatus = oldTask.Status
		diff.NewStatus = newTask.Status
		diff.ChangedFields = append(diff.ChangedFields, "status")
	}
	
	// 优先级变更
	oldPriority := e.extractPriority(oldTask.CustomFields)
	newPriority := e.extractPriority(newTask.CustomFields)
	if oldPriority != newPriority {
		diff.PriorityChanged = true
		diff.OldPriority = oldPriority
		diff.NewPriority = newPriority
		diff.ChangedFields = append(diff.ChangedFields, "priority")
	}
	
	// 分配人变更
	if !e.intPtrEqual(oldTask.AssigneeID, newTask.AssigneeID) {
		diff.AssigneeChanged = true
		diff.OldAssigneeID = e.intToInt64Ptr(oldTask.AssigneeID)
		diff.NewAssigneeID = e.intToInt64Ptr(newTask.AssigneeID)
		diff.ChangedFields = append(diff.ChangedFields, "assignee")
	}
	
	// 截止时间变更
	if !e.timePtrEqual(oldTask.DueDate, newTask.DueDate) {
		diff.DueDateChanged = true
		diff.OldDueDate = oldTask.DueDate
		diff.NewDueDate = newTask.DueDate
		diff.ChangedFields = append(diff.ChangedFields, "due_date")
	}
	
	// 预估时间变更
	if oldTask.EstimatedMinutes != newTask.EstimatedMinutes {
		diff.EstimatedTimeChanged = true
		diff.OldEstimatedMinutes = &oldTask.EstimatedMinutes
		diff.NewEstimatedMinutes = &newTask.EstimatedMinutes
		diff.ChangedFields = append(diff.ChangedFields, "estimated_time")
	}
	
	// 标签变更
	oldTags := e.extractTags(oldTask.CustomFields)
	newTags := e.extractTags(newTask.CustomFields)
	if !e.stringSliceEqual(oldTags, newTags) {
		diff.TagsChanged = true
		diff.OldTags = oldTags
		diff.NewTags = newTags
		diff.ChangedFields = append(diff.ChangedFields, "tags")
	}
}

// compareRelationFields 比较关系字段
func (e *FieldDiffEngine) compareRelationFields(oldTask, newTask *models.Task, diff *TaskDiff) {
	// 父任务变更
	if !e.intPtrEqual(oldTask.ParentID, newTask.ParentID) {
		diff.ParentChanged = true
		diff.OldParentID = e.intToInt64Ptr(oldTask.ParentID)
		diff.NewParentID = e.intToInt64Ptr(newTask.ParentID)
		diff.ChangedFields = append(diff.ChangedFields, "parent")
	}
	
	// 依赖关系变更（如果有相关字段）
	oldDeps := e.extractDependencies(oldTask.CustomFields)
	newDeps := e.extractDependencies(newTask.CustomFields)
	if !e.int64SliceEqual(oldDeps, newDeps) {
		diff.DependenciesChanged = true
		diff.ChangedFields = append(diff.ChangedFields, "dependencies")
	}
}

// compareCustomFields 比较自定义字段
func (e *FieldDiffEngine) compareCustomFields(oldTask, newTask *models.Task, diff *TaskDiff) {
	oldFields := make(map[string]interface{})
	newFields := make(map[string]interface{})
	
	// 转换自定义字段为map
	if oldTask.CustomFields != nil {
		for k, v := range oldTask.CustomFields {
			oldFields[k] = v
		}
	}
	
	if newTask.CustomFields != nil {
		for k, v := range newTask.CustomFields {
			newFields[k] = v
		}
	}
	
	// 获取所有字段名
	allFields := make(map[string]bool)
	for k := range oldFields {
		allFields[k] = true
	}
	for k := range newFields {
		allFields[k] = true
	}
	
	// 比较每个字段
	for fieldName := range allFields {
		oldValue, oldExists := oldFields[fieldName]
		newValue, newExists := newFields[fieldName]
		
		if !oldExists && newExists {
			// 新增字段
			diff.CustomFieldsDiff[fieldName] = &FieldChange{
				FieldName:     fieldName,
				FieldType:     e.getValueType(newValue),
				OldValue:      nil,
				NewValue:      newValue,
				ChangeType:    "created",
				IsSignificant: e.isSignificantField(fieldName),
				Description:   fmt.Sprintf("Added field '%s'", fieldName),
			}
			diff.CustomFieldsChanged = true
		} else if oldExists && !newExists {
			// 删除字段
			diff.CustomFieldsDiff[fieldName] = &FieldChange{
				FieldName:     fieldName,
				FieldType:     e.getValueType(oldValue),
				OldValue:      oldValue,
				NewValue:      nil,
				ChangeType:    "deleted",
				IsSignificant: e.isSignificantField(fieldName),
				Description:   fmt.Sprintf("Removed field '%s'", fieldName),
			}
			diff.CustomFieldsChanged = true
		} else if oldExists && newExists && !e.valuesEqual(oldValue, newValue) {
			// 修改字段
			diff.CustomFieldsDiff[fieldName] = &FieldChange{
				FieldName:     fieldName,
				FieldType:     e.getValueType(newValue),
				OldValue:      oldValue,
				NewValue:      newValue,
				ChangeType:    "updated",
				IsSignificant: e.isSignificantField(fieldName),
				Description:   fmt.Sprintf("Updated field '%s'", fieldName),
			}
			diff.CustomFieldsChanged = true
		}
	}
}

// calculateChangeStatistics 计算变更统计
func (e *FieldDiffEngine) calculateChangeStatistics(diff *TaskDiff) {
	diff.ChangeCount = len(diff.ChangedFields)
	
	// 判断是否有重要变更
	significantFields := []string{"title", "description", "status", "priority", "assignee", "due_date", "parent"}
	for _, field := range diff.ChangedFields {
		for _, sigField := range significantFields {
			if field == sigField {
				diff.HasSignificantChanges = true
				return
			}
		}
	}
	
	// 检查自定义字段中的重要变更
	for _, change := range diff.CustomFieldsDiff {
		if change.IsSignificant {
			diff.HasSignificantChanges = true
			return
		}
	}
}

// computeCreationDiff 计算创建时的差异
func (e *FieldDiffEngine) computeCreationDiff(task *models.Task) *TaskDiff {
	diff := &TaskDiff{
		TitleChanged:        true,
		StatusChanged:       true,
		HasSignificantChanges: true,
		ChangedFields:       []string{"created"},
		ChangeCount:         1,
		CustomFieldsDiff:    make(map[string]*FieldChange),
		NewTitle:            task.Title,
		NewStatus:           task.Status,
	}
	
	return diff
}

// computeDeletionDiff 计算删除时的差异
func (e *FieldDiffEngine) computeDeletionDiff(task *models.Task) *TaskDiff {
	diff := &TaskDiff{
		TitleChanged:        true,
		StatusChanged:       true,
		HasSignificantChanges: true,
		ChangedFields:       []string{"deleted"},
		ChangeCount:         1,
		CustomFieldsDiff:    make(map[string]*FieldChange),
		OldTitle:            task.Title,
		OldStatus:           task.Status,
	}
	
	return diff
}

// Helper functions

func (e *FieldDiffEngine) extractPriority(customFields models.CustomFields) string {
	if customFields == nil {
		return ""
	}
	if priority, exists := customFields["priority"]; exists {
		if priorityStr, ok := priority.(string); ok {
			return priorityStr
		}
	}
	return ""
}

func (e *FieldDiffEngine) extractTags(customFields models.CustomFields) []string {
	if customFields == nil {
		return []string{}
	}
	if tags, exists := customFields["tags"]; exists {
		if tagSlice, ok := tags.([]interface{}); ok {
			result := make([]string, 0, len(tagSlice))
			for _, tag := range tagSlice {
				if tagStr, ok := tag.(string); ok {
					result = append(result, tagStr)
				}
			}
			return result
		}
		if tagSlice, ok := tags.([]string); ok {
			return tagSlice
		}
	}
	return []string{}
}

func (e *FieldDiffEngine) extractDependencies(customFields models.CustomFields) []int64 {
	if customFields == nil {
		return []int64{}
	}
	if deps, exists := customFields["dependencies"]; exists {
		if depSlice, ok := deps.([]interface{}); ok {
			result := make([]int64, 0, len(depSlice))
			for _, dep := range depSlice {
				if depFloat, ok := dep.(float64); ok {
					result = append(result, int64(depFloat))
				}
				if depInt, ok := dep.(int64); ok {
					result = append(result, depInt)
				}
				if depInt, ok := dep.(int); ok {
					result = append(result, int64(depInt))
				}
			}
			return result
		}
	}
	return []int64{}
}

func (e *FieldDiffEngine) int64PtrEqual(a, b *int64) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func (e *FieldDiffEngine) intPtrEqual(a, b *int) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func (e *FieldDiffEngine) timePtrEqual(a, b *time.Time) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return a.Equal(*b)
}

func (e *FieldDiffEngine) stringSliceEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i, v := range a {
		if v != b[i] {
			return false
		}
	}
	return true
}

func (e *FieldDiffEngine) int64SliceEqual(a, b []int64) bool {
	if len(a) != len(b) {
		return false
	}
	for i, v := range a {
		if v != b[i] {
			return false
		}
	}
	return true
}

func (e *FieldDiffEngine) valuesEqual(a, b interface{}) bool {
	return reflect.DeepEqual(a, b)
}

func (e *FieldDiffEngine) getValueType(value interface{}) string {
	if value == nil {
		return "null"
	}
	
	switch value.(type) {
	case string:
		return "string"
	case int, int32, int64:
		return "integer"
	case float32, float64:
		return "number"
	case bool:
		return "boolean"
	case []interface{}, []string, []int:
		return "array"
	case map[string]interface{}:
		return "object"
	default:
		return "unknown"
	}
}

func (e *FieldDiffEngine) isSignificantField(fieldName string) bool {
	significantFields := []string{
		"priority", "tags", "dependencies", "milestone", "category",
		"progress", "difficulty", "business_value", "technical_debt",
	}
	
	fieldLower := strings.ToLower(fieldName)
	for _, sigField := range significantFields {
		if fieldLower == sigField {
			return true
		}
	}
	
	return false
}

// GetChangeDescription 获取变更的人类可读描述
func (e *FieldDiffEngine) GetChangeDescription(diff *TaskDiff) string {
	if diff.ChangeCount == 0 {
		return "无变更"
	}
	
	descriptions := []string{}
	
	if diff.TitleChanged {
		descriptions = append(descriptions, fmt.Sprintf("标题从 '%s' 变更为 '%s'", diff.OldTitle, diff.NewTitle))
	}
	
	if diff.StatusChanged {
		descriptions = append(descriptions, fmt.Sprintf("状态从 '%s' 变更为 '%s'", diff.OldStatus, diff.NewStatus))
	}
	
	if diff.PriorityChanged {
		descriptions = append(descriptions, fmt.Sprintf("优先级从 '%s' 变更为 '%s'", diff.OldPriority, diff.NewPriority))
	}
	
	if diff.AssigneeChanged {
		oldAssignee := "未分配"
		newAssignee := "未分配"
		if diff.OldAssigneeID != nil {
			oldAssignee = "用户" + strconv.FormatInt(*diff.OldAssigneeID, 10)
		}
		if diff.NewAssigneeID != nil {
			newAssignee = "用户" + strconv.FormatInt(*diff.NewAssigneeID, 10)
		}
		descriptions = append(descriptions, fmt.Sprintf("分配人从 %s 变更为 %s", oldAssignee, newAssignee))
	}
	
	if diff.DueDateChanged {
		oldDate := "无截止时间"
		newDate := "无截止时间"
		if diff.OldDueDate != nil {
			oldDate = diff.OldDueDate.Format("2006-01-02")
		}
		if diff.NewDueDate != nil {
			newDate = diff.NewDueDate.Format("2006-01-02")
		}
		descriptions = append(descriptions, fmt.Sprintf("截止时间从 %s 变更为 %s", oldDate, newDate))
	}
	
	if diff.ParentChanged {
		oldParent := "无父任务"
		newParent := "无父任务"
		if diff.OldParentID != nil {
			oldParent = "任务" + strconv.FormatInt(*diff.OldParentID, 10)
		}
		if diff.NewParentID != nil {
			newParent = "任务" + strconv.FormatInt(*diff.NewParentID, 10)
		}
		descriptions = append(descriptions, fmt.Sprintf("父任务从 %s 变更为 %s", oldParent, newParent))
	}
	
	if diff.CustomFieldsChanged {
		customChanges := len(diff.CustomFieldsDiff)
		descriptions = append(descriptions, fmt.Sprintf("更新了 %d 个自定义字段", customChanges))
	}
	
	if len(descriptions) == 0 {
		return fmt.Sprintf("更新了 %d 个字段", diff.ChangeCount)
	}
	
	if len(descriptions) == 1 {
		return descriptions[0]
	}
	
	return strings.Join(descriptions[:len(descriptions)-1], ", ") + " 和 " + descriptions[len(descriptions)-1]
}

// intToInt64Ptr converts *int to *int64
func (e *FieldDiffEngine) intToInt64Ptr(intPtr *int) *int64 {
	if intPtr == nil {
		return nil
	}
	val := int64(*intPtr)
	return &val
}