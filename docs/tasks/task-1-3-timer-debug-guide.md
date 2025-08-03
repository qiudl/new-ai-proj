# 定时器功能调试指南

## 🔍 定时器功能架构分析

### 核心组件
1. **TimerContext** (全局状态管理)
   - 位置: `/src/contexts/TimerContext.tsx`
   - 作用: 管理全局定时器状态，支持localStorage持久化
   - 提供: startTimer, stopTimer, pauseTimer, resumeTimer方法

2. **FloatingTimer** (全局浮动定时器)
   - 位置: `/src/components/FloatingTimer/index.tsx`
   - 作用: 在所有页面显示的浮动定时器
   - 特性: 可拖拽、可最小化、显示当前计时任务

3. **MVPTaskDetailTimer** (任务详情定时器)
   - 位置: `/src/components/MVPTaskDetailTimer.tsx` 
   - 作用: 任务详情页专用定时器
   - 特性: 显示开始时间、实时更新、快捷键支持

4. **定时器服务**
   - 位置: `/src/services/timerService.ts`
   - 作用: 与后端API通信
   - 端点: `/api/v1/timer/start`, `/stop`, `/current`, `/stats`

### 后端支持
- API路由: `/api/v1/timer/*`
- 数据表: `task_time_logs`, `users` (timing字段)
- Handler: `handlers/timer_handlers.go`

## 🔧 调试步骤

### 第一步: 验证后端API
```bash
# 获取当前定时器状态
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost/api/v1/timer/current

# 开始计时（需要有效的task_id）
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \
  -d '{"task_id": 46}' http://localhost/api/v1/timer/start
```

### 第二步: 检查前端组件加载
1. 打开浏览器开发者工具
2. 查看Console是否有TimerContext相关错误
3. 检查Network面板是否有timer API调用

### 第三步: 测试FloatingTimer
1. 登录应用
2. 查看右上角是否有浮动定时器
3. 尝试开始计时任务

### 第四步: 测试任务详情页定时器
1. 进入任何任务详情页
2. 查看右侧是否有定时器组件
3. 尝试开始/停止计时

### 第五步: 验证数据持久化
1. 开始计时一个任务
2. 刷新页面
3. 检查定时器状态是否保持

## 🎯 常见问题排查

### 1. 定时器API 404/500错误
- 检查后端服务是否运行
- 验证API路由配置
- 确认数据库迁移已执行

### 2. 前端定时器不显示
- 检查TimerContext是否正确初始化
- 验证组件导入路径
- 查看CSS样式是否正确加载

### 3. 状态同步问题
- 检查localStorage数据
- 验证Context状态更新
- 确认组件重新渲染

### 4. 认证问题
- 确认JWT token有效
- 检查API请求头
- 验证用户权限

## 🔍 关键文件检查清单

- [ ] TimerContext.tsx - 状态管理正常
- [ ] FloatingTimer/index.tsx - 组件渲染正常
- [ ] MVPTaskDetailTimer.tsx - 任务计时功能
- [ ] timerService.ts - API调用正常
- [ ] timer_handlers.go - 后端处理正常
- [ ] 数据库timer相关表存在且有数据