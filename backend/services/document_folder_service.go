package services

import (
	"ai-project-backend/models"
	"fmt"

	"gorm.io/gorm"
)

// DocumentFolderService 文档文件夹服务
type DocumentFolderService struct {
	db *gorm.DB
}

// NewDocumentFolderService 创建新的文档文件夹服务
func NewDocumentFolderService(db *gorm.DB) *DocumentFolderService {
	return &DocumentFolderService{db: db}
}

// CreateFolder 创建文件夹
func (s *DocumentFolderService) CreateFolder(folder *models.DocumentFolder) error {
	return s.db.Create(folder).Error
}

// ListFolders 获取文件夹列表
func (s *DocumentFolderService) ListFolders() ([]*models.DocumentFolder, error) {
	var folders []*models.DocumentFolder
	err := s.db.Order("parent_id ASC, sort_order ASC, name ASC").Find(&folders).Error
	return folders, err
}

// GetFolderTree 获取文件夹树形结构
func (s *DocumentFolderService) GetFolderTree() (interface{}, error) {
	var folders []*models.DocumentFolder
	err := s.db.Order("parent_id ASC, sort_order ASC, name ASC").Find(&folders).Error
	if err != nil {
		return nil, err
	}

	// 构建树形结构
	folderMap := make(map[uint]*models.DocumentFolder)
	var rootFolders []*models.DocumentFolder

	// 先创建所有文件夹的映射
	for _, folder := range folders {
		folderMap[folder.ID] = folder
		// 初始化 Children 字段
		if folder.Children == nil {
			folder.Children = []*models.DocumentFolder{}
		}
	}

	// 构建父子关系
	for _, folder := range folders {
		if folder.ParentID == nil {
			rootFolders = append(rootFolders, folder)
		} else {
			if parent, ok := folderMap[*folder.ParentID]; ok {
				parent.Children = append(parent.Children, folder)
			}
		}
	}

	return rootFolders, nil
}
// GetFolder 获取单个文件夹
func (s *DocumentFolderService) GetFolder(id uint) (*models.DocumentFolder, error) {
	var folder models.DocumentFolder
	err := s.db.First(&folder, id).Error
	return &folder, err
}

// UpdateFolder 更新文件夹
func (s *DocumentFolderService) UpdateFolder(id uint, updates map[string]interface{}) (*models.DocumentFolder, error) {
	var folder models.DocumentFolder
	if err := s.db.First(&folder, id).Error; err != nil {
		return nil, err
	}

	if err := s.db.Model(&folder).Updates(updates).Error; err != nil {
		return nil, err
	}

	return &folder, nil
}

// DeleteFolder 删除文件夹
func (s *DocumentFolderService) DeleteFolder(id uint) error {
	// 检查是否有子文件夹
	var count int64
	s.db.Model(&models.DocumentFolder{}).Where("parent_id = ?", id).Count(&count)
	if count > 0 {
		return fmt.Errorf("cannot delete folder with subfolders")
	}

	// 检查是否有文档
	var docCount int64
	s.db.Model(&models.Document{}).Where("folder_id = ?", id).Count(&docCount)
	if docCount > 0 {
		return fmt.Errorf("cannot delete folder with documents")
	}

	return s.db.Delete(&models.DocumentFolder{}, id).Error
}

// MoveFolder 移动文件夹
func (s *DocumentFolderService) MoveFolder(id uint, newParentID *uint) error {
	// 检查是否形成循环
	if newParentID != nil && *newParentID == id {
		return fmt.Errorf("cannot move folder to itself")
	}

	// 如果有新的父文件夹，检查父文件夹是否存在
	if newParentID != nil {
		var count int64
		s.db.Model(&models.DocumentFolder{}).Where("id = ?", *newParentID).Count(&count)
		if count == 0 {
			return fmt.Errorf("parent folder not found")
		}

		// 检查是否形成循环（新父文件夹是否是当前文件夹的子文件夹）
		if s.isDescendant(id, *newParentID) {
			return fmt.Errorf("cannot move folder to its descendant")
		}
	}

	return s.db.Model(&models.DocumentFolder{}).Where("id = ?", id).Update("parent_id", newParentID).Error
}
// isDescendant 检查 childID 是否是 parentID 的后代
func (s *DocumentFolderService) isDescendant(parentID, childID uint) bool {
	var folder models.DocumentFolder
	if err := s.db.First(&folder, childID).Error; err != nil {
		return false
	}

	if folder.ParentID == nil {
		return false
	}

	if *folder.ParentID == parentID {
		return true
	}

	return s.isDescendant(parentID, *folder.ParentID)
}