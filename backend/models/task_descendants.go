package models

// TaskDescendantNode 表示后代查询返回的节点（平铺）
type TaskDescendantNode struct {
	ID          int    `json:"id" db:"id"`
	ParentID    int    `json:"parent_id" db:"parent_id"`
	ProjectID   int    `json:"project_id" db:"project_id"`
	Title       string `json:"title" db:"title"`
	Status      string `json:"status" db:"status"`
	Level       int    `json:"level" db:"level"`
	HasChildren bool   `json:"has_children" db:"has_children"`
	SortOrder   int    `json:"sort_order" db:"sort_order"`
}
