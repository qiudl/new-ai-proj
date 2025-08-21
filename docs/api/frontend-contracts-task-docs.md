# 前端文档：任务文档 API 契约（统一版）

本文档说明统一后的任务文档 API 返回结构，便于前端调用与解析。

1) 是否存在任务文档（has）
- 路径：GET /api/v1/projects/:id/tasks/:taskId/documents/has
- 响应：
{
  "success": true,
  "data": {
    "has_document": boolean
  }
}

2) 列出任务文档（list）
- 路径：GET /api/v1/projects/:id/tasks/:taskId/documents/list
- 响应：
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": number,
        "title": string,
        "type": string,
        "status": string,
        "visibility": string,
        "version": number,
        "updated_at": string | null
      }
    ],
    "total": number
  }
}

注意
- 两个接口数据源均为数据库（Repository 查询），与 /documents 列表保持一致性。
- 旧的文件系统 GET 接口（/projects/:id/tasks/:taskId/document）已返回 410 Gone，请迁移至上述接口。

