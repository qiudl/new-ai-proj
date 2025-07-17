# React Frontend - AI Project Management Platform

基于React 18 + TypeScript + Ant Design开发的前端应用，提供项目管理、任务管理和AI驱动的批量导入功能。

## 🚀 快速开始

### 本地开发

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### Docker开发

```bash
# 构建开发镜像
docker build --target development -t ai-project-frontend:dev .

# 运行开发容器
docker run -p 3000:3000 ai-project-frontend:dev
```

### 使用Docker Compose

```bash
# 从项目根目录运行
docker-compose up -d frontend
```

## 🏗️ 多阶段构建

### 构建目标

1. **base** - 基础依赖层
2. **development** - 开发环境 (带热重载)
3. **builder** - 构建阶段
4. **production** - 生产环境 (Nginx静态服务)
5. **testing** - 测试环境

### 构建命令

```bash
# 开发环境
docker build --target development -t ai-project-frontend:dev .

# 生产环境
docker build --target production -t ai-project-frontend:prod .

# 测试环境
docker build --target testing -t ai-project-frontend:test .
```

## 📁 项目结构

```
frontend/
├── public/                 # 静态资源
│   ├── index.html          # HTML模板
│   └── manifest.json       # PWA配置
├── src/                    # 源代码
│   ├── components/         # 可复用组件
│   │   ├── Layout.tsx      # 页面布局
│   │   └── PrivateRoute.tsx # 路由守卫
│   ├── pages/              # 页面组件
│   │   ├── LoginPage.tsx   # 登录页
│   │   ├── DashboardPage.tsx # 工作台
│   │   ├── ProjectsPage.tsx # 项目列表
│   │   ├── TasksPage.tsx   # 任务列表
│   │   └── BulkImportPage.tsx # 批量导入
│   ├── App.tsx             # 根组件
│   ├── App.css             # 全局样式
│   ├── index.tsx           # 入口文件
│   └── index.css           # 基础样式
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript配置
├── Dockerfile.dev          # 多阶段Docker文件
├── nginx.conf              # Nginx配置
├── .dockerignore           # Docker忽略文件
└── README.md               # 项目文档
```

## 🔧 技术栈

### 核心技术

- **React 18** - 前端框架
- **TypeScript** - 类型安全
- **Ant Design** - UI组件库
- **React Router** - 路由管理
- **Axios** - HTTP客户端

### 开发工具

- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Jest** - 单元测试
- **React Testing Library** - 组件测试

## 🎨 主要功能

### 用户认证

- 登录/登出功能
- 路由守卫保护
- Token管理

### 项目管理

- 项目列表展示
- 项目创建/编辑/删除
- 项目状态管理

### 任务管理

- 任务列表展示
- 任务状态筛选
- 任务CRUD操作
- 自定义字段支持

### 批量导入

- JSON数据解析
- 任务预览确认
- 批量导入功能
- 导入进度反馈

### 响应式设计

- 移动端适配
- 平板端适配
- 桌面端优化

## 🚀 开发流程

### 启动开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 在浏览器中打开 http://localhost:3000
```

### 代码检查

```bash
# ESLint检查
npm run lint

# 修复可自动修复的问题
npm run lint:fix

# 代码格式化
npm run format

# TypeScript类型检查
npm run type-check
```

### 测试

```bash
# 运行测试
npm test

# 运行测试（CI模式）
npm run test:ci

# 生成测试覆盖率报告
npm run test:coverage
```

### 构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 🎯 环境变量

### 开发环境

```bash
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_ENV=development
GENERATE_SOURCEMAP=true
CHOKIDAR_USEPOLLING=true
```

### 生产环境

```bash
REACT_APP_API_URL=https://api.example.com/api
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
```

## 📊 页面路由

| 路由 | 组件 | 描述 |
|------|------|------|
| `/login` | LoginPage | 登录页面 |
| `/` | DashboardPage | 工作台首页 |
| `/projects` | ProjectsPage | 项目列表 |
| `/projects/:id/tasks` | TasksPage | 任务列表 |
| `/projects/:id/bulk-import` | BulkImportPage | 批量导入 |

## 🔐 认证机制

### Token管理

- 使用localStorage存储JWT token
- 自动在请求头中添加Authorization
- Token过期自动跳转登录

### 路由守卫

```typescript
// PrivateRoute组件保护需要认证的路由
const PrivateRoute: React.FC<Props> = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};
```

## 🎨 UI/UX设计

### 设计原则

- 简洁直观的界面
- 一致的交互体验
- 响应式设计
- 无障碍访问

### 主题配置

```typescript
// 使用Ant Design的主题配置
<ConfigProvider locale={zhCN}>
  <App />
</ConfigProvider>
```

### 样式管理

- 全局样式：`index.css`
- 组件样式：`App.css`
- 工具类：CSS类名
- 响应式：媒体查询

## 🧪 测试策略

### 单元测试

```bash
# 运行单元测试
npm test

# 监听模式
npm test -- --watch

# 覆盖率报告
npm test -- --coverage
```

### 集成测试

```bash
# 运行集成测试
npm run test:integration

# E2E测试
npm run test:e2e
```

## 📱 移动端适配

### 响应式断点

- 手机端：< 768px
- 平板端：768px - 1024px
- 桌面端：> 1024px

### 适配特性

- 弹性布局
- 触摸友好
- 简化操作
- 优化加载

## 🚀 部署

### 生产环境构建

```bash
# 构建生产版本
npm run build

# 使用Docker构建
docker build --target production -t ai-project-frontend:prod .
```

### 静态文件服务

```bash
# 使用Nginx服务静态文件
docker run -p 3000:3000 ai-project-frontend:prod
```

## 🔍 性能优化

### 构建优化

- 代码分割
- 懒加载
- 树摇优化
- 资源压缩

### 运行时优化

- 组件懒加载
- 图片优化
- 缓存策略
- 预加载

## 📚 开发规范

### 代码风格

- 使用TypeScript严格模式
- 遵循ESLint规则
- 统一代码格式化
- 组件命名规范

### 提交规范

```bash
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具变动
```

## 🛠️ 故障排除

### 常见问题

1. **热重载不工作**
   - 设置 `CHOKIDAR_USEPOLLING=true`
   - 检查文件监听权限

2. **构建失败**
   - 检查TypeScript类型错误
   - 确认依赖版本兼容

3. **样式问题**
   - 检查CSS类名冲突
   - 确认Ant Design版本

### 调试技巧

```bash
# 查看构建详情
npm run build -- --verbose

# 分析包大小
npm run analyze

# 检查依赖问题
npm ls
```

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 编写测试
4. 提交代码
5. 创建Pull Request

## 📄 许可证

本项目采用MIT许可证。