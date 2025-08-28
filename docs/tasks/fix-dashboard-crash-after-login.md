# 修复登录后Dashboard闪退问题

## 任务信息
- **任务标题**: 修复登录后Dashboard闪退问题
- **问题类型**: Bug修复
- **优先级**: 高
- **预估工时**: 2-3小时（AI效率）
- **项目路径**: /Users/johnqiu/coding/www/projects/new-ai-proj

## 问题描述
用户登录成功后，进入Dashboard页面时发生闪退现象。经测试，admin和guoym2两个账号都出现相同问题。

### 问题特征
- **影响账号**: admin, guoym2  
- **触发时机**: 登录成功后进入Dashboard
- **表现**: 页面闪退
- **环境**: 开发环境

## 可能原因分析

### 前端问题
1. **路由配置问题**
   - Dashboard路由配置错误
   - 权限验证失败导致重定向循环
   - 路由守卫逻辑异常

2. **状态管理问题**
   - 用户状态初始化失败
   - Token验证异常
   - 全局状态污染

3. **组件渲染问题**
   - Dashboard组件内部异常
   - 依赖数据加载失败
   - 生命周期钩子错误

### 后端问题
1. **API接口问题**
   - 用户信息接口异常
   - 权限验证接口错误
   - 数据格式不匹配

2. **认证授权问题**
   - JWT Token过期或无效
   - 用户权限验证失败
   - 会话管理异常

## 调试步骤

### 1. 检查前端控制台错误
```bash
# 打开浏览器开发者工具
# 1. 查看Console面板的错误信息
# 2. 检查Network面板的API请求
# 3. 查看Application面板的localStorage/sessionStorage
```

### 2. 分析服务日志
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj

# 查看前端构建日志
docker-compose -f docker-compose.dev.yml logs frontend

# 查看后端API日志
docker-compose -f docker-compose.dev.yml logs backend

# 实时监控日志
docker-compose -f docker-compose.dev.yml logs -f
```

### 3. 重启服务（按您的要求）
```bash
# 用docker-compose.dev.yml重启前后端服务
docker-compose -f docker-compose.dev.yml restart frontend backend

# 或者完全重建
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

## 修复方案

### 方案1: 路由问题修复
1. 检查Dashboard路由配置
2. 验证路由守卫逻辑
3. 确保权限验证正确

### 方案2: 状态管理修复
1. 检查用户状态初始化
2. 验证Token存储和读取
3. 修复状态同步问题

### 方案3: 组件异常修复
1. 检查Dashboard组件渲染逻辑
2. 添加错误边界处理
3. 优化数据加载流程

## 调试命令序列

### 检查服务状态
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj
docker-compose -f docker-compose.dev.yml ps
```

### 查看实时日志
```bash
# 同时查看前后端日志
docker-compose -f docker-compose.dev.yml logs -f frontend backend

# 只查看错误日志
docker-compose -f docker-compose.dev.yml logs | grep -i error
```

## 技术要点

### 前端检查重点
- **路由配置**: 检查Dashboard路由是否正确配置
- **权限验证**: 验证用户权限检查逻辑
- **API调用**: 确认Dashboard初始化时的API请求
- **状态管理**: 检查用户登录状态的维护

### 后端检查重点
- **认证中间件**: 验证JWT token处理
- **权限API**: 检查权限验证接口
- **用户API**: 确认用户信息获取接口
- **数据库连接**: 验证数据查询是否正常

## 测试计划

### 功能测试
1. 使用admin账号测试登录流程
2. 使用guoym2账号测试登录流程
3. 验证Dashboard页面正常显示

### 回归测试
1. 测试其他功能模块是否受影响
2. 验证登出功能正常
3. 检查页面刷新后的状态保持

## 验收标准
- [ ] admin账号登录后能正常进入Dashboard
- [ ] guoym2账号登录后能正常进入Dashboard  
- [ ] Dashboard页面功能正常
- [ ] 无控制台错误信息
- [ ] 页面刷新后状态保持正常

## API路径信息
- **API路径**: /api/v1
- **MCP桥路径**: mcp-task-bridge

## 备注
- 这是用户体验关键问题，需要优先处理
- 影响用户正常使用系统的核心功能
- 修复完成后需要用docker-compose.dev.yml重启前后端服务进行验证
- 重点关注两个特定账号（admin, guoym2）的行为差异

## 下一步操作
1. 首先检查浏览器控制台的错误信息
2. 分析前后端日志文件
3. 定位具体的错误原因
4. 实施相应的修复方案
5. 进行完整的测试验证