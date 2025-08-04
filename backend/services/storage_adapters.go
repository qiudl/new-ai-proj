package services

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// StorageAdapter interface defines storage operations
type StorageAdapter interface {
	Store(ctx context.Context, path string, reader io.Reader) error
	Retrieve(ctx context.Context, path string) (io.ReadCloser, error)
	Delete(ctx context.Context, path string) error
	Exists(ctx context.Context, path string) (bool, error)
	GetURL(ctx context.Context, path string) (string, error)
	ListFiles(ctx context.Context, prefix string) ([]string, error)
	GetFileInfo(ctx context.Context, path string) (*FileInfo, error)
}

// FileInfo represents metadata about a stored file
type FileInfo struct {
	Path         string `json:"path"`
	Size         int64  `json:"size"`
	LastModified int64  `json:"last_modified"`
	ContentType  string `json:"content_type"`
	ETag         string `json:"etag"`
}

// LocalStorageAdapter implements local file system storage
type LocalStorageAdapter struct {
	basePath string
	baseURL  string
}

// NewLocalStorageAdapter creates a new local storage adapter
func NewLocalStorageAdapter(basePath, baseURL string) *LocalStorageAdapter {
	return &LocalStorageAdapter{
		basePath: basePath,
		baseURL:  baseURL,
	}
}

// Store saves a file to local storage
func (l *LocalStorageAdapter) Store(ctx context.Context, path string, reader io.Reader) error {
	fullPath := filepath.Join(l.basePath, path)
	
	// Create directory if it doesn't exist
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", dir, err)
	}
	
	// Create the file
	file, err := os.Create(fullPath)
	if err != nil {
		return fmt.Errorf("failed to create file %s: %w", fullPath, err)
	}
	defer file.Close()
	
	// Copy content
	_, err = io.Copy(file, reader)
	if err != nil {
		return fmt.Errorf("failed to write file content: %w", err)
	}
	
	return nil
}

// Retrieve reads a file from local storage
func (l *LocalStorageAdapter) Retrieve(ctx context.Context, path string) (io.ReadCloser, error) {
	fullPath := filepath.Join(l.basePath, path)
	
	file, err := os.Open(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("file not found: %s", path)
		}
		return nil, fmt.Errorf("failed to open file %s: %w", fullPath, err)
	}
	
	return file, nil
}

// Delete removes a file from local storage
func (l *LocalStorageAdapter) Delete(ctx context.Context, path string) error {
	fullPath := filepath.Join(l.basePath, path)
	
	err := os.Remove(fullPath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete file %s: %w", fullPath, err)
	}
	
	return nil
}

// Exists checks if a file exists in local storage
func (l *LocalStorageAdapter) Exists(ctx context.Context, path string) (bool, error) {
	fullPath := filepath.Join(l.basePath, path)
	
	_, err := os.Stat(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check file existence: %w", err)
	}
	
	return true, nil
}

// GetURL returns a URL for accessing the file
func (l *LocalStorageAdapter) GetURL(ctx context.Context, path string) (string, error) {
	// For local storage, construct a URL based on the base URL
	if l.baseURL == "" {
		return "", fmt.Errorf("base URL not configured for local storage")
	}
	
	// Clean path and ensure it doesn't start with /
	cleanPath := strings.TrimPrefix(filepath.ToSlash(path), "/")
	url := strings.TrimSuffix(l.baseURL, "/") + "/" + cleanPath
	
	return url, nil
}

// ListFiles lists files with a given prefix
func (l *LocalStorageAdapter) ListFiles(ctx context.Context, prefix string) ([]string, error) {
	fullPrefix := filepath.Join(l.basePath, prefix)
	var files []string
	
	err := filepath.Walk(fullPrefix, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		if !info.IsDir() {
			// Convert back to relative path
			relPath, err := filepath.Rel(l.basePath, path)
			if err != nil {
				return err
			}
			files = append(files, filepath.ToSlash(relPath))
		}
		
		return nil
	})
	
	if err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("failed to list files: %w", err)
	}
	
	return files, nil
}

// GetFileInfo returns metadata about a file
func (l *LocalStorageAdapter) GetFileInfo(ctx context.Context, path string) (*FileInfo, error) {
	fullPath := filepath.Join(l.basePath, path)
	
	stat, err := os.Stat(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("file not found: %s", path)
		}
		return nil, fmt.Errorf("failed to get file info: %w", err)
	}
	
	// Determine content type based on extension
	contentType := l.getContentType(path)
	
	return &FileInfo{
		Path:         path,
		Size:         stat.Size(),
		LastModified: stat.ModTime().Unix(),
		ContentType:  contentType,
		ETag:         fmt.Sprintf("%d-%d", stat.Size(), stat.ModTime().Unix()),
	}, nil
}

// getContentType determines content type based on file extension
func (l *LocalStorageAdapter) getContentType(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	
	switch ext {
	case ".md", ".markdown":
		return "text/markdown"
	case ".pdf":
		return "application/pdf"
	case ".txt":
		return "text/plain"
	case ".html", ".htm":
		return "text/html"
	case ".json":
		return "application/json"
	case ".xml":
		return "application/xml"
	case ".csv":
		return "text/csv"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".svg":
		return "image/svg+xml"
	case ".webp":
		return "image/webp"
	case ".mp4":
		return "video/mp4"
	case ".mp3":
		return "audio/mpeg"
	case ".zip":
		return "application/zip"
	case ".tar":
		return "application/x-tar"
	case ".gz":
		return "application/gzip"
	default:
		return "application/octet-stream"
	}
}

// S3StorageAdapter implements AWS S3 storage (placeholder for future implementation)
type S3StorageAdapter struct {
	bucket    string
	region    string
	accessKey string
	secretKey string
	endpoint  string
}

// NewS3StorageAdapter creates a new S3 storage adapter
func NewS3StorageAdapter(bucket, region, accessKey, secretKey, endpoint string) *S3StorageAdapter {
	return &S3StorageAdapter{
		bucket:    bucket,
		region:    region,
		accessKey: accessKey,
		secretKey: secretKey,
		endpoint:  endpoint,
	}
}

// Store saves a file to S3 (placeholder implementation)
func (s *S3StorageAdapter) Store(ctx context.Context, path string, reader io.Reader) error {
	// TODO: Implement S3 upload using AWS SDK
	return fmt.Errorf("S3 storage not implemented yet")
}

// Retrieve reads a file from S3 (placeholder implementation)
func (s *S3StorageAdapter) Retrieve(ctx context.Context, path string) (io.ReadCloser, error) {
	// TODO: Implement S3 download using AWS SDK
	return nil, fmt.Errorf("S3 storage not implemented yet")
}

// Delete removes a file from S3 (placeholder implementation)
func (s *S3StorageAdapter) Delete(ctx context.Context, path string) error {
	// TODO: Implement S3 delete using AWS SDK
	return fmt.Errorf("S3 storage not implemented yet")
}

// Exists checks if a file exists in S3 (placeholder implementation)
func (s *S3StorageAdapter) Exists(ctx context.Context, path string) (bool, error) {
	// TODO: Implement S3 head object using AWS SDK
	return false, fmt.Errorf("S3 storage not implemented yet")
}

// GetURL returns a URL for accessing the file from S3 (placeholder implementation)
func (s *S3StorageAdapter) GetURL(ctx context.Context, path string) (string, error) {
	// TODO: Generate presigned URL using AWS SDK
	return "", fmt.Errorf("S3 storage not implemented yet")
}

// ListFiles lists files with a given prefix in S3 (placeholder implementation)
func (s *S3StorageAdapter) ListFiles(ctx context.Context, prefix string) ([]string, error) {
	// TODO: Implement S3 list objects using AWS SDK
	return nil, fmt.Errorf("S3 storage not implemented yet")
}

// GetFileInfo returns metadata about a file in S3 (placeholder implementation)
func (s *S3StorageAdapter) GetFileInfo(ctx context.Context, path string) (*FileInfo, error) {
	// TODO: Implement S3 head object using AWS SDK
	return nil, fmt.Errorf("S3 storage not implemented yet")
}

// AzureStorageAdapter implements Azure Blob Storage (placeholder for future implementation)
type AzureStorageAdapter struct {
	accountName   string
	accountKey    string
	containerName string
	endpoint      string
}

// NewAzureStorageAdapter creates a new Azure storage adapter
func NewAzureStorageAdapter(accountName, accountKey, containerName, endpoint string) *AzureStorageAdapter {
	return &AzureStorageAdapter{
		accountName:   accountName,
		accountKey:    accountKey,
		containerName: containerName,
		endpoint:      endpoint,
	}
}

// Store saves a file to Azure Blob Storage (placeholder implementation)
func (a *AzureStorageAdapter) Store(ctx context.Context, path string, reader io.Reader) error {
	// TODO: Implement Azure Blob Storage upload
	return fmt.Errorf("Azure storage not implemented yet")
}

// Retrieve reads a file from Azure Blob Storage (placeholder implementation)
func (a *AzureStorageAdapter) Retrieve(ctx context.Context, path string) (io.ReadCloser, error) {
	// TODO: Implement Azure Blob Storage download
	return nil, fmt.Errorf("Azure storage not implemented yet")
}

// Delete removes a file from Azure Blob Storage (placeholder implementation)
func (a *AzureStorageAdapter) Delete(ctx context.Context, path string) error {
	// TODO: Implement Azure Blob Storage delete
	return fmt.Errorf("Azure storage not implemented yet")
}

// Exists checks if a file exists in Azure Blob Storage (placeholder implementation)
func (a *AzureStorageAdapter) Exists(ctx context.Context, path string) (bool, error) {
	// TODO: Implement Azure Blob Storage head blob
	return false, fmt.Errorf("Azure storage not implemented yet")
}

// GetURL returns a URL for accessing the file from Azure Blob Storage (placeholder implementation)
func (a *AzureStorageAdapter) GetURL(ctx context.Context, path string) (string, error) {
	// TODO: Generate SAS URL for Azure Blob Storage
	return "", fmt.Errorf("Azure storage not implemented yet")
}

// ListFiles lists files with a given prefix in Azure Blob Storage (placeholder implementation)
func (a *AzureStorageAdapter) ListFiles(ctx context.Context, prefix string) ([]string, error) {
	// TODO: Implement Azure Blob Storage list blobs
	return nil, fmt.Errorf("Azure storage not implemented yet")
}

// GetFileInfo returns metadata about a file in Azure Blob Storage (placeholder implementation)
func (a *AzureStorageAdapter) GetFileInfo(ctx context.Context, path string) (*FileInfo, error) {
	// TODO: Implement Azure Blob Storage get blob properties
	return nil, fmt.Errorf("Azure storage not implemented yet")
}

// StorageFactory creates storage adapters based on configuration
type StorageFactory struct{}

// NewStorageFactory creates a new storage factory
func NewStorageFactory() *StorageFactory {
	return &StorageFactory{}
}

// CreateAdapter creates a storage adapter based on the given type and configuration
func (f *StorageFactory) CreateAdapter(adapterType string, config map[string]string) (StorageAdapter, error) {
	switch strings.ToLower(adapterType) {
	case "local":
		basePath := config["base_path"]
		baseURL := config["base_url"]
		if basePath == "" {
			return nil, fmt.Errorf("base_path is required for local storage")
		}
		return NewLocalStorageAdapter(basePath, baseURL), nil
		
	case "s3":
		bucket := config["bucket"]
		region := config["region"]
		accessKey := config["access_key"]
		secretKey := config["secret_key"]
		endpoint := config["endpoint"]
		
		if bucket == "" || region == "" || accessKey == "" || secretKey == "" {
			return nil, fmt.Errorf("bucket, region, access_key, and secret_key are required for S3 storage")
		}
		return NewS3StorageAdapter(bucket, region, accessKey, secretKey, endpoint), nil
		
	case "azure":
		accountName := config["account_name"]
		accountKey := config["account_key"]
		containerName := config["container_name"]
		endpoint := config["endpoint"]
		
		if accountName == "" || accountKey == "" || containerName == "" {
			return nil, fmt.Errorf("account_name, account_key, and container_name are required for Azure storage")
		}
		return NewAzureStorageAdapter(accountName, accountKey, containerName, endpoint), nil
		
	default:
		return nil, fmt.Errorf("unsupported storage adapter type: %s", adapterType)
	}
}