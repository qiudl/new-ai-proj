# 多AI开发工具集 v2.0

智能并行开发助手，支持任务依赖分析和多AI协同开发。

## 🚀 快速开始

### 安装

```bash
# 克隆项目
git clone [repository-url]
cd new-ai-proj

# 添加到PATH
export PATH="$PWD/tools/multi-ai/cli:$PATH"

# 或创建软链接
ln -s "$PWD/tools/multi-ai/cli/multi-ai" /usr/local/bin/multi-ai
```

### 基础使用

```bash
# 查看帮助
multi-ai --help

# 生成配置文件
multi-ai config my-project

# 分析任务依赖
multi-ai analyze my-project-ai-config.json

# 启动多AI环境
multi-ai start my-project-ai-config.json

# 查看运行状态
multi-ai status

# 停止所有AI实例
multi-ai stop
```

## 🏗️ 架构概览

### 核心组件

```
tools/multi-ai/
├── core/                    # 核心功能模块
│   ├── universal-launcher.sh    # 多AI启动器
│   ├── analyzers/
│   │   └── dependency-analyzer.sh  # 任务依赖分析
│   ├── schedulers/              # 任务调度器(待开发)
│   └── auth/                    # 认证管理(待开发)
├── cli/                     # 命令行接口
│   └── multi-ai                 # 统一CLI入口
├── templates/               # 配置模板
│   ├── full-stack.json         # 全栈项目模板
│   └── web-app.json            # Web应用模板
└── docs/                    # 文档
```

### 工作流程

1. **配置生成** - 根据项目类型生成AI专家配置
2. **依赖分析** - 分析任务间的依赖关系
3. **智能调度** - 生成最优执行计划
4. **并行启动** - 启动多个Claude Code实例
5. **状态监控** - 实时监控开发进度

## 📋 配置文件格式

### 基础结构

```json
{
  "project": {
    "name": "项目名称",
    "path": "/project/path",
    "taskSystem": {
      "url": "http://localhost:8081",
      "projectId": "1"
    }
  },
  "environment": {
    "proxyScript": "~/proxy.sh local",
    "preCommands": ["echo 'Starting...'"]
  },
  "dependencies": {
    "analyzer": "auto",
    "strategy": "smart"
  },
  "aiExperts": [
    {
      "id": "expert_id",
      "name": "🔧 专家名称",
      "description": "专家描述",
      "tasks": ["task1", "task2"],
      "workingDir": "./path",
      "specialties": ["技能1", "技能2"],
      "dependencies": {
        "requires": ["other_expert"],
        "blocks": ["dependent_expert"]
      }
    }
  ]
}
```

### 依赖关系配置

```json
{
  "dependencies": {
    "requires": ["expert1", "expert2"],  // 必须等待的前置专家
    "blocks": ["expert3", "expert4"]     // 会被当前专家阻塞的后续专家
  }
}
```

## 🔧 核心功能

### 1. 任务依赖分析

自动分析任务系统中的依赖关系，生成最优执行计划：

- 检测循环依赖
- 生成拓扑排序
- 识别可并行执行的任务组
- 计算执行时序

### 2. 智能任务调度

基于依赖关系智能调度任务执行：

- **无依赖任务** → 立即并行启动
- **有依赖任务** → 等待前置任务完成
- **阻塞任务** → 完成后触发后续任务

### 3. 多AI启动管理

统一管理多个Claude Code实例：

- 自动配置代理和环境
- 显示实时任务信息
- 提供快速启动命令
- 启动状态监控

### 4. 项目模板系统

预定义常见项目类型的配置模板：

- **full-stack.json** - 全栈项目(后端+前端+数据库+DevOps+测试)
- **web-app.json** - Web应用(组件+页面+API+测试)
- **api-service.json** - API服务(待开发)

## 📖 使用示例

### 示例1: Web应用开发

```bash
# 1. 生成配置
multi-ai config my-web-app
# 创建: my-web-app-ai-config.json

# 2. 编辑配置文件
# 设置项目路径、任务ID等

# 3. 分析依赖关系
multi-ai analyze my-web-app-ai-config.json

# 4. 启动开发环境
multi-ai start my-web-app-ai-config.json
```

### 示例2: 品牌管理功能开发

```bash
# 使用现有配置启动
cd /path/to/new-twms
multi-ai start branding-pages-ai-config.json

# 会启动3个AI专家:
# - 🔧 系统管理页面AI专家 (任务331)
# - 🎨 用户界面AI专家 (任务332)  
# - 🔗 集成测试AI专家 (任务330)
```

## 🔄 迁移指南

### 从旧版工具迁移

如果你之前使用过`universal-multi-ai.sh`：

1. **配置文件兼容** - 现有JSON配置可直接使用
2. **命令变更** - `universal-multi-ai.sh config.json` → `multi-ai start config.json`
3. **新增功能** - 依赖分析、智能调度等

### 项目适配

在其他项目中使用：

```bash
# 方法1: 软链接
ln -s /path/to/new-ai-proj/tools/multi-ai/cli/multi-ai ~/.local/bin/

# 方法2: 环境变量
export PATH="/path/to/new-ai-proj/tools/multi-ai/cli:$PATH"

# 方法3: 直接调用
/path/to/new-ai-proj/tools/multi-ai/cli/multi-ai start config.json
```

## 🐛 故障排除

### 常见问题

1. **Token获取失败**
   ```bash
   # 检查任务系统是否运行
   curl http://localhost:8081/api/v1/health
   
   # 检查认证信息
   multi-ai analyze --debug config.json
   ```

2. **代理配置问题**
   ```bash
   # 取消代理后重试
   unset http_proxy https_proxy
   multi-ai start config.json
   ```

3. **依赖分析失败**
   ```bash
   # 检查配置文件格式
   jq '.' config.json
   
   # 检查任务系统连接
   multi-ai status
   ```

### 调试模式

```bash
# 启用详细日志
DEBUG=1 multi-ai start config.json

# 检查依赖
multi-ai analyze --verbose config.json
```

## 🚧 开发计划

### 已完成 ✅
- [x] 核心启动器迁移
- [x] 统一CLI接口
- [x] 依赖分析引擎(基础版)
- [x] 配置模板系统
- [x] JWT认证集成

### 开发中 🔄
- [ ] 智能任务调度器
- [ ] 依赖分析可视化
- [ ] 性能监控和优化

### 计划中 📅
- [ ] Web界面管理工具
- [ ] 插件生态系统
- [ ] 团队协作功能
- [ ] 云端同步支持

## 📄 许可证

[MIT License](LICENSE)

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启Pull Request