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
	DeleteDocument(ctx context.Context, req *DeleteDocumentRequest) error
	
	// 高级功能
	GetDocumentHistory(ctx context.Context, req *HistoryRequest) ([]GitCommit, error)
	ArchiveDocument(ctx context.Context, req *ArchiveRequest) error
	MigrateDocument(ctx context.Context, req *MigrateRequest) error
	
	// 健康检查
	HealthCheck(ctx context.Context) error
}

// 请求结构定义

// CreateDocumentRequest 创建文档请求
type CreateDocumentRequest struct {
	ProjectID   int    `json:"project_id" validate:"required,min=1"`
	TaskID      int    `json:"task_id" validate:"required,min=1"`
	Content     string `json:"content" validate:"required"`
	Format      string `json:"format" validate:"oneof=markdown text"`
	UserID      int    `json:"user_id" validate:"required,min=1"`
	TemplateID  string `json:"template_id,omitempty"`
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

// DeleteDocumentRequest 删除文档请求
type DeleteDocumentRequest struct {
	ProjectID int `json:"project_id" validate:"required,min=1"`
	TaskID    int `json:"task_id" validate:"required,min=1"`
	UserID    int `json:"user_id" validate:"required,min=1"`
	Reason    string `json:"reason,omitempty"`
}

// HistoryRequest 历史记录请求
type HistoryRequest struct {
	ProjectID int    `json:"project_id" validate:"required,min=1"`
	TaskID    int    `json:"task_id" validate:"required,min=1"`
	UserID    int    `json:"user_id" validate:"required,min=1"`
	Limit     int    `json:"limit,omitempty" validate:"min=1,max=100"`
	Offset    int    `json:"offset,omitempty" validate:"min=0"`
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
	Hash      string    `json:"hash"`
	Author    string    `json:"author"`
	Date      time.Time `json:"date"`
	Message   string    `json:"message"`
	Changes   int       `json:"changes,omitempty"`
}

// DocumentError 文档错误
type DocumentError struct {
	Code     string    `json:"code"`
	Message  string    `json:"message"`
	Details  string    `json:"details,omitempty"`
	Severity string    `json:"severity"` // error, warning, info
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