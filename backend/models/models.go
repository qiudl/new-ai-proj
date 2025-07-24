package models

// 任务状态枚举
const (
	TaskStatusTodo       = "todo"
	TaskStatusInProgress = "in_progress"
	TaskStatusDone       = "done"
	TaskStatusCancelled  = "cancelled"
)

// IsValidStatus 检查任务状态是否有效
func IsValidStatus(status string) bool {
	validStatuses := []string{
		TaskStatusTodo,
		TaskStatusInProgress,
		TaskStatusDone,
		TaskStatusCancelled,
	}
	
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}
