package interfaces

import (
	"context"
	"time"
)

// DocumentServiceInterface 统一文档服务接口
type DocumentServiceInterface interface {
	// 基础CRUD操作
	CreateDocument(ctx context.Context, req *CreateDocumentRequest) error
	ReadDocument(ctx context.Context, req *ReadDocumentRequest) (*DocumentResponse, error)
	UpdateDocument(ctx context.Context, req *UpdateDocumentRequest) error
	UpdateDocumentByID(ctx context.Context, req *UpdateDocumentByIDRequest) error // 通过文档ID更新
	DeleteDocument(ctx context.Context, req *DeleteDocumentRequest) error

	// 高级功能
	GetDocumentHistory(ctx context.Context, req *HistoryRequest) ([]GitCommit, error)
	ArchiveDocument(ctx context.Context, req *ArchiveRequest) error
	MigrateDocument(ctx context.Context, req *MigrateRequest) error

	// Phase 2: 版本管理功能
	CompareVersions(ctx context.Context, req *CompareVersionsRequest) (*VersionComparisonResponse, error)
	GetDocumentAtVersion(ctx context.Context, req *VersionRequest) (*DocumentResponse, error)
	ResolveConflict(ctx context.Context, req *ConflictResolutionRequest) error

	// Phase 2: 高级搜索功能
	SearchDocuments(ctx context.Context, req *SearchRequest) (*SearchResponse, error)
	IndexDocument(ctx context.Context, req *IndexRequest) error

	// Phase 2: 批量操作功能
	BatchCreateDocuments(ctx context.Context, req *BatchCreateRequest) (*BatchOperationResponse, error)
	BatchUpdateDocuments(ctx context.Context, req *BatchUpdateRequest) (*BatchOperationResponse, error)
	BatchDeleteDocuments(ctx context.Context, req *BatchDeleteRequest) (*BatchOperationResponse, error)
	ExportDocuments(ctx context.Context, req *ExportRequest) (*ExportResponse, error)
	ImportDocuments(ctx context.Context, req *ImportRequest) (*ImportResponse, error)

	// Phase 2: 协作功能
	LockDocument(ctx context.Context, req *DocumentLockRequest) error
	UnlockDocument(ctx context.Context, req *DocumentLockRequest) error
	GetDocumentLockStatus(ctx context.Context, req *LockStatusRequest) (*LockStatusResponse, error)

	// Phase 3: 迁移自HybridDocumentHandler的功能
	CopyDocument(ctx context.Context, req *CopyDocumentRequest) (int, error)
	ToggleTemplate(ctx context.Context, req *ToggleTemplateRequest) (bool, error)

	// 健康检查
	HealthCheck(ctx context.Context) error
}

// 请求结构定义

// CreateDocumentRequest 创建文档请求
type CreateDocumentRequest struct {
	ProjectID  int    `json:"project_id" validate:"required,min=1"`
	TaskID     int    `json:"task_id" validate:"required,min=1"`
	Content    string `json:"content" validate:"required"`
	Format     string `json:"format" validate:"oneof=markdown text"`
	UserID     int    `json:"user_id" validate:"required,min=1"`
	TemplateID string `json:"template_id,omitempty"`
	Title      string `json:"title,omitempty"` // 支持前端传入的title字段
}

// ReadDocumentRequest 读取文档请求
type ReadDocumentRequest struct {
	ProjectID int `json:"project_id" validate:"required,min=1"`
	TaskID    int `json:"task_id" validate:"required,min=1"`
	UserID    int `json:"user_id" validate:"required,min=1"`
}

// UpdateDocumentRequest 更新文档请求
type UpdateDocumentRequest struct {
	ProjectID int    `json:"project_id" validate:"required,min=1"`
	TaskID    int    `json:"task_id" validate:"required,min=1"`
	Content   string `json:"content" validate:"required"`
	UserID    int    `json:"user_id" validate:"required,min=1"`
	Message   string `json:"message,omitempty"` // Git提交信息
}

// UpdateDocumentByIDRequest 通过文档ID更新文档请求
// 用于全局文档路由，不需要提供项目和任务ID
type UpdateDocumentByIDRequest struct {
	DocumentID int    `json:"document_id" validate:"required,min=1"`
	Content    string `json:"content" validate:"required"`
	UserID     int    `json:"user_id" validate:"required,min=1"`
	Message    string `json:"message,omitempty"` // Git提交信息
}

// DeleteDocumentRequest 删除文档请求
type DeleteDocumentRequest struct {
	ProjectID int    `json:"project_id" validate:"required,min=1"`
	TaskID    int    `json:"task_id" validate:"required,min=1"`
	UserID    int    `json:"user_id" validate:"required,min=1"`
	Reason    string `json:"reason,omitempty"`
}

// HistoryRequest 历史记录请求
type HistoryRequest struct {
	ProjectID int `json:"project_id" validate:"required,min=1"`
	TaskID    int `json:"task_id" validate:"required,min=1"`
	UserID    int `json:"user_id" validate:"required,min=1"`
	Limit     int `json:"limit,omitempty" validate:"min=1,max=100"`
	Offset    int `json:"offset,omitempty" validate:"min=0"`
}

// ArchiveRequest 归档请求
type ArchiveRequest struct {
	ProjectID int    `json:"project_id" validate:"required,min=1"`
	TaskID    int    `json:"task_id" validate:"required,min=1"`
	UserID    int    `json:"user_id" validate:"required,min=1"`
	Reason    string `json:"reason,omitempty"`
}

// MigrateRequest 迁移请求
type MigrateRequest struct {
	SourcePath string `json:"source_path" validate:"required"`
	TargetPath string `json:"target_path" validate:"required"`
	UserID     int    `json:"user_id" validate:"required,min=1"`
	DryRun     bool   `json:"dry_run,omitempty"`
}

// 响应结构定义

// DocumentResponse 文档响应
type DocumentResponse struct {
	TaskID      int       `json:"task_id"`
	ProjectID   int       `json:"project_id"`
	Content     string    `json:"content"`
	Format      string    `json:"format"`
	Size        int64     `json:"size"`
	LastUpdated time.Time `json:"last_updated"`
	CreatedAt   time.Time `json:"created_at"`
	Version     string    `json:"version,omitempty"`
	Path        string    `json:"path"`
}

// GitCommit Git提交信息
type GitCommit struct {
	Hash    string    `json:"hash"`
	Author  string    `json:"author"`
	Date    time.Time `json:"date"`
	Message string    `json:"message"`
	Changes int       `json:"changes,omitempty"`
}

// DocumentError 文档错误
type DocumentError struct {
	Code     string `json:"code"`
	Message  string `json:"message"`
	Details  string `json:"details,omitempty"`
	Severity string `json:"severity"` // error, warning, info
}

// 配置结构

// DocumentConfig 文档配置
type DocumentConfig struct {
	BasePath          string            `yaml:"base_path" json:"base_path"`
	GitEnabled        bool              `yaml:"git_enabled" json:"git_enabled"`
	CacheEnabled      bool              `yaml:"cache_enabled" json:"cache_enabled"`
	MaxFileSize       int64             `yaml:"max_file_size" json:"max_file_size"`
	AllowedExtensions []string          `yaml:"allowed_extensions" json:"allowed_extensions"`
	BackupEnabled     bool              `yaml:"backup_enabled" json:"backup_enabled"`
	Templates         map[string]string `yaml:"templates" json:"templates"`

	// 缓存配置
	Cache CacheConfig `yaml:"cache" json:"cache"`

	// Git配置
	Git GitConfig `yaml:"git" json:"git"`
}

// CacheConfig 缓存配置
type CacheConfig struct {
	TTL     time.Duration `yaml:"ttl" json:"ttl"`
	MaxSize int           `yaml:"max_size" json:"max_size"`
	Enabled bool          `yaml:"enabled" json:"enabled"`
}

// GitConfig Git配置
type GitConfig struct {
	Enabled      bool   `yaml:"enabled" json:"enabled"`
	AutoCommit   bool   `yaml:"auto_commit" json:"auto_commit"`
	CommitPrefix string `yaml:"commit_prefix" json:"commit_prefix"`
	AuthorName   string `yaml:"author_name" json:"author_name"`
	AuthorEmail  string `yaml:"author_email" json:"author_email"`
}

// ===== Phase 2: 新增结构定义 =====

// CompareVersionsRequest 版本比较请求
type CompareVersionsRequest struct {
	ProjectID   int    `json:"project_id" validate:"required,min=1"`
	TaskID      int    `json:"task_id" validate:"required,min=1"`
	UserID      int    `json:"user_id" validate:"required,min=1"`
	FromVersion string `json:"from_version" validate:"required"`
	ToVersion   string `json:"to_version" validate:"required"`
}

// VersionRequest 版本请求
type VersionRequest struct {
	ProjectID int    `json:"project_id" validate:"required,min=1"`
	TaskID    int    `json:"task_id" validate:"required,min=1"`
	UserID    int    `json:"user_id" validate:"required,min=1"`
	Version   string `json:"version" validate:"required"`
}

// ConflictResolutionRequest 冲突解决请求
type ConflictResolutionRequest struct {
	ProjectID      int                    `json:"project_id" validate:"required,min=1"`
	TaskID         int                    `json:"task_id" validate:"required,min=1"`
	UserID         int                    `json:"user_id" validate:"required,min=1"`
	BaseVersion    string                 `json:"base_version" validate:"required"`
	ConflictBlocks []ConflictBlock        `json:"conflict_blocks" validate:"required"`
	Resolution     ConflictResolutionType `json:"resolution" validate:"required"`
	Message        string                 `json:"message,omitempty"`
}

// SearchRequest 搜索请求
type SearchRequest struct {
	UserID     int               `json:"user_id" validate:"required,min=1"`
	Query      string            `json:"query" validate:"required"`
	ProjectIDs []int             `json:"project_ids,omitempty"`
	TaskIDs    []int             `json:"task_ids,omitempty"`
	Filters    map[string]string `json:"filters,omitempty"`
	SortBy     string            `json:"sort_by,omitempty"`
	SortOrder  string            `json:"sort_order,omitempty"`
	Limit      int               `json:"limit,omitempty" validate:"min=1,max=100"`
	Offset     int               `json:"offset,omitempty" validate:"min=0"`
}

// IndexRequest 索引请求
type IndexRequest struct {
	ProjectID int `json:"project_id" validate:"required,min=1"`
	TaskID    int `json:"task_id" validate:"required,min=1"`
	UserID    int `json:"user_id" validate:"required,min=1"`
}

// BatchCreateRequest 批量创建请求
type BatchCreateRequest struct {
	UserID    int                     `json:"user_id" validate:"required,min=1"`
	Documents []CreateDocumentRequest `json:"documents" validate:"required,min=1"`
}

// BatchUpdateRequest 批量更新请求
type BatchUpdateRequest struct {
	UserID    int                     `json:"user_id" validate:"required,min=1"`
	Documents []UpdateDocumentRequest `json:"documents" validate:"required,min=1"`
}

// BatchDeleteRequest 批量删除请求
type BatchDeleteRequest struct {
	UserID    int                     `json:"user_id" validate:"required,min=1"`
	Documents []DeleteDocumentRequest `json:"documents" validate:"required,min=1"`
}

// ExportRequest 导出请求
type ExportRequest struct {
	UserID      int    `json:"user_id" validate:"required,min=1"`
	ProjectIDs  []int  `json:"project_ids,omitempty"`
	TaskIDs     []int  `json:"task_ids,omitempty"`
	Format      string `json:"format" validate:"oneof=zip tar json markdown"`
	IncludeMeta bool   `json:"include_meta,omitempty"`
}

// ImportRequest 导入请求
type ImportRequest struct {
	UserID    int           `json:"user_id" validate:"required,min=1"`
	ProjectID int           `json:"project_id" validate:"required,min=1"`
	Data      []byte        `json:"data" validate:"required"`
	Format    string        `json:"format" validate:"oneof=zip tar json"`
	Options   ImportOptions `json:"options,omitempty"`
}

// DocumentLockRequest 文档锁定请求
type DocumentLockRequest struct {
	ProjectID int    `json:"project_id" validate:"required,min=1"`
	TaskID    int    `json:"task_id" validate:"required,min=1"`
	UserID    int    `json:"user_id" validate:"required,min=1"`
	LockType  string `json:"lock_type,omitempty" validate:"oneof=read write exclusive"`
	TTL       int    `json:"ttl,omitempty"` // 锁定时间(秒)
}

// LockStatusRequest 锁定状态请求
type LockStatusRequest struct {
	ProjectID int `json:"project_id" validate:"required,min=1"`
	TaskID    int `json:"task_id" validate:"required,min=1"`
	UserID    int `json:"user_id" validate:"required,min=1"`
}

// ===== Phase 2: 响应结构定义 =====

// VersionComparisonResponse 版本比较响应
type VersionComparisonResponse struct {
	FromVersion string          `json:"from_version"`
	ToVersion   string          `json:"to_version"`
	Changes     []ChangeItem    `json:"changes"`
	HasConflict bool            `json:"has_conflict"`
	Conflicts   []ConflictBlock `json:"conflicts,omitempty"`
	Stats       ComparisonStats `json:"stats"`
}

// SearchResponse 搜索响应
type SearchResponse struct {
	Results   []SearchResult `json:"results"`
	Total     int            `json:"total"`
	Page      int            `json:"page"`
	PageSize  int            `json:"page_size"`
	QueryTime float64        `json:"query_time"` // 毫秒
}

// BatchOperationResponse 批量操作响应
type BatchOperationResponse struct {
	Total   int                    `json:"total"`
	Success int                    `json:"success"`
	Failed  int                    `json:"failed"`
	Results []BatchOperationResult `json:"results"`
}

// ExportResponse 导出响应
type ExportResponse struct {
	FileName string `json:"file_name"`
	Size     int64  `json:"size"`
	Data     []byte `json:"data"`
	Format   string `json:"format"`
}

// ImportResponse 导入响应
type ImportResponse struct {
	Total   int            `json:"total"`
	Success int            `json:"success"`
	Failed  int            `json:"failed"`
	Results []ImportResult `json:"results"`
}

// LockStatusResponse 锁定状态响应
type LockStatusResponse struct {
	IsLocked  bool      `json:"is_locked"`
	LockType  string    `json:"lock_type,omitempty"`
	LockedBy  int       `json:"locked_by,omitempty"`
	LockedAt  time.Time `json:"locked_at,omitempty"`
	ExpiresAt time.Time `json:"expires_at,omitempty"`
	CanEdit   bool      `json:"can_edit"`
}

// ===== 辅助结构定义 =====

// ConflictBlock 冲突块
type ConflictBlock struct {
	LineStart int    `json:"line_start"`
	LineEnd   int    `json:"line_end"`
	BaseText  string `json:"base_text"`
	TheirText string `json:"their_text"`
	YourText  string `json:"your_text"`
}

// ConflictResolutionType 冲突解决类型
type ConflictResolutionType string

const (
	ResolutionKeepBase  ConflictResolutionType = "keep_base"
	ResolutionKeepTheir ConflictResolutionType = "keep_their"
	ResolutionKeepYour  ConflictResolutionType = "keep_your"
	ResolutionMerge     ConflictResolutionType = "merge"
	ResolutionCustom    ConflictResolutionType = "custom"
)

// ChangeItem 变更项
type ChangeItem struct {
	Type    string `json:"type"` // added, deleted, modified
	LineNum int    `json:"line_num"`
	OldText string `json:"old_text,omitempty"`
	NewText string `json:"new_text,omitempty"`
}

// ComparisonStats 比较统计
type ComparisonStats struct {
	LinesAdded   int `json:"lines_added"`
	LinesDeleted int `json:"lines_deleted"`
	LinesChanged int `json:"lines_changed"`
	WordsAdded   int `json:"words_added"`
	WordsDeleted int `json:"words_deleted"`
}

// SearchResult 搜索结果
type SearchResult struct {
	ProjectID   int       `json:"project_id"`
	TaskID      int       `json:"task_id"`
	Title       string    `json:"title"`
	Content     string    `json:"content"`
	Snippet     string    `json:"snippet"`
	Score       float64   `json:"score"`
	LastUpdated time.Time `json:"last_updated"`
	Path        string    `json:"path"`
}

// BatchOperationResult 批量操作结果
type BatchOperationResult struct {
	ProjectID int    `json:"project_id"`
	TaskID    int    `json:"task_id"`
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
}

// ImportResult 导入结果
type ImportResult struct {
	FileName  string `json:"file_name"`
	ProjectID int    `json:"project_id"`
	TaskID    int    `json:"task_id"`
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
}

// ImportOptions 导入选项
type ImportOptions struct {
	OverwriteExisting bool              `json:"overwrite_existing,omitempty"`
	CreateProjects    bool              `json:"create_projects,omitempty"`
	CreateTasks       bool              `json:"create_tasks,omitempty"`
	Mapping           map[string]string `json:"mapping,omitempty"`
}

// ============================================================================
// Phase 3: 迁移自HybridDocumentHandler的请求结构
// ============================================================================

// CopyDocumentRequest 复制文档请求
type CopyDocumentRequest struct {
	DocumentID int `json:"document_id" validate:"required,min=1"`
	UserID     int `json:"user_id" validate:"required,min=1"`
}

// ToggleTemplateRequest 切换模板状态请求
type ToggleTemplateRequest struct {
	DocumentID int `json:"document_id" validate:"required,min=1"`
	UserID     int `json:"user_id" validate:"required,min=1"`
}
