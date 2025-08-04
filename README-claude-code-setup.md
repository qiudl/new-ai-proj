# Claude Code 连接 AI项目管理平台 配置指南

## 🎯 概述

本指南将帮助您配置Claude Code连接到AI项目管理平台，实现自然语言驱动的任务管理。

## 📋 配置信息总结

### 1. 服务器地址
```
http://localhost:8080/api/v1
```

### 2. 认证信息
- **用户名**: `admin`
- **密码**: `password123`
- **当前Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ5MjA1NTUsIm5iZiI6MTc1NDMxNTc1NSwiaWF0IjoxNzU0MzE1NzU1fQ.YOuMu0ugHYwDeq2uVKNf0A9LJVrmFknfR3kN38vloew`

### 3. MCP服务器配置文件路径
```
/Users/johnqiu/coding/www/projects/new-ai-proj/claude-code-config.json
```

## 🔧 配置步骤

### 步骤1: 确保AI项目管理平台运行
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj
docker-compose up -d
```

### 步骤2: 配置Claude Code

#### 方式1: 项目目录配置（推荐）
将配置文件放在项目根目录，Claude Code会自动检测：
```bash
# 配置文件已存在于:
/Users/johnqiu/coding/www/projects/new-ai-proj/claude-code-config.json
```

#### 方式2: 全局配置
```bash
mkdir -p ~/.claude-code
cp /Users/johnqiu/coding/www/projects/new-ai-proj/claude-code-config.json ~/.claude-code/config.json
```

### 步骤3: 启动MCP服务器
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj
node mcp-claude-code-bridge.js
```

## 🚀 使用方法

配置完成后，您可以在Claude Code中使用以下自然语言指令：

### 基础任务管理
```bash
# 创建任务
"创建任务：实现用户登录功能"

# 查看任务列表
"看看我的任务列表"
"显示项目1的所有任务"

# 任务状态管理
"开始执行任务1"
"完成任务1"

# 子任务管理
"为任务1创建子任务：前端登录表单"
"为登录功能创建3个子任务：前端表单、后端API、数据库设计"
```

### 高级功能
```bash
# 任务搜索
"搜索包含'登录'的任务"

# 批量操作
"批量完成所有测试任务"

# 项目管理
"切换到项目2"
"查看项目进度"
```

## 🔑 Token管理

### 获取新Token
Token有效期7天，过期后需要重新获取：

```bash
# 方式1: 使用脚本
cd /Users/johnqiu/coding/www/projects/new-ai-proj
./get-auth-token.sh

# 方式2: 手动获取
curl -X POST "http://localhost:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

### 更新Token到配置文件
```bash
# 编辑配置文件
nano /Users/johnqiu/coding/www/projects/new-ai-proj/claude-code-config.json

# 更新 AUTH_TOKEN 字段为新token
```

## 🔧 故障排除

### 1. 连接问题
```bash
# 检查AI项目管理平台状态
curl -I http://localhost:8080/health

# 检查Docker容器状态
docker-compose ps
```

### 2. 认证问题
```bash
# 测试登录
curl -X POST "http://localhost:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

### 3. MCP服务器问题
```bash
# 检查依赖
cd /Users/johnqiu/coding/www/projects/new-ai-proj
npm list

# 重新安装依赖
npm install

# 测试MCP服务器
node mcp-claude-code-bridge.js
```

### 4. Claude Code无法连接
- 确保配置文件路径正确
- 检查JSON格式是否有效
- 重启Claude Code应用
- 查看Claude Code日志输出

## 📂 文件清单

项目中相关的配置文件：

```
/Users/johnqiu/coding/www/projects/new-ai-proj/
├── claude-code-config.json          # Claude Code配置文件
├── mcp-claude-code-bridge.js        # MCP桥接服务器
├── package.json                     # Node.js依赖配置
├── get-auth-token.sh               # Token获取脚本
└── README-claude-code-setup.md     # 本说明文档
```

## 🎉 验证配置

配置完成后，可以通过以下方式验证：

1. **启动MCP服务器无报错**
2. **Claude Code能够连接到MCP服务器**
3. **可以执行基础的"查看任务列表"指令**
4. **能够创建和管理任务**

## 📞 支持

如果遇到问题，请：
1. 检查上述故障排除步骤
2. 查看Claude Code和MCP服务器的日志输出
3. 确认AI项目管理平台正常运行

---

**配置完成后，您就可以用自然语言与AI项目管理平台交互了！** 🚀
