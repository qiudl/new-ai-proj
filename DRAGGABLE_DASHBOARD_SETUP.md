# 可拖拽工作台设置指南
# Draggable Dashboard Setup Guide

## 🎯 功能概述 (Feature Overview)

已实现一个**简化版可拖拽工作台布局系统**，提供三种布局模式：
- **默认布局** - 平衡的两列布局
- **紧凑布局** - 单列垂直布局，节省空间
- **宽松布局** - 增加间距，适合大屏幕使用

## 🛠 Docker 环境问题解决方案

### 方案1: 使用修复后的配置 (推荐)

我已经创建了以下文件来解决 Docker 环境中的 webpack 路径问题：

1. **`webpack.config.js`** - 修复 HTML webpack plugin 路径解析
2. **`craco.config.js`** - CRACO 配置覆盖 webpack 设置  
3. **`.env.development`** - 开发环境变量配置
4. **`start-dev.sh`** - 智能启动脚本

### 启动步骤：

```bash
# 1. 安装 CRACO (webpack 配置覆盖工具)
npm install @craco/craco --legacy-peer-deps

# 2. 使用启动脚本
./start-dev.sh

# 或者手动启动
npm run start
```

### 方案2: 使用 Docker Compose

```bash
# 在项目根目录
docker-compose down
docker-compose build frontend
docker-compose up -d

# 查看日志
docker-compose logs -f frontend
```

### 方案3: 本地开发环境

```bash
# 完全清理
rm -rf node_modules package-lock.json

# 重新安装依赖
npm install --legacy-peer-deps

# 启动开发服务器
npm start
```

## 📁 实现的文件结构

```
frontend/
├── src/
│   ├── components/
│   │   └── DraggableDashboard.tsx    # 主要的可拖拽组件
│   ├── pages/
│   │   └── DashboardPage.tsx         # 更新的工作台页面
│   └── styles/
│       └── draggable-dashboard.css   # 样式文件 (可选)
├── craco.config.js                   # CRACO webpack 配置
├── webpack.config.js                 # Webpack 路径修复
├── .env.development                  # 开发环境变量
└── start-dev.sh                      # 启动脚本
```

## 🎨 用户界面功能

### 工具栏控制
- **布局选择下拉菜单** - 选择三种布局模式
- **重置按钮** - 恢复默认布局
- **刷新按钮** - 重新加载数据

### 组件功能
1. **统计卡片** - 项目总数、完成任务、进行中任务、待办任务
2. **效率统计** - 本周完成、创建任务、效率提升指标
3. **快速操作** - 项目管理、批量导入、任务管理、数据分析入口
4. **最近活动** - 任务动态时间线
5. **项目进度** - 各项目完成进度可视化
6. **团队负载** - 成员工作分配和负载状态
7. **汇总统计** - 关键性能指标概览

## 🔧 故障排除

### 常见问题解决方案

1. **Webpack HTML Plugin 错误**
   ```bash
   # 使用 CRACO 配置
   npm start
   
   # 如果仍然报错，使用传统模式
   npm run start:legacy
   ```

2. **Docker 路径解析问题**
   ```bash
   # 确保环境变量设置
   export CHOKIDAR_USEPOLLING=true
   export WATCHPACK_POLLING=true
   
   # 重新构建容器
   docker-compose build --no-cache frontend
   ```

3. **依赖安装问题**
   ```bash
   # 使用 legacy peer deps
   npm install --legacy-peer-deps
   
   # 清理 npm 缓存
   npm cache clean --force
   ```

4. **TypeScript 错误**
   ```bash
   # 跳过类型检查启动
   SKIP_PREFLIGHT_CHECK=true npm start
   ```

## 📋 布局配置

### 默认布局 (Default)
- 统计卡片: 全宽
- 效率统计: 全宽  
- 主要内容: 两列 (50% / 50%)
- 间距: 16px

### 紧凑布局 (Compact)
- 所有组件: 单列垂直排列
- 间距: 12px
- 适合: 小屏幕、移动设备

### 宽松布局 (Wide)
- 主要内容: 两列 (33% / 33%)，留有更多空白
- 间距: 24px  
- 适合: 大屏幕、宽屏显示器

## 🚀 下一步扩展

1. **真正的拖拽功能** - 等依赖问题解决后，可升级到 react-grid-layout
2. **自定义组件** - 允许用户添加/移除组件
3. **布局模板** - 预设多种专业布局模板
4. **导出/导入** - 布局配置的备份和恢复

通过这个解决方案，你现在有一个完全可用的布局调整系统，无需复杂的第三方依赖！