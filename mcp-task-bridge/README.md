# AI项目 MCP 桥接服务配置

## 环境配置

### 稳定环境（默认）
- API基础路径: `http://localhost:8080/api/v1`
- 用于日常任务管理操作
- 端口: 8080（后端）, 3000（前端）

### 开发环境
- API基础路径: `http://localhost:8090/api/v1`
- 用于测试新功能
- 端口: 8090（后端）, 3001（前端）

## 环境切换

在 `mcp-task-bridge/config.js` 中修改：

```javascript
// 稳定环境（默认）
export const API_BASE = 'http://localhost:8080/api/v1';

// 开发环境（测试时切换）
// export const API_BASE = 'http://localhost:8090/api/v1';
```

## 使用建议

1. **日常使用**: 始终使用稳定环境（8080端口）
2. **开发测试**: 切换到开发环境（8090端口）
3. **功能验证**: 在开发环境测试通过后，再部署到稳定环境

## 快速命令

```bash
# 查看环境状态
./env-manager.sh status

# 启动稳定环境
./env-manager.sh start-stable

# 启动开发环境
./env-manager.sh start-dev

# 备份稳定环境
./env-manager.sh backup
```
