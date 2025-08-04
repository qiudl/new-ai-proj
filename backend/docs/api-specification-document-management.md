# API接口规范设计文档 - 任务文档管理系统
## 任务307-03: API接口规范设计

### 📋 设计概述
为AI项目管理平台设计完整的RESTful API接口规范，支持任务文档的手工上传、接口上传、版本管理和多格式下载功能。

### 🎯 设计目标
1. **RESTful设计**: 遵循REST架构风格的API设计
2. **统一标准**: 统一的请求响应格式和数据结构
3. **错误处理**: 完善的错误码体系和错误信息
4. **版本控制**: 可扩展的API版本管理机制
5. **文档完备**: 详细的API文档和使用示例

### 🌐 API基础信息

#### 基础URL
```
生产环境: https://api.aiproject.com/v1
开发环境: http://localhost:8080/api/v1
测试环境: https://test-api.aiproject.com/v1
```

#### 版本控制
- **版本策略**: URL路径版本控制 (`/v1`, `/v2`)
- **当前版本**: v1
- **向后兼容**: 保持至少2个大版本的向后兼容

#### 认证方式
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
Accept: application/json
```

### 📊 统一响应格式

#### 成功响应格式
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {
    // 具体数据内容
  },
  "timestamp": "2025-08-04T12:35:00Z",
  "request_id": "req_1234567890"
}
```

#### 错误响应格式
```json
{
  "success": false,
  "code": 400,
  "error": "VALIDATION_ERROR",
  "message": "请求参数验证失败",
  "details": {
    "field": "file",
    "reason": "文件大小超过限制"
  },
  "timestamp": "2025-08-04T12:35:00Z",
  "request_id": "req_1234567890"
}
```

#### 分页响应格式
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  },
  "timestamp": "2025-08-04T12:35:00Z",
  "request_id": "req_1234567890"
}
```

### 📁 文档管理API端点

#### 1. 文档上传接口

##### 手工上传 (Multipart Form)
```http
POST /projects/{project_id}/tasks/{task_id}/documents/upload

Content-Type: multipart/form-data
Authorization: Bearer <token>

参数:
- file: 文件内容 (必需)
- title: 文档标题 (可选)
- description: 文档描述 (可选)
- type: 文档类型 [markdown, pdf, text] (可选，默认根据文件扩展名推断)
- visibility: 可见性 [private, team, public] (可选，默认为team)
```

**请求示例:**
```bash
curl -X POST \
  "http://localhost:8080/api/v1/projects/1/tasks/123/documents/upload" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@document.md" \
  -F "title=任务需求文档" \
  -F "description=详细的任务需求规格说明" \
  -F "type=markdown" \
  -F "visibility=team"
```

**响应示例:**
```json
{
  "success": true,
  "code": 201,
  "message": "文档上传成功",
  "data": {
    "document_id": 456,
    "title": "任务需求文档",
    "file_name": "document.md",
    "file_size": 2048,
    "file_type": "markdown",
    "checksum": "a1b2c3d4e5f6...",
    "version": 1,
    "storage_path": "/projects/1/tasks/123/current/document.md",
    "uploaded_by": 1,
    "uploaded_at": "2025-08-04T12:35:00Z",
    "metadata": {
      "original_name": "document.md",
      "mime_type": "text/markdown",
      "encoding": "utf-8"
    }
  }
}
```

##### API上传 (JSON)
```http
POST /projects/{project_id}/tasks/{task_id}/documents

Content-Type: application/json
Authorization: Bearer <token>

请求体:
{
  "title": "文档标题",
  "content": "文档内容(base64编码或直接文本)",
  "type": "markdown",
  "description": "文档描述",
  "visibility": "team",
  "encoding": "utf-8"
}
```

**请求示例:**
```json
{
  "title": "API设计文档",
  "content": "IyBBUEneuetvqnlh5L2t6K6h...", // base64编码的内容
  "type": "markdown",
  "description": "详细的API接口设计文档",
  "visibility": "team",
  "encoding": "utf-8"
}
```

#### 2. 文档下载接口

##### 获取文档内容
```http
GET /projects/{project_id}/tasks/{task_id}/documents/{document_id}

参数:
- format: 下载格式 [md, pdf, html] (可选，默认为原格式)
- version: 版本号 (可选，默认为最新版本)
- download: 是否作为附件下载 [true, false] (可选，默认false)
```

**请求示例:**
```bash
# 获取文档内容(在线预览)
GET /projects/1/tasks/123/documents/456?format=md

# 下载文档文件
GET /projects/1/tasks/123/documents/456?format=pdf&download=true

# 获取指定版本
GET /projects/1/tasks/123/documents/456?version=2&format=md
```

**响应示例(在线预览):**
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "document_id": 456,
    "title": "任务需求文档",
    "content": "# 任务需求文档\n\n这是详细的需求说明...",
    "format": "markdown",
    "version": 1,
    "file_size": 2048,
    "checksum": "a1b2c3d4e5f6...",
    "created_at": "2025-08-04T12:35:00Z",
    "updated_at": "2025-08-04T12:35:00Z"
  }
}
```

**响应示例(文件下载):**
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="task-123-document.pdf"
Content-Length: 51200

%PDF-1.4 binary content...
```

#### 3. 文档管理接口

##### 获取任务文档列表
```http
GET /projects/{project_id}/tasks/{task_id}/documents

参数:
- page: 页码 (可选，默认1)
- page_size: 每页大小 (可选，默认20)
- type: 文档类型过滤 (可选)
- visibility: 可见性过滤 (可选)
- created_after: 创建时间过滤 (可选)
- created_before: 创建时间过滤 (可选)
```

**响应示例:**
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "document_id": 456,
        "title": "任务需求文档",
        "file_name": "document.md",
        "file_type": "markdown",
        "file_size": 2048,
        "version": 1,
        "visibility": "team",
        "uploaded_by": 1,
        "uploaded_at": "2025-08-04T12:35:00Z",
        "updated_at": "2025-08-04T12:35:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

##### 更新文档信息
```http
PUT /projects/{project_id}/tasks/{task_id}/documents/{document_id}

请求体:
{
  "title": "更新后的标题",
  "description": "更新后的描述",
  "visibility": "public",
  "content": "更新后的内容" // 可选，更新内容会创建新版本
}
```

##### 删除文档
```http
DELETE /projects/{project_id}/tasks/{task_id}/documents/{document_id}

参数:
- permanent: 是否永久删除 [true, false] (可选，默认false为软删除)
```

#### 4. 文档版本管理接口

##### 获取文档版本历史
```http
GET /projects/{project_id}/tasks/{task_id}/documents/{document_id}/versions

参数:
- page: 页码 (可选，默认1)
- page_size: 每页大小 (可选，默认10)
```

**响应示例:**
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "version": 2,
        "title": "任务需求文档 v2",
        "file_size": 2560,
        "checksum": "b2c3d4e5f6g7...",
        "changes_summary": "添加了新的需求条目",
        "created_by": 1,
        "created_at": "2025-08-04T13:00:00Z"
      },
      {
        "version": 1,
        "title": "任务需求文档",
        "file_size": 2048,
        "checksum": "a1b2c3d4e5f6...",
        "changes_summary": "初始版本",
        "created_by": 1,
        "created_at": "2025-08-04T12:35:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 2,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

##### 版本对比
```http
GET /projects/{project_id}/tasks/{task_id}/documents/{document_id}/versions/compare

参数:
- from_version: 源版本号 (必需)
- to_version: 目标版本号 (必需)
- format: 对比格式 [unified, side_by_side] (可选，默认unified)
```

##### 版本回滚
```http
POST /projects/{project_id}/tasks/{task_id}/documents/{document_id}/versions/{version}/restore

请求体:
{
  "reason": "回滚原因说明"
}
```

### 📊 批量操作接口

#### 批量上传文档
```http
POST /projects/{project_id}/tasks/{task_id}/documents/batch

Content-Type: multipart/form-data
Authorization: Bearer <token>

参数:
- files[]: 多个文件 (必需)
- metadata: 批量元数据JSON (可选)
```

#### 批量下载文档
```http
POST /projects/{project_id}/tasks/{task_id}/documents/export

请求体:
{
  "document_ids": [456, 789, 012],
  "format": "zip",
  "include_versions": false
}
```

**响应:** 返回ZIP文件下载链接或直接返回ZIP文件流

### 🔍 搜索和查询接口

#### 文档搜索
```http
GET /documents/search

参数:
- q: 搜索关键词 (必需)
- project_id: 项目ID过滤 (可选)
- task_id: 任务ID过滤 (可选)
- type: 文档类型过滤 (可选)
- page: 页码 (可选，默认1)
- page_size: 每页大小 (可选，默认20)
```

#### 高级搜索
```http
POST /documents/search/advanced

请求体:
{
  "keywords": ["API", "设计"],
  "title": "包含标题关键词",
  "content": "包含内容关键词",
  "file_type": ["markdown", "pdf"],
  "date_range": {
    "start": "2025-08-01T00:00:00Z",
    "end": "2025-08-31T23:59:59Z"
  },
  "size_range": {
    "min": 1024,
    "max": 102400
  },
  "uploaded_by": [1, 2, 3]
}
```

### ❌ 错误处理规范

#### 标准错误码定义

| 错误码 | HTTP状态码 | 错误类型 | 描述 |
|-------|-----------|---------|------|
| 400001 | 400 | INVALID_REQUEST | 请求参数格式错误 |
| 400002 | 400 | VALIDATION_ERROR | 请求参数验证失败 |
| 400003 | 400 | FILE_TOO_LARGE | 文件大小超过限制 |
| 400004 | 400 | UNSUPPORTED_FORMAT | 不支持的文件格式 |
| 401001 | 401 | UNAUTHORIZED | 未提供认证信息 |
| 401002 | 401 | TOKEN_EXPIRED | 认证令牌已过期 |
| 401003 | 401 | INVALID_TOKEN | 无效的认证令牌 |
| 403001 | 403 | PERMISSION_DENIED | 权限不足，无法访问资源 |
| 403002 | 403 | RESOURCE_FORBIDDEN | 资源访问被禁止 |
| 404001 | 404 | RESOURCE_NOT_FOUND | 请求的资源不存在 |
| 404002 | 404 | DOCUMENT_NOT_FOUND | 文档不存在 |
| 404003 | 404 | VERSION_NOT_FOUND | 文档版本不存在 |
| 409001 | 409 | RESOURCE_CONFLICT | 资源冲突 |
| 409002 | 409 | VERSION_CONFLICT | 版本冲突 |
| 422001 | 422 | PROCESSING_ERROR | 文件处理失败 |
| 422002 | 422 | CONVERSION_ERROR | 格式转换失败 |
| 429001 | 429 | RATE_LIMIT_EXCEEDED | 请求频率超过限制 |
| 500001 | 500 | INTERNAL_ERROR | 服务器内部错误 |
| 500002 | 500 | DATABASE_ERROR | 数据库操作错误 |
| 500003 | 500 | STORAGE_ERROR | 存储系统错误 |
| 503001 | 503 | SERVICE_UNAVAILABLE | 服务暂时不可用 |

#### 详细错误响应示例

##### 文件验证错误
```json
{
  "success": false,
  "code": 400003,
  "error": "FILE_TOO_LARGE",
  "message": "文件大小超过限制",
  "details": {
    "max_size": "100MB",
    "current_size": "150MB",
    "field": "file"
  },
  "timestamp": "2025-08-04T12:35:00Z",
  "request_id": "req_1234567890"
}
```

##### 权限错误
```json
{
  "success": false,
  "code": 403001,
  "error": "PERMISSION_DENIED",
  "message": "权限不足，无法访问资源",
  "details": {
    "required_permission": "document:write",
    "user_permissions": ["document:read"],
    "resource": "/projects/1/tasks/123/documents"
  },
  "timestamp": "2025-08-04T12:35:00Z",
  "request_id": "req_1234567890"
}
```

##### 资源不存在错误
```json
{
  "success": false,
  "code": 404002,
  "error": "DOCUMENT_NOT_FOUND",
  "message": "文档不存在",
  "details": {
    "document_id": 999,
    "project_id": 1,
    "task_id": 123
  },
  "timestamp": "2025-08-04T12:35:00Z",
  "request_id": "req_1234567890"
}
```

### 📄 请求验证规范

#### 文件上传验证
```javascript
const uploadValidation = {
  file: {
    required: true,
    maxSize: '100MB',
    allowedTypes: ['.md', '.pdf', '.txt', '.docx', '.jpg', '.png'],
    mimeTypes: [
      'text/markdown',
      'application/pdf', 
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ]
  },
  title: {
    required: false,
    maxLength: 255,
    pattern: '^[\\w\\s\\-_.,!?()\\[\\]{}]+$'
  },
  description: {
    required: false,
    maxLength: 1000
  },
  type: {
    required: false,
    enum: ['markdown', 'pdf', 'text', 'docx', 'image']
  },
  visibility: {
    required: false,
    enum: ['private', 'team', 'public'],
    default: 'team'
  }
};
```

#### JSON请求验证
```javascript
const jsonDocumentValidation = {
  title: {
    required: true,
    type: 'string',
    maxLength: 255,
    minLength: 1
  },
  content: {
    required: true,
    type: 'string',
    maxLength: 10485760 // 10MB
  },
  type: {
    required: true,
    enum: ['markdown', 'pdf', 'text', 'html']
  },
  description: {
    required: false,
    type: 'string',
    maxLength: 1000
  },
  visibility: {
    required: false,
    enum: ['private', 'team', 'public'],
    default: 'team'
  },
  encoding: {
    required: false,
    enum: ['utf-8', 'base64'],
    default: 'utf-8'
  }
};
```

### 🔒 安全规范

#### 认证要求
- **JWT Token**: 所有API请求必须包含有效的JWT令牌
- **Token过期**: 默认24小时过期，可配置
- **刷新机制**: 提供Token刷新端点

#### 权限控制
```javascript
const permissions = {
  'document:read': '读取文档',
  'document:write': '创建和修改文档',
  'document:delete': '删除文档',
  'document:manage': '管理文档版本',
  'document:export': '导出文档',
  'document:admin': '文档管理员权限'
};
```

#### 文件安全
- **病毒扫描**: 上传文件自动病毒扫描
- **文件类型验证**: 基于MIME类型和文件头验证
- **内容过滤**: 敏感内容检测和过滤
- **存储加密**: 文件存储使用AES-256加密

### 📈 性能规范

#### 请求限制
```javascript
const rateLimits = {
  upload: {
    requests: 100,
    window: '1hour',
    message: '上传频率超过限制'
  },
  download: {
    requests: 1000,
    window: '1hour',
    message: '下载频率超过限制'
  },
  search: {
    requests: 500,
    window: '1hour',
    message: '搜索频率超过限制'
  }
};
```

#### 响应时间要求
- **文档列表**: < 200ms
- **文档上传**: < 5s (100MB以内)
- **文档下载**: < 2s (10MB以内)
- **文档搜索**: < 500ms
- **格式转换**: < 30s

#### 缓存策略
```javascript
const cacheStrategy = {
  documentList: {
    ttl: 300, // 5分钟
    key: 'docs:list:{project_id}:{task_id}'
  },
  documentContent: {
    ttl: 3600, // 1小时
    key: 'docs:content:{document_id}:{version}'
  },
  searchResults: {
    ttl: 900, // 15分钟
    key: 'docs:search:{query_hash}'
  }
};
```

### 📖 OpenAPI规范

#### Swagger配置
```yaml
openapi: 3.0.3
info:
  title: AI项目管理平台 - 文档管理API
  description: 任务文档管理系统的RESTful API接口规范
  version: 1.0.0
  contact:
    name: API支持团队
    email: api-support@aiproject.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.aiproject.com/v1
    description: 生产环境
  - url: http://localhost:8080/api/v1
    description: 开发环境

security:
  - BearerAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    Document:
      type: object
      required:
        - document_id
        - title
        - file_type
      properties:
        document_id:
          type: integer
          description: 文档唯一ID
          example: 456
        title:
          type: string
          description: 文档标题
          maxLength: 255
          example: "任务需求文档"
        file_name:
          type: string
          description: 文件名
          example: "document.md"
        file_type:
          type: string
          enum: [markdown, pdf, text, docx, image]
          description: 文件类型
          example: "markdown"
        file_size:
          type: integer
          description: 文件大小(字节)
          example: 2048
        version:
          type: integer
          description: 当前版本号
          example: 1
        checksum:
          type: string
          description: 文件SHA256校验和
          example: "a1b2c3d4e5f6..."
        visibility:
          type: string
          enum: [private, team, public]
          description: 可见性
          example: "team"
        uploaded_by:
          type: integer
          description: 上传者用户ID
          example: 1
        uploaded_at:
          type: string
          format: date-time
          description: 上传时间
          example: "2025-08-04T12:35:00Z"
        updated_at:
          type: string
          format: date-time
          description: 更新时间
          example: "2025-08-04T12:35:00Z"
```

### 🧪 API测试示例

#### 使用curl测试
```bash
# 1. 获取认证令牌
TOKEN=$(curl -s -X POST "http://localhost:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | \
  jq -r '.data.token')

# 2. 上传文档
curl -X POST "http://localhost:8080/api/v1/projects/1/tasks/123/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-document.md" \
  -F "title=测试文档" \
  -F "description=这是一个测试文档"

# 3. 获取文档列表
curl -X GET "http://localhost:8080/api/v1/projects/1/tasks/123/documents" \
  -H "Authorization: Bearer $TOKEN"

# 4. 下载文档
curl -X GET "http://localhost:8080/api/v1/projects/1/tasks/123/documents/456?download=true" \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded-document.md
```

#### 使用JavaScript测试
```javascript
// API测试类
class DocumentAPITester {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }
  
  async uploadDocument(projectId, taskId, file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });
    
    const response = await fetch(
      `${this.baseURL}/projects/${projectId}/tasks/${taskId}/documents/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      }
    );
    
    return response.json();
  }
  
  async getDocuments(projectId, taskId, params = {}) {
    const url = new URL(`${this.baseURL}/projects/${projectId}/tasks/${taskId}/documents`);
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.json();
  }
}

// 使用示例
const tester = new DocumentAPITester('http://localhost:8080/api/v1', 'your-jwt-token');

// 测试上传
tester.uploadDocument(1, 123, file, {
  title: '测试文档',
  description: '这是一个测试文档',
  visibility: 'team'
}).then(result => {
  console.log('上传结果:', result);
});
```

### ✅ API验收标准

#### 功能验收
- ✅ 支持多种文件格式上传(MD、PDF、TXT、DOCX、图片)
- ✅ 支持文件大小限制和类型验证
- ✅ 支持多种下载格式(原格式、PDF转换)
- ✅ 支持文档版本管理和历史记录
- ✅ 支持批量操作和文档搜索
- ✅ 完整的错误处理和状态码

#### 性能验收
- ✅ 上传响应时间 < 5秒(100MB内文件)
- ✅ 下载响应时间 < 2秒(10MB内文件)
- ✅ 列表查询响应时间 < 200毫秒
- ✅ 搜索响应时间 < 500毫秒
- ✅ 并发支持 > 100请求/秒

#### 安全验收
- ✅ JWT认证机制完整
- ✅ 权限控制粒度合理
- ✅ 文件类型严格验证
- ✅ 防止文件路径遍历攻击
- ✅ API请求频率限制

#### 文档验收
- ✅ OpenAPI规范完整
- ✅ 接口文档详细准确
- ✅ 错误码定义完备
- ✅ 示例代码可用
- ✅ 测试用例覆盖全面

---

**本API接口规范为任务307文档管理系统提供了完整的技术接口标准，支持后续的开发实施和系统集成。**