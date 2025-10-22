# 使用curl保存分析报告到工作笔记

## 方法一：使用脚本（推荐）

```bash
# 启动后端服务后，直接运行脚本
./scripts/save-analysis-to-work-notes.sh
```

## 方法二：手动执行curl命令

### 1. 获取认证token

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/dev-quick-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}' | jq -r '.data.access_token')

echo "Token: $TOKEN"
```

### 2. 创建工作笔记

```bash
# 读取文件内容
CONTENT=$(cat docs/work-notes-crud-analysis.md)

# 使用jq构造JSON请求体
PAYLOAD=$(jq -n \
  --arg title "工作笔记模块CRUD功能检查报告" \
  --arg content "$CONTENT" \
  --arg desc "全面检查工作笔记模块的CRUD功能实现，发现17个问题并制定4阶段改进方案" \
  '{
    title: $title,
    content: $content,
    work_note_type: "log",
    priority: "high",
    description: $desc,
    tags: ["CRUD检查", "工作笔记", "技术分析", "改进方案"],
    visibility: "team",
    is_pinned: true,
    is_bookmarked: true
  }')

# 发送创建请求
curl -X POST http://localhost:8080/api/v1/work-notes \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" | jq '.'
```

### 3. 查看创建的工作笔记

```bash
# 假设返回的笔记ID是 123
NOTE_ID=123

curl -X GET "http://localhost:8080/api/v1/work-notes/${NOTE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
```

## 方法三：使用一行命令

```bash
curl -X POST http://localhost:8080/api/v1/work-notes \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:8080/api/v1/auth/dev-quick-login -H 'Content-Type: application/json' -d '{"username":"admin"}' | jq -r '.data.access_token')" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg title '工作笔记模块CRUD功能检查报告' --arg content "$(cat docs/work-notes-crud-analysis.md)" --arg desc '全面检查工作笔记模块的CRUD功能实现' '{title: $title, content: $content, work_note_type: "log", priority: "high", description: $desc, tags: ["CRUD检查","工作笔记","技术分析"], visibility: "team", is_pinned: true}')" | jq '.'
```

## 测试API可用性

```bash
# 检查后端服务是否运行
curl -s http://localhost:8080/health || echo "后端服务未运行"

# 检查工作笔记列表API
curl -s -X GET http://localhost:8080/api/v1/work-notes \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data.notes | length'
```

## 响应示例

成功创建后的响应：

```json
{
  "success": true,
  "message": "Work note created successfully",
  "data": {
    "id": 123,
    "title": "工作笔记模块CRUD功能检查报告",
    "content": "# 工作笔记模块CRUD功能检查报告\n\n...",
    "work_note_type": "log",
    "priority": "high",
    "is_pinned": true,
    "is_bookmarked": true,
    "tags": ["CRUD检查", "工作笔记", "技术分析", "改进方案"],
    "visibility": "team",
    "owner_id": 1,
    "created_at": "2025-10-22T12:00:00Z",
    "updated_at": "2025-10-22T12:00:00Z"
  }
}
```

## 故障排查

### 无法连接到后端

```bash
# 检查后端进程
ps aux | grep -E "go|backend" | grep -v grep

# 检查端口是否监听
netstat -tuln | grep 8080

# 启动后端服务（根据项目启动方式）
cd backend && go run main.go
# 或
make run-backend
```

### Token获取失败

```bash
# 检查认证端点
curl -v http://localhost:8080/api/v1/auth/dev-quick-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}'
```

### JSON格式错误

确保使用jq构造JSON以正确处理特殊字符：
```bash
# ✅ 正确：使用jq
PAYLOAD=$(jq -n --arg content "$(cat file.md)" '{content: $content}')

# ❌ 错误：直接拼接字符串
PAYLOAD='{"content": "'$(cat file.md)'"}'  # 会有转义问题
```
