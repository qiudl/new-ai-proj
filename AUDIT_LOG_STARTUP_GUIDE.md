# 🚀 审计日志查询界面启动指南

## 📋 系统要求

- **Node.js**: 16.0+ 
- **Go**: 1.19+
- **PostgreSQL**: 13+
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+

## 🔧 环境准备

### 1. 数据库准备

```bash
# 启动PostgreSQL (macOS)
brew services start postgresql

# 或者 (Linux)
sudo systemctl start postgresql

# 创建数据库
createdb ai_project_db

# 运行数据库迁移
psql -d ai_project_db -f migrations/002_add_middleware_tables.sql
```

### 2. 后端服务准备

```bash
# 进入后端目录
cd backend

# 安装Go依赖
go mod tidy

# 设置环境变量
export DATABASE_URL="postgres://username:password@localhost/ai_project_db?sslmode=disable"
export JWT_SECRET="your-secret-key"
export GIN_MODE="debug"

# 启动后端服务
go run main.go
```

### 3. 前端服务准备

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

## 🎭 演示数据生成

运行演示数据生成脚本：

```bash
# 给脚本执行权限
chmod +x generate-audit-demo-data.sh

# 运行脚本生成演示数据
./generate-audit-demo-data.sh
```

这将创建：
- ✅ 审计日志表结构
- ✅ 30天的历史数据（约1000条记录）
- ✅ 多种操作类型和用户
- ✅ 成功和失败状态的记录

## 🌐 访问系统

1. **前端界面**: http://localhost:3000
2. **后端API**: http://localhost:8080
3. **健康检查**: http://localhost:8080/health

### 导航路径
```
主页 → 系统管理 → 审计日志
```

## 🧪 功能测试

### 1. 基础功能测试

```bash
# 运行自动化测试
./test-audit-log-enhanced.sh
```

### 2. 手动功能验证

#### 📊 查询功能
- [ ] 基础列表显示
- [ ] 分页导航
- [ ] 排序功能
- [ ] 搜索功能

#### 🔍 筛选功能
- [ ] 操作类型筛选
- [ ] 实体类型筛选
- [ ] 时间范围筛选
- [ ] 用户筛选
- [ ] 状态筛选
- [ ] IP地址筛选
- [ ] 组合筛选

#### 📈 统计分析
- [ ] 总览统计卡片
- [ ] 操作类型分布图
- [ ] 时间趋势图
- [ ] 实体类型分布
- [ ] 活跃用户排行
- [ ] 峰值时间分析

#### 💾 数据导出
- [ ] CSV导出
- [ ] Excel导出
- [ ] 筛选条件导出

#### ⚡ 实时功能
- [ ] 自动刷新
- [ ] 实时统计更新
- [ ] 加载状态

## 🎯 使用场景演示

### 场景1：安全审计
```
目标：查找过去7天的所有失败登录尝试
操作：
1. 设置时间范围：最近7天
2. 选择操作类型：login
3. 选择状态：failed
4. 查看结果并导出
```

### 场景2：用户活动分析
```
目标：分析特定用户的操作历史
操作：
1. 在用户筛选中输入用户ID
2. 查看该用户的所有操作
3. 查看统计分析中的活跃度排行
4. 导出该用户的活动记录
```

### 场景3：系统监控
```
目标：监控当天的系统活动
操作：
1. 开启自动刷新
2. 设置时间范围：今天
3. 查看实时统计
4. 关注错误率指标
```

### 场景4：合规报告
```
目标：生成月度审计报告
操作：
1. 设置时间范围：上个月
2. 查看统计分析
3. 导出详细数据
4. 生成报告文档
```

## 🛠️ 故障排除

### 常见问题

#### 1. 前端无法启动
```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install

# 检查端口占用
lsof -i :3000
```

#### 2. 后端连接失败
```bash
# 检查数据库连接
psql -d ai_project_db -c "SELECT 1;"

# 检查环境变量
echo $DATABASE_URL

# 查看后端日志
go run main.go
```

#### 3. API返回空数据
```bash
# 检查数据是否存在
psql -d ai_project_db -c "SELECT COUNT(*) FROM audit_logs;"

# 重新生成演示数据
./generate-audit-demo-data.sh
```

#### 4. 图表不显示
```bash
# 检查前端依赖
npm list recharts dayjs

# 重新安装图表库
npm install recharts@latest
```

### 日志位置
- **前端日志**: 浏览器开发者工具 Console
- **后端日志**: 终端输出
- **数据库日志**: PostgreSQL日志文件

## 📊 性能基准

### 预期性能指标
- **页面加载**: < 2秒
- **查询响应**: < 500ms
- **图表渲染**: < 300ms
- **导出处理**: < 3秒（1000条记录）

### 性能测试
```bash
# 测试API响应时间
time curl -s "http://localhost:8080/api/v1/system/audit/logs?page=1&page_size=100"

# 测试并发请求
for i in {1..10}; do
  curl -s "http://localhost:8080/api/v1/system/audit/logs" &
done
wait
```

## 🔐 安全注意事项

### 生产环境配置
1. **环境变量**：设置安全的JWT密钥
2. **数据库**：使用SSL连接
3. **HTTPS**：启用HTTPS访问
4. **权限**：配置适当的用户权限
5. **审计**：启用数据库审计日志

### 数据保护
- 敏感字段自动屏蔽
- SQL注入防护
- XSS攻击防护
- CSRF保护

## 📞 技术支持

如遇到问题，请检查：
1. 📋 **系统要求**是否满足
2. 🔧 **环境配置**是否正确  
3. 🎭 **演示数据**是否已生成
4. 🧪 **测试脚本**是否通过

---

## 🎉 开始使用

现在你可以开始体验功能强大的审计日志查询界面了！

```bash
# 一键启动完整系统
./generate-audit-demo-data.sh  # 生成数据
cd backend && go run main.go & # 启动后端
cd frontend && npm start       # 启动前端
```

享受使用体验！ 🚀
