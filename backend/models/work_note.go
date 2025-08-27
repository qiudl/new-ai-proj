// Work Note Model Extensions
// 工作笔记模型扩展，基于Document模型但针对工作笔记场景优化
// Compatible with existing Document infrastructure

package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// WorkNoteType 工作笔记类型枚举
type WorkNoteType string

const (
	WorkNoteTypeGeneral   WorkNoteType = "general"   // 通用笔记
	WorkNoteTypeMeeting   WorkNoteType = "meeting"   // 会议笔记
	WorkNoteTypeIdea      WorkNoteType = "idea"      // 想法记录
	WorkNoteTypeLog       WorkNoteType = "log"       // 工作日志
	WorkNoteTypeReference WorkNoteType = "reference" // 参考资料
	WorkNoteTypeTemplate  WorkNoteType = "template"  // 笔记模板
)

// WorkNotePriority 工作笔记优先级
type WorkNotePriority string

const (
	WorkNotePriorityLow      WorkNotePriority = "low"
	WorkNotePriorityMedium   WorkNotePriority = "medium"
	WorkNotePriorityHigh     WorkNotePriority = "high"
	WorkNotePriorityUrgent   WorkNotePriority = "urgent"
)

// WorkNoteMetadata 工作笔记专用元数据
type WorkNoteMetadata struct {
	ReadTime       *int                 `json:"read_time,omitempty"`        // 预估阅读时间（分钟）
	WordCount      *int                 `json:"word_count,omitempty"`       // 字数统计
	LastReadAt     *time.Time           `json:"last_read_at,omitempty"`     // 最后阅读时间
	ViewCount      int                  `json:"view_count"`                 // 阅读次数
	IsPinned       bool                 `json:"is_pinned"`                  // 是否置顶
	IsBookmarked   bool                 `json:"is_bookmarked"`              // 是否收藏
	WorkNoteType   WorkNoteType         `json:"work_note_type"`             // 笔记类型
	Priority       WorkNotePriority     `json:"priority"`                   // 优先级
	RelatedTasks   []int                `json:"related_tasks,omitempty"`    // 相关任务ID
	RelatedNotes   []int                `json:"related_notes,omitempty"`    // 相关笔记ID
	CustomFields   map[string]interface{} `json:"custom_fields,omitempty"`  // 自定义字段
}

// Value implements driver.Valuer interface
func (wnm WorkNoteMetadata) Value() (driver.Value, error) {
	return json.Marshal(wnm)
}

// Scan implements sql.Scanner interface
func (wnm *WorkNoteMetadata) Scan(value interface{}) error {
	if value == nil {
		*wnm = WorkNoteMetadata{}
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	
	return json.Unmarshal(bytes, wnm)
}

// WorkNote 工作笔记模型（基于Document扩展）
type WorkNote struct {
	// 基础Document字段
	Document
	
	// 工作笔记专用字段（通过metadata存储，这里提供便捷访问）
	WorkNoteType   WorkNoteType         `json:"work_note_type"`
	Priority       WorkNotePriority     `json:"priority"`
	ReadTime       *int                 `json:"read_time,omitempty"`
	WordCount      *int                 `json:"word_count,omitempty"`
	ViewCount      int                  `json:"view_count"`
	LastReadAt     *time.Time           `json:"last_read_at,omitempty"`
	IsPinned       bool                 `json:"is_pinned"`
	IsBookmarked   bool                 `json:"is_bookmarked"`
	
	// 关联信息
	RelatedTasks   []int                `json:"related_tasks,omitempty"`
	RelatedNotes   []int                `json:"related_notes,omitempty"`
	
	// 文件夹关联（通过Document.FolderID，这里提供类型安全的访问）
	WorkNoteFolderID *int `json:"work_note_folder_id,omitempty"`
	
	// 运行时计算字段（不存储在数据库）
	FolderPath      string   `json:"folder_path,omitempty"`      // 文件夹路径
	RelatedTaskInfo []string `json:"related_task_info,omitempty"` // 相关任务信息
}

// API请求/响应模型

// CreateWorkNoteRequest 创建工作笔记请求
type CreateWorkNoteRequest struct {
	Title            string               `json:"title" validate:"required,min=1,max=255"`
	Content          *string              `json:"content,omitempty"`
	Description      *string              `json:"description,omitempty"`
	WorkNoteFolderID *int                 `json:"work_note_folder_id,omitempty"`
	WorkNoteType     WorkNoteType         `json:"work_note_type" validate:"required"`
	Priority         WorkNotePriority     `json:"priority"`
	Tags             []string             `json:"tags,omitempty"`
	Visibility       Visibility           `json:"visibility" validate:"required"`
	IsPinned         bool                 `json:"is_pinned"`
	IsBookmarked     bool                 `json:"is_bookmarked"`
	RelatedTasks     []int                `json:"related_tasks,omitempty"`
	RelatedNotes     []int                `json:"related_notes,omitempty"`
	CustomFields     map[string]interface{} `json:"custom_fields,omitempty"`
}

// UpdateWorkNoteRequest 更新工作笔记请求
type UpdateWorkNoteRequest struct {
	Title            *string              `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	Content          *string              `json:"content,omitempty"`
	Description      *string              `json:"description,omitempty"`
	WorkNoteFolderID *int                 `json:"work_note_folder_id,omitempty"`
	WorkNoteType     *WorkNoteType        `json:"work_note_type,omitempty"`
	Priority         *WorkNotePriority    `json:"priority,omitempty"`
	Tags             []string             `json:"tags,omitempty"`
	Visibility       *Visibility          `json:"visibility,omitempty"`
	IsPinned         *bool                `json:"is_pinned,omitempty"`
	IsBookmarked     *bool                `json:"is_bookmarked,omitempty"`
	RelatedTasks     []int                `json:"related_tasks,omitempty"`
	RelatedNotes     []int                `json:"related_notes,omitempty"`
	CustomFields     map[string]interface{} `json:"custom_fields,omitempty"`
}

// WorkNoteFilter 工作笔记过滤器
type WorkNoteFilter struct {
	OwnerID          *int                 `json:"owner_id,omitempty"`
	WorkNoteFolderID *int                 `json:"work_note_folder_id,omitempty"`
	WorkNoteType     *WorkNoteType        `json:"work_note_type,omitempty"`
	Priority         *WorkNotePriority    `json:"priority,omitempty"`
	Visibility       *Visibility          `json:"visibility,omitempty"`
	Status           *DocumentStatus      `json:"status,omitempty"`
	IsPinned         *bool                `json:"is_pinned,omitempty"`
	IsBookmarked     *bool                `json:"is_bookmarked,omitempty"`
	IsTemplate       *bool                `json:"is_template,omitempty"`
	Tags             []string             `json:"tags,omitempty"`
	Search           string               `json:"search,omitempty"`
	CreatedAfter     *time.Time           `json:"created_after,omitempty"`
	CreatedBefore    *time.Time           `json:"created_before,omitempty"`
	UpdatedAfter     *time.Time           `json:"updated_after,omitempty"`
	UpdatedBefore    *time.Time           `json:"updated_before,omitempty"`
	SortBy           string               `json:"sort_by,omitempty"`     // created_at, updated_at, title, priority, view_count
	Order            string               `json:"order,omitempty"`       // asc, desc
	Page             int                  `json:"page,omitempty"`
	Limit            int                  `json:"limit,omitempty"`
}

// WorkNoteListResponse 工作笔记列表响应
type WorkNoteListResponse struct {
	Notes []WorkNote `json:"notes"`
	Total int        `json:"total"`
	Page  int        `json:"page"`
	Limit int        `json:"limit"`
}

// WorkNoteSearchResult 工作笔记搜索结果
type WorkNoteSearchResult struct {
	WorkNote
	MatchType         string    `json:"match_type"`      // title, content, description, tags
	MatchScore        float64   `json:"match_score"`
	HighlightedTitle  *string   `json:"highlighted_title,omitempty"`
	HighlightedExcerpt *string  `json:"highlighted_excerpt,omitempty"`
}

// BatchWorkNoteOperation 批量工作笔记操作
type BatchWorkNoteOperation struct {
	NoteIDs   []int                  `json:"note_ids" validate:"required,min=1"`
	Operation string                 `json:"operation" validate:"required"` // move, tag, priority, delete, archive
	Data      map[string]interface{} `json:"data,omitempty"`
}

// WorkNoteStats 工作笔记统计信息
type WorkNoteStats struct {
	TotalNotes      int                           `json:"total_notes"`
	NotesByType     map[WorkNoteType]int          `json:"notes_by_type"`
	NotesByPriority map[WorkNotePriority]int      `json:"notes_by_priority"`
	NotesByFolder   map[int]int                   `json:"notes_by_folder"`
	PinnedCount     int                           `json:"pinned_count"`
	BookmarkedCount int                           `json:"bookmarked_count"`
	RecentActivity  []WorkNoteRecentActivity      `json:"recent_activity,omitempty"`
}

// WorkNoteRecentActivity 工作笔记最近活动
type WorkNoteRecentActivity struct {
	NoteID    int       `json:"note_id"`
	NoteTitle string    `json:"note_title"`
	Action    string    `json:"action"`    // created, updated, viewed
	Timestamp time.Time `json:"timestamp"`
}

// 实例方法

// ToDocument 转换为Document模型
func (wn *WorkNote) ToDocument() Document {
	// 构建metadata
	metadata := DocumentMetadata{
		"work_note_type":   wn.WorkNoteType,
		"priority":         wn.Priority,
		"read_time":        wn.ReadTime,
		"word_count":       wn.WordCount,
		"view_count":       wn.ViewCount,
		"last_read_at":     wn.LastReadAt,
		"is_pinned":        wn.IsPinned,
		"is_bookmarked":    wn.IsBookmarked,
		"related_tasks":    wn.RelatedTasks,
		"related_notes":    wn.RelatedNotes,
	}
	
	doc := wn.Document
	doc.Metadata = metadata
	doc.FolderID = wn.WorkNoteFolderID
	doc.Type = DocumentTypeMarkdown // 工作笔记默认为markdown类型
	
	return doc
}

// FromDocument 从Document模型转换
func (wn *WorkNote) FromDocument(doc Document) error {
	wn.Document = doc
	wn.WorkNoteFolderID = doc.FolderID
	
	// 从metadata解析工作笔记专用字段
	if doc.Metadata != nil {
		if v, ok := doc.Metadata["work_note_type"]; ok {
			if typeStr, ok := v.(string); ok {
				wn.WorkNoteType = WorkNoteType(typeStr)
			}
		}
		
		if v, ok := doc.Metadata["priority"]; ok {
			if priorityStr, ok := v.(string); ok {
				wn.Priority = WorkNotePriority(priorityStr)
			}
		}
		
		if v, ok := doc.Metadata["read_time"]; ok {
			if readTime, ok := v.(float64); ok { // JSON numbers are float64
				rt := int(readTime)
				wn.ReadTime = &rt
			}
		}
		
		if v, ok := doc.Metadata["word_count"]; ok {
			if wordCount, ok := v.(float64); ok {
				wc := int(wordCount)
				wn.WordCount = &wc
			}
		}
		
		if v, ok := doc.Metadata["view_count"]; ok {
			if viewCount, ok := v.(float64); ok {
				wn.ViewCount = int(viewCount)
			}
		}
		
		if v, ok := doc.Metadata["is_pinned"]; ok {
			if isPinned, ok := v.(bool); ok {
				wn.IsPinned = isPinned
			}
		}
		
		if v, ok := doc.Metadata["is_bookmarked"]; ok {
			if isBookmarked, ok := v.(bool); ok {
				wn.IsBookmarked = isBookmarked
			}
		}
		
		// 解析关联任务和笔记
		if v, ok := doc.Metadata["related_tasks"]; ok {
			if tasks, ok := v.([]interface{}); ok {
				wn.RelatedTasks = make([]int, len(tasks))
				for i, task := range tasks {
					if taskID, ok := task.(float64); ok {
						wn.RelatedTasks[i] = int(taskID)
					}
				}
			}
		}
		
		if v, ok := doc.Metadata["related_notes"]; ok {
			if notes, ok := v.([]interface{}); ok {
				wn.RelatedNotes = make([]int, len(notes))
				for i, note := range notes {
					if noteID, ok := note.(float64); ok {
						wn.RelatedNotes[i] = int(noteID)
					}
				}
			}
		}
	}
	
	// 设置默认值
	if wn.WorkNoteType == "" {
		wn.WorkNoteType = WorkNoteTypeGeneral
	}
	if wn.Priority == "" {
		wn.Priority = WorkNotePriorityMedium
	}
	
	return nil
}

// UpdateMetadata 更新文档的metadata字段以匹配工作笔记字段
func (wn *WorkNote) UpdateMetadata() {
	if wn.Document.Metadata == nil {
		wn.Document.Metadata = make(DocumentMetadata)
	}
	
	wn.Document.Metadata["work_note_type"] = wn.WorkNoteType
	wn.Document.Metadata["priority"] = wn.Priority
	wn.Document.Metadata["read_time"] = wn.ReadTime
	wn.Document.Metadata["word_count"] = wn.WordCount
	wn.Document.Metadata["view_count"] = wn.ViewCount
	wn.Document.Metadata["last_read_at"] = wn.LastReadAt
	wn.Document.Metadata["is_pinned"] = wn.IsPinned
	wn.Document.Metadata["is_bookmarked"] = wn.IsBookmarked
	wn.Document.Metadata["related_tasks"] = wn.RelatedTasks
	wn.Document.Metadata["related_notes"] = wn.RelatedNotes
}

// IsWorkNote 检查文档是否为工作笔记
func IsWorkNote(doc Document) bool {
	if doc.Metadata == nil {
		return false
	}
	
	_, hasType := doc.Metadata["work_note_type"]
	return hasType
}

// Validate 验证工作笔记数据
func (wn *WorkNote) Validate() error {
	// 基础验证
	if wn.Title == "" {
		return errors.New("work note title is required")
	}
	
	if len(wn.Title) > 255 {
		return errors.New("work note title too long")
	}
	
	// 验证工作笔记类型
	validTypes := map[WorkNoteType]bool{
		WorkNoteTypeGeneral:   true,
		WorkNoteTypeMeeting:   true,
		WorkNoteTypeIdea:      true,
		WorkNoteTypeLog:       true,
		WorkNoteTypeReference: true,
		WorkNoteTypeTemplate:  true,
	}
	
	if !validTypes[wn.WorkNoteType] {
		return errors.New("invalid work note type")
	}
	
	// 验证优先级
	validPriorities := map[WorkNotePriority]bool{
		WorkNotePriorityLow:    true,
		WorkNotePriorityMedium: true,
		WorkNotePriorityHigh:   true,
		WorkNotePriorityUrgent: true,
	}
	
	if !validPriorities[wn.Priority] {
		return errors.New("invalid work note priority")
	}
	
	return nil
}

// CalculateReadTime 根据内容计算预估阅读时间
func (wn *WorkNote) CalculateReadTime() {
	if wn.Content == nil || *wn.Content == "" {
		return
	}
	
	// 简单的字数统计（中英文）
	content := *wn.Content
	wordCount := len([]rune(content))
	
	// 假设平均阅读速度：中文250字/分钟，英文200词/分钟
	// 这里简化为300字符/分钟
	readTime := wordCount / 300
	if readTime < 1 {
		readTime = 1
	}
	
	wn.ReadTime = &readTime
	wn.WordCount = &wordCount
}
