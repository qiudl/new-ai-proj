package migrations

import (
	"ai-project-backend/models"
	"gorm.io/gorm"
)

// CreateDocumentFoldersTable 创建文档文件夹表
func CreateDocumentFoldersTable(db *gorm.DB) error {
	// 自动迁移文档文件夹表
	err := db.AutoMigrate(&models.DocumentFolder{})
	if err != nil {
		return err
	}

	// 确保FolderID字段存在于documents表中
	if !db.Migrator().HasColumn(&models.Document{}, "folder_id") {
		err = db.Migrator().AddColumn(&models.Document{}, "folder_id")
		if err != nil {
			return err
		}
	}

	// 添加索引
	db.Exec("CREATE INDEX IF NOT EXISTS idx_document_folders_parent_id ON document_folders(parent_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_document_folders_created_by ON document_folders(created_by)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id)")

	return nil
}
