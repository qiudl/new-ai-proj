#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function createParentTaskUIFix() {
    console.log('🎯 创建父任务选择器UI优化任务...\n');
    
    // 首先查看是否有适合的父任务
    const listResult = await taskServer.listTasks(1);
    
    let parentTaskId = null;
    
    if (listResult.success) {
        // 查找与UI修复或Bug修复相关的未完成任务
        const potentialParents = listResult.tasks.filter(task => 
            (task.title.includes('Bug修复') || task.title.includes('修复') || task.title.includes('UI') || task.title.includes('界面')) && 
            task.status !== 'completed' && 
            !task.parentTaskId
        );
        
        console.log('🔍 寻找适合的父任务...');
        if (potentialParents.length > 0) {
            console.log('找到可能的父任务:');
            potentialParents.forEach(task => {
                console.log(`- ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}`);
            });
            
            // 选择第一个作为父任务，或者创建为根任务
            console.log('将创建为独立的根任务\n');
        }
    }
    
    const title = "任务编辑页父任务选择器UI优化 - 改为居中弹窗格式";
    const description = `# 任务编辑页父任务选择器UI优化

## 🎯 问题描述

在任务编辑独立页面（如 http://localhost/projects/1/tasks/466/edit）中，选择父任务的弹窗窗口太小，看起来像下拉菜单，用户体验不佳。

## 🔍 问题分析

**当前状态**：
- 父任务选择器显示为小型下拉菜单样式
- 窗口尺寸过小，内容显示不够清晰
- 用户交互体验不佳，难以浏览和选择父任务

**期望效果**：
- 改为居中的标准弹窗模态框格式
- 合适的窗口尺寸，便于浏览父任务列表
- 与批量父任务选择器保持UI一致性

## 🛠️ 技术解决方案

### 1. 定位相关组件
- 查找任务编辑页面中的父任务选择组件
- 确认当前使用的是哪个选择器组件
- 分析现有的样式和布局配置

### 2. UI组件优化
- 将下拉菜单样式改为Modal弹窗
- 设置合适的弹窗尺寸（建议width: 600px, height: 400px）
- 实现居中显示效果
- 添加合适的内边距和间距

### 3. 交互体验改进
- 保持搜索功能的完整性
- 确保父任务树形结构清晰显示
- 添加适当的加载状态和空状态提示
- 优化选择确认的交互流程

## ✅ 验收标准

### 功能验收
1. **弹窗样式**：父任务选择器以居中Modal形式显示
2. **尺寸合适**：窗口大小适中，内容显示清晰
3. **交互正常**：搜索、选择、确认功能完整
4. **响应式**：在不同屏幕尺寸下表现良好

### 兼容性测试
- [ ] 桌面端浏览器（Chrome/Firefox/Safari/Edge）
- [ ] 不同屏幕分辨率下的显示效果
- [ ] 键盘操作支持
- [ ] 触摸设备兼容性

## 🎨 UI设计要求

### 弹窗规格
- **宽度**：600px（最小480px）
- **高度**：450px（最小350px）
- **位置**：屏幕居中显示
- **背景**：半透明遮罩层

### 内容布局
- **标题栏**：清晰的"选择父任务"标题
- **搜索区**：顶部搜索输入框
- **列表区**：可滚动的父任务列表
- **操作区**：底部确认和取消按钮

## 📱 移动端适配

- 在小屏幕设备上自适应调整尺寸
- 保持合理的内容密度
- 确保触摸操作友好

## 🔗 相关链接

- 测试页面：http://localhost/projects/1/tasks/466/edit
- 参考实现：批量父任务选择器的弹窗样式
- UI组件库：Ant Design Modal组件

---

**优先级**：中等 - 影响用户体验但不阻塞核心功能
**预估工时**：4小时
**复杂度**：中等 - 主要是UI调整和样式优化`;
    
    const options = {
        status: 'todo',
        priority: 'medium',
        description: description,
        parent_id: parentTaskId,
        custom_fields: {
            priority: 'medium',
            tags: ['UI优化', '用户体验', '父任务选择器', '模态框', '前端界面']
        }
    };
    
    console.log('📝 创建任务数据:');
    console.log(`- 标题: ${title}`);
    console.log(`- 状态: ${options.status}`);
    console.log(`- 优先级: ${options.priority}`);
    console.log(`- 项目ID: 1`);
    console.log(`- 父任务ID: ${options.parent_id || '无（根任务）'}`);
    console.log(`- 标签: ${options.custom_fields.tags.join(', ')}`);
    
    try {
        const result = await taskServer.createTask(title, 1, options);
        
        if (result.success) {
            console.log('\n✅ 任务创建成功!');
            console.log(`- 新任务ID: ${result.id}`);
            console.log(`- 标题: "${result.title}"`);
            console.log(`- 状态: ${result.status}`);
            console.log(`- 优先级: ${result.priority}`);
            
            console.log('\n🎯 任务已成功创建，可以开始UI优化工作！');
            console.log('测试页面: http://localhost/projects/1/tasks/466/edit');
            console.log(result.message);
            
        } else {
            console.log('❌ 任务创建失败:', result.error || '未知错误');
        }
        
    } catch (error) {
        console.error('❌ 创建任务时出错:', error);
    }
}

createParentTaskUIFix().catch(console.error);