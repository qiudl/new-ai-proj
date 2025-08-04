# 文件存储架构设计文档
## 任务307-02: 文件存储架构设计

### 📋 设计概述
为AI项目管理平台设计完整的文件存储架构，支持任务文档的手工上传、API上传、版本管理和多格式下载功能。

### 🎯 设计目标
1. **可扩展性**: 支持大量文件存储和高并发访问
2. **性能优化**: 快速文件检索和高效存储空间利用
3. **数据安全**: 完整的备份机制和数据完整性保障
4. **易维护性**: 清晰的目录结构和标准化的命名规范
5. **多格式支持**: Markdown、PDF等多种文件格式的统一管理

### 🏗️ 存储架构层次设计

#### 根目录结构
```
project-documents/
├── projects/              # 项目级别存储
│   ├── project-{id}/      # 按项目ID分组
│   │   ├── tasks/         # 任务文档存储
│   │   ├── shared/        # 项目共享文档
│   │   └── archive/       # 项目归档文档
├── users/                 # 用户级别存储
│   ├── user-{id}/         # 按用户ID分组
│   │   ├── personal/      # 个人文档
│   │   ├── drafts/        # 草稿文档
│   │   └── templates/     # 个人模板
├── system/                # 系统级别存储
│   ├── templates/         # 系统模板
│   ├── backups/           # 备份文件
│   └── logs/              # 系统日志
└── temp/                  # 临时文件存储
    ├── uploads/           # 上传中的文件
    ├── conversions/       # 格式转换中间文件
    └── cache/             # 缓存文件
```

#### 项目任务文档目录详细结构
```
projects/project-{projectId}/tasks/
├── task-{taskId}/
│   ├── current/           # 当前版本文档
│   │   ├── document.md    # 主文档（Markdown格式）
│   │   ├── document.pdf   # PDF版本
│   │   └── metadata.json  # 文档元数据
│   ├── versions/          # 历史版本
│   │   ├── v1/
│   │   │   ├── document.md
│   │   │   ├── document.pdf
│   │   │   └── metadata.json
│   │   ├── v2/
│   │   └── v{n}/
│   ├── attachments/       # 附件文件
│   │   ├── images/
│   │   ├── documents/
│   │   └── others/
│   └── temp/              # 临时文件
│       ├── drafts/
│       └── processing/
```

### 📝 文件命名规范

#### 主文档命名规范
- **格式**: `{type}_{timestamp}_{version}.{ext}`
- **示例**: 
  - `document_20250804_v001.md`
  - `specification_20250804_v002.pdf`
  - `requirements_20250804_v001.docx`

#### 版本文件命名规范
- **格式**: `{originalName}_{versionNumber}_{checksum}.{ext}`
- **示例**:
  - `document_v001_abc123ef.md`
  - `document_v002_def456gh.pdf`

#### 附件文件命名规范
- **格式**: `{category}_{filename}_{timestamp}.{ext}`
- **示例**:
  - `image_screenshot_20250804_123045.png`
  - `doc_reference_20250804_123045.pdf`

### 🔧 路径生成算法

#### 核心路径生成函数
```javascript
class FileStoragePathGenerator {
    constructor(config = {}) {
        this.baseDir = config.baseDir || '/var/app/storage';
        this.enableHashing = config.enableHashing || true;
        this.hashDepth = config.hashDepth || 2;
    }

    // 生成任务文档存储路径
    generateTaskDocumentPath(projectId, taskId, documentType = 'current') {
        const projectPath = `projects/project-${projectId}`;
        const taskPath = `tasks/task-${taskId}`;
        
        if (this.enableHashing) {
            const hashPrefix = this.generateHashPrefix(taskId);
            return `${this.baseDir}/${projectPath}/${hashPrefix}/${taskPath}/${documentType}`;
        }
        
        return `${this.baseDir}/${projectPath}/${taskPath}/${documentType}`;
    }

    // 生成版本文档路径
    generateVersionPath(projectId, taskId, version) {
        const basePath = this.generateTaskDocumentPath(projectId, taskId, 'versions');
        return `${basePath}/v${String(version).padStart(3, '0')}`;
    }

    // 生成临时文件路径
    generateTempPath(category = 'uploads') {
        const timestamp = new Date().toISOString().slice(0, 10);
        return `${this.baseDir}/temp/${category}/${timestamp}`;
    }

    // 生成哈希前缀（用于分散存储）
    generateHashPrefix(id) {
        const hash = this.calculateHash(id.toString());
        const levels = [];
        
        for (let i = 0; i < this.hashDepth; i++) {
            levels.push(hash.slice(i * 2, (i + 1) * 2));
        }
        
        return levels.join('/');
    }

    // 计算文件哈希
    calculateHash(input) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(input).digest('hex');
    }

    // 生成唯一文件名
    generateUniqueFileName(originalName, extension) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const baseName = originalName.replace(/[^a-zA-Z0-9\-_]/g, '_');
        
        return `${baseName}_${timestamp}_${random}.${extension}`;
    }

    // 确保目录存在
    async ensureDirectoryExists(path) {
        const fs = require('fs').promises;
        try {
            await fs.mkdir(path, { recursive: true });
            return true;
        } catch (error) {
            console.error('创建目录失败:', error);
            return false;
        }
    }
}
```

### 📊 存储性能优化策略

#### 目录分散策略
- **哈希分布**: 使用MD5哈希前2位创建子目录，避免单目录文件过多
- **时间分片**: 按年月分组存储，便于归档和清理
- **类型分离**: 不同文件类型存储在不同目录，优化访问性能

#### 缓存策略
```javascript
const StorageCacheConfig = {
    // 文件内容缓存
    contentCache: {
        maxSize: '512MB',
        ttl: 3600, // 1小时
        strategy: 'LRU'
    },
    
    // 元数据缓存
    metadataCache: {
        maxSize: '64MB', 
        ttl: 1800, // 30分钟
        strategy: 'LRU'
    },
    
    // 路径缓存
    pathCache: {
        maxSize: '32MB',
        ttl: 7200, // 2小时
        strategy: 'LRU'
    }
};
```

### 🔒 数据安全和备份策略

#### 文件完整性验证
- **校验和**: 每个文件存储时计算MD5/SHA256校验和
- **定期验证**: 定时任务验证文件完整性
- **损坏恢复**: 自动从备份恢复损坏文件

#### 备份策略
```javascript
const BackupStrategy = {
    // 增量备份
    incremental: {
        frequency: 'daily',
        retention: '30 days',
        compression: true
    },
    
    // 完整备份
    full: {
        frequency: 'weekly',
        retention: '12 weeks',
        compression: true,
        encryption: true
    },
    
    // 远程备份
    remote: {
        frequency: 'daily',
        provider: 's3', // 或其他云存储
        encryption: true,
        retention: '1 year'
    }
};
```

### 🌐 多存储后端支持

#### 存储适配器接口
```javascript
class StorageAdapter {
    async store(path, content, options = {}) {
        throw new Error('Must implement store method');
    }

    async retrieve(path) {
        throw new Error('Must implement retrieve method');
    }

    async delete(path) {
        throw new Error('Must implement delete method');
    }

    async exists(path) {
        throw new Error('Must implement exists method');
    }

    async getMetadata(path) {
        throw new Error('Must implement getMetadata method');
    }
}

// 本地存储适配器
class LocalStorageAdapter extends StorageAdapter {
    // 实现本地文件系统存储
}

// S3存储适配器
class S3StorageAdapter extends StorageAdapter {
    // 实现AWS S3存储
}

// Azure存储适配器
class AzureStorageAdapter extends StorageAdapter {
    // 实现Azure Blob存储
}
```

### 📈 容量管理和监控

#### 存储配额管理
```javascript
const StorageQuotas = {
    // 项目级配额
    project: {
        maxSize: '10GB',
        maxFiles: 10000,
        warning: '8GB' // 80%预警
    },
    
    // 用户级配额
    user: {
        maxSize: '1GB',
        maxFiles: 1000,
        warning: '800MB'
    },
    
    // 单文件限制
    file: {
        maxSize: '100MB',
        allowedTypes: ['.md', '.pdf', '.txt', '.docx', '.jpg', '.png']
    }
};
```

#### 监控指标
```javascript
const MonitoringMetrics = {
    storage: {
        totalUsed: 'bytes',
        totalAvailable: 'bytes', 
        usagePercentage: 'percentage',
        filesCount: 'number'
    },
    
    performance: {
        uploadSpeed: 'mbps',
        downloadSpeed: 'mbps',
        averageLatency: 'ms',
        errorRate: 'percentage'
    },
    
    operations: {
        uploadsPerHour: 'number',
        downloadsPerHour: 'number',
        deletionsPerHour: 'number',
        failuresPerHour: 'number'
    }
};
```

### 🔄 文件迁移和版本升级

#### 迁移策略
```javascript
const MigrationPlan = {
    // 版本升级迁移
    versionUpgrade: {
        strategy: 'gradual', // 渐进式迁移
        batchSize: 1000,
        validation: true,
        rollback: true
    },
    
    // 存储后端迁移
    backendMigration: {
        strategy: 'dual-write', // 双写策略
        verification: 'checksum',
        cutoverPlan: 'blue-green'
    }
};
```

### 📋 配置管理

#### 环境配置
```javascript
// config/storage.js
module.exports = {
    development: {
        adapter: 'local',
        baseDir: './storage/dev',
        enableHashing: false,
        backup: false
    },
    
    production: {
        adapter: 's3',
        baseDir: 's3://ai-project-docs',
        enableHashing: true,
        backup: true,
        compression: true,
        encryption: true
    },
    
    test: {
        adapter: 'memory',
        cleanup: true
    }
};
```

### ✅ 设计验证清单
- ✅ 可扩展的目录结构设计
- ✅ 标准化的文件命名规范
- ✅ 高效的路径生成算法
- ✅ 完善的性能优化策略
- ✅ 可靠的数据安全机制
- ✅ 灵活的多后端支持
- ✅ 完整的监控和管理功能
- ✅ 详细的迁移和升级方案

### 🚀 实施建议
1. **第一阶段**: 实现基础的本地存储架构
2. **第二阶段**: 添加缓存和性能优化
3. **第三阶段**: 集成云存储后端支持
4. **第四阶段**: 完善监控和管理功能

### 💻 具体实现代码示例

#### 完整的文件管理器类
```javascript
// backend/services/FileManager.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class DocumentFileManager {
    constructor(config = {}) {
        this.pathGenerator = new FileStoragePathGenerator(config);
        this.adapter = this.initializeAdapter(config.adapter || 'local');
    }
    
    initializeAdapter(adapterType) {
        switch (adapterType) {
            case 'local':
                return new LocalStorageAdapter();
            case 's3':
                return new S3StorageAdapter();
            case 'azure':
                return new AzureStorageAdapter();
            default:
                throw new Error(`Unsupported adapter: ${adapterType}`);
        }
    }
    
    // 存储任务文档
    async storeTaskDocument(projectId, taskId, content, format = 'md', metadata = {}) {
        try {
            const documentPath = this.pathGenerator.generateTaskDocumentPath(projectId, taskId);
            const fileName = `document.${format}`;
            const fullPath = path.join(documentPath, fileName);
            
            // 确保目录存在
            await this.pathGenerator.ensureDirectoryExists(documentPath);
            
            // 生成文件元数据
            const fileMetadata = {
                ...metadata,
                checksum: this.calculateChecksum(content),
                createdAt: new Date().toISOString(),
                format: format,
                size: Buffer.byteLength(content, 'utf8')
            };
            
            // 存储文件和元数据
            await this.adapter.store(fullPath, content);
            await this.adapter.store(
                path.join(documentPath, 'metadata.json'), 
                JSON.stringify(fileMetadata, null, 2)
            );
            
            return {
                success: true,
                path: fullPath,
                metadata: fileMetadata
            };
            
        } catch (error) {
            console.error('存储文档失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 检索任务文档
    async retrieveTaskDocument(projectId, taskId, format = 'md') {
        try {
            const documentPath = this.pathGenerator.generateTaskDocumentPath(projectId, taskId);
            const fileName = `document.${format}`;
            const fullPath = path.join(documentPath, fileName);
            
            const content = await this.adapter.retrieve(fullPath);
            const metadataPath = path.join(documentPath, 'metadata.json');
            
            let metadata = {};
            try {
                const metadataContent = await this.adapter.retrieve(metadataPath);
                metadata = JSON.parse(metadataContent);
            } catch (metaError) {
                console.warn('无法读取元数据:', metaError.message);
            }
            
            return {
                success: true,
                content,
                metadata,
                path: fullPath
            };
            
        } catch (error) {
            console.error('检索文档失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 创建文档版本
    async createDocumentVersion(projectId, taskId, content, format = 'md', versionNumber) {
        try {
            const versionPath = this.pathGenerator.generateVersionPath(projectId, taskId, versionNumber);
            const fileName = `document.${format}`;
            const fullPath = path.join(versionPath, fileName);
            
            await this.pathGenerator.ensureDirectoryExists(versionPath);
            
            const versionMetadata = {
                version: versionNumber,
                checksum: this.calculateChecksum(content),
                createdAt: new Date().toISOString(),
                format: format,
                size: Buffer.byteLength(content, 'utf8')
            };
            
            await this.adapter.store(fullPath, content);
            await this.adapter.store(
                path.join(versionPath, 'metadata.json'),
                JSON.stringify(versionMetadata, null, 2)
            );
            
            return {
                success: true,
                version: versionNumber,
                path: fullPath,
                metadata: versionMetadata
            };
            
        } catch (error) {
            console.error('创建文档版本失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 文档格式转换
    async convertDocumentFormat(sourceContent, fromFormat, toFormat) {
        // 这里实现Markdown到PDF等格式转换
        // 可以集成pandoc或其他转换工具
        switch (`${fromFormat}->${toFormat}`) {
            case 'md->pdf':
                return await this.convertMarkdownToPdf(sourceContent);
            case 'md->html':
                return await this.convertMarkdownToHtml(sourceContent);
            default:
                throw new Error(`不支持的格式转换: ${fromFormat} -> ${toFormat}`);
        }
    }
    
    calculateChecksum(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
}
```

#### 本地存储适配器实现
```javascript
// backend/adapters/LocalStorageAdapter.js
class LocalStorageAdapter extends StorageAdapter {
    async store(filePath, content, options = {}) {
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content, 'utf8');
            return { success: true, path: filePath };
        } catch (error) {
            throw new Error(`本地存储失败: ${error.message}`);
        }
    }
    
    async retrieve(filePath) {
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            throw new Error(`文件读取失败: ${error.message}`);
        }
    }
    
    async delete(filePath) {
        try {
            await fs.unlink(filePath);
            return { success: true };
        } catch (error) {
            throw new Error(`文件删除失败: ${error.message}`);
        }
    }
    
    async exists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    async getMetadata(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            throw new Error(`获取文件元数据失败: ${error.message}`);
        }
    }
}
```

#### 文件上传处理器
```javascript
// backend/handlers/DocumentUploadHandler.js
const multer = require('multer');
const DocumentFileManager = require('../services/FileManager');

class DocumentUploadHandler {
    constructor() {
        this.fileManager = new DocumentFileManager();
        this.upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 100 * 1024 * 1024, // 100MB
                files: 10
            },
            fileFilter: this.fileFilter.bind(this)
        });
    }
    
    fileFilter(req, file, cb) {
        const allowedTypes = ['.md', '.pdf', '.txt', '.docx', '.jpg', '.png'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error(`不支持的文件类型: ${fileExt}`), false);
        }
    }
    
    // 处理任务文档上传
    async handleTaskDocumentUpload(req, res) {
        try {
            const { projectId, taskId } = req.params;
            const { file } = req;
            
            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: '未提供文件'
                });
            }
            
            const content = file.buffer.toString('utf8');
            const format = path.extname(file.originalname).substring(1);
            
            const result = await this.fileManager.storeTaskDocument(
                projectId, 
                taskId, 
                content, 
                format,
                {
                    originalName: file.originalname,
                    uploadedBy: req.user.id,
                    uploadedAt: new Date().toISOString()
                }
            );
            
            if (result.success) {
                res.json({
                    success: true,
                    message: '文档上传成功',
                    data: {
                        path: result.path,
                        metadata: result.metadata
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }
            
        } catch (error) {
            console.error('文档上传处理失败:', error);
            res.status(500).json({
                success: false,
                error: '文档上传处理失败'
            });
        }
    }
    
    // 处理文档下载
    async handleDocumentDownload(req, res) {
        try {
            const { projectId, taskId } = req.params;
            const { format = 'md' } = req.query;
            
            const result = await this.fileManager.retrieveTaskDocument(
                projectId, 
                taskId, 
                format
            );
            
            if (result.success) {
                const fileName = `task-${taskId}-document.${format}`;
                
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                res.setHeader('Content-Type', this.getContentType(format));
                
                res.send(result.content);
            } else {
                res.status(404).json({
                    success: false,
                    error: '文档未找到'
                });
            }
            
        } catch (error) {
            console.error('文档下载处理失败:', error);
            res.status(500).json({
                success: false,
                error: '文档下载处理失败'
            });
        }
    }
    
    getContentType(format) {
        const contentTypes = {
            'md': 'text/markdown',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        return contentTypes[format] || 'application/octet-stream';
    }
}

module.exports = DocumentUploadHandler;
```

### 🔗 API路由集成
```javascript
// backend/routes/documents.js
const express = require('express');
const DocumentUploadHandler = require('../handlers/DocumentUploadHandler');

const router = express.Router();
const uploadHandler = new DocumentUploadHandler();

// 上传任务文档
router.post('/projects/:projectId/tasks/:taskId/documents', 
    uploadHandler.upload.single('document'),
    uploadHandler.handleTaskDocumentUpload.bind(uploadHandler)
);

// 下载任务文档
router.get('/projects/:projectId/tasks/:taskId/documents/download',
    uploadHandler.handleDocumentDownload.bind(uploadHandler)
);

// 获取文档元数据
router.get('/projects/:projectId/tasks/:taskId/documents/metadata',
    async (req, res) => {
        // 实现文档元数据获取逻辑
    }
);

module.exports = router;
```

此架构设计为任务307的文档管理系统提供了坚实的存储基础，支持未来的功能扩展和性能优化需求。