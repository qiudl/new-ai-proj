# 任务管理系统 2.0 - MVP开发待办事项

## 项目概述

基于现有任务管理系统，添加三个核心功能实现2.0版本：
1. **层级任务** - 支持父子任务关系
2. **任务更新** - 记录状态、备注、时间的更新历史  
3. **时间轴报告** - 可视化显示任务活动历史

**MVP原则：最小可用产品，快速验证核心价值**

---

## 🎯 MVP功能范围

### 核心功能（必须有）
- 创建子任务
- 查看父子关系
- 记录任务更新
- 显示更新历史
- 简单时间轴视图

### 暂不包含（后续版本）
- 复杂的报告分析
- 批量操作
- 第三方集成
- 移动端优化
- 高级筛选

---

## 📋 开发任务清单

### 阶段1：数据结构调整（1天）

- [ ] **扩展现有Task模型**
  - 添加parent_id字段（指向父任务）
  - 添加level字段（任务层级，0=根任务）
  - 在custom_fields中添加children数组

- [ ] **创建TaskUpdate模型**
  - id, task_id, update_type, old_value, new_value
  - updated_by, updated_at, notes
  - 只记录status、progress、notes三种更新

- [ ] **创建TimelineEvent模型**  
  - id, task_id, event_type, event_date, description
  - 只记录created、updated、completed三种事件

### 阶段2：后端API扩展（1天）

- [ ] **任务创建API调整**
  - POST /api/tasks 支持parent_id参数
  - 自动计算level和更新父任务children

- [ ] **新增子任务相关API**
  - GET /api/tasks/:id/children - 获取直接子任务
  - GET /api/tasks/:id/tree - 获取完整任务树

- [ ] **任务更新API增强**
  - PUT /api/tasks/:id 自动记录更新历史
  - 自动创建timeline事件

- [ ] **新增历史查询API**
  - GET /api/tasks/:id/updates - 获取更新历史
  - GET /api/tasks/:id/timeline - 获取时间轴

### 阶段3：前端界面升级（2天）

- [ ] **任务列表支持层级显示**
  - 父任务显示展开/收起按钮
  - 子任务缩进显示
  - 简单的树形结构

- [ ] **任务详情页面升级**
  - 添加"子任务"标签页
  - 添加"更新历史"标签页
  - 在子任务页面显示添加子任务按钮

- [ ] **创建任务表单调整**
  - 支持选择父任务（下拉选择）
  - 简化表单，专注核心字段

- [ ] **简单时间轴页面**
  - 显示所有任务的活动流
  - 按时间倒序排列
  - 显示任务标题、事件类型、时间

### 阶段4：基础功能完善（1天）

- [ ] **父任务进度自动计算**
  - 根据子任务完成情况更新父任务进度
  - 所有子任务完成时，父任务自动完成

- [ ] **更新历史详细记录**
  - 记录状态变更（todo→in_progress→completed）
  - 记录进度变更（百分比）
  - 记录备注添加

- [ ] **基础数据验证**
  - 防止创建循环父子关系
  - 限制任务层级深度（如最多3层）

---

## 🚧 技术实现要点

### 数据库调整
- 在现有tasks表添加parent_id和level字段
- 创建task_updates和timeline_events表
- 添加必要的索引

### 前端组件复用
- 扩展现有TaskItem组件支持层级显示
- 复用现有模态框组件添加新标签页
- 基于现有样式系统

### API向后兼容
- 保持现有API不变
- 新增字段设置默认值
- 新API采用RESTful设计

---

## ⏱️ 开发时间估算

**总计：5个工作日**

- 数据结构调整：1天
- 后端API开发：1天  
- 前端界面开发：2天
- 功能完善和测试：1天

---

## 🎯 MVP验收标准

### 用户故事验证
1. **作为用户，我可以为任务创建子任务**
   - 在任务详情页面点击"添加子任务"
   - 子任务在任务列表中正确显示层级关系

2. **作为用户，我可以查看任务的更新历史**
   - 在任务详情的"更新历史"标签查看所有变更
   - 显示时间、操作类型、变更内容

3. **作为用户，我可以查看项目的时间轴**
   - 在时间轴页面看到所有任务活动
   - 按时间顺序了解项目进展

### 技术验收
- 父任务删除时，子任务处理策略明确
- 任务层级不超过设定限制
- 所有API响应时间<500ms
- 前端界面在主流浏览器正常显示

---

## 🚀 后续迭代计划

### V2.1 (1周后)
- 批量操作子任务
- 更丰富的时间轴筛选
- 简单的统计图表

### V2.2 (2周后)  
- 任务模板功能
- 更好的移动端体验
- 数据导出功能

**MVP完成后立即收集用户反馈，基于实际使用情况决定后续优先级**