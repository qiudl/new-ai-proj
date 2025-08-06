import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function fixTask397Consistency() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🔧 修复任务397数据一致性问题...\n');
    
    // 1. 尝试创建一个稍微不同标题的根任务
    console.log('📋 创建32周系统优化根任务（修正版）...');
    
    const rootTaskResult = await taskServer.createTask(
      '32周：系统Bug修复与优化（数据修复）',
      1, // 项目ID 1
      {
        description: `# 32周：系统Bug修复与优化

## 🎯 任务概述
专注于系统核心Bug修复和性能优化工作，确保平台稳定运行。

## 📊 任务背景
- 原任务397存在数据一致性问题（任务存在但无法查询）
- 有2个子任务（628、629）需要重新归属
- 需要建立完整的任务层级结构

## ✅ 已完成的工作
- 任务编辑页父任务选择器UI优化已完成

## 🔄 待完成的工作
- 居中弹窗格式优化
- 系统性能监控和优化
- Bug收集和修复

## 📅 创建信息
- 创建时间: ${new Date().toISOString()}
- 创建工具: Claude Code MCP
- 目的: 修复数据一致性问题并继续32周优化工作`,
        status: 'in_progress',
        priority: 'high'
      }
    );
    
    if (rootTaskResult.success) {
      console.log(`✅ ${rootTaskResult.message}`);
      const newRootTaskId = rootTaskResult.id;
      console.log(`📌 新根任务ID: ${newRootTaskId}\n`);
      
      // 2. 更新孤立的子任务
      console.log('🔄 修复孤立的子任务关系...');
      
      const orphanedTaskIds = [628, 629]; // 已知的子任务ID
      
      for (const taskId of orphanedTaskIds) {
        try {
          console.log(`📝 处理任务${taskId}...`);
          
          // 获取任务详情
          const taskDetail = await taskServer.findTaskById(taskId);
          console.log(`   当前父任务ID: ${taskDetail.parent_id}`);
          console.log(`   任务标题: ${taskDetail.title}`);
          console.log(`   任务状态: ${taskDetail.status}`);
          
          // 更新父任务关系
          const updateResult = await taskServer.updateTask(taskId, {
            parent_id: newRootTaskId
          });
          
          if (updateResult.success) {
            console.log(`   ✅ 成功重新分配给任务${newRootTaskId}`);
          } else {
            console.log(`   ❌ 重新分配失败: ${updateResult.error}`);
          }
          console.log('');
          
        } catch (error) {
          console.log(`   ❌ 处理任务${taskId}失败: ${error.message}\n`);
        }
      }
      
      // 3. 验证新的任务结构
      console.log('🔍 验证修复后的任务结构...');
      const childrenResult = await taskServer.getTaskChildren(newRootTaskId);
      
      if (childrenResult.success) {
        console.log(`📊 任务${newRootTaskId}现有子任务 ${childrenResult.children.length} 个:\n`);
        
        childrenResult.children.forEach((child, index) => {
          console.log(`${index + 1}. 任务${child.id}: ${child.title}`);
          console.log(`   状态: ${child.status} | 优先级: ${child.priority}`);
          console.log(`   创建时间: ${child.created_at}`);
          console.log('');
        });
        
        // 4. 分析当前工作状态
        const completedTasks = childrenResult.children.filter(child => child.status === 'completed');
        const todoTasks = childrenResult.children.filter(child => child.status === 'todo');
        const inProgressTasks = childrenResult.children.filter(child => child.status === 'in_progress');
        
        console.log('📊 工作进度分析:');
        console.log(`   ✅ 已完成: ${completedTasks.length}个`);
        console.log(`   🔄 进行中: ${inProgressTasks.length}个`);
        console.log(`   ⏳ 待开始: ${todoTasks.length}个\n`);
        
        // 5. 识别需要关注的任务
        if (todoTasks.length > 0) {
          console.log('🎯 需要优先处理的任务:');
          todoTasks.forEach((task, idx) => {
            console.log(`   ${idx + 1}. 任务${task.id}: ${task.title}`);
            console.log(`      状态: ${task.status} | 优先级: ${task.priority}`);
          });
          console.log('');
        }
        
        // 6. 建议下一步操作
        console.log('💡 32周系统优化下一步建议:\n');
        
        if (todoTasks.length > 0) {
          console.log('🚀 立即行动:');
          const priorityTask = todoTasks[0];
          console.log(`   1. 开始执行任务${priorityTask.id}: ${priorityTask.title}`);
          console.log('   2. 检查任务具体要求和实现细节');
          console.log('   3. 设定完成时间表\n');
        }
        
        console.log('📋 后续规划:');
        console.log('   1. 完成现有未完成的优化任务');
        console.log('   2. 进行系统性能测试');
        console.log('   3. 收集用户反馈');
        console.log('   4. 规划下一阶段的优化工作');
        
        if (completedTasks.length > 0) {
          console.log('\n✅ 已完成的工作总结:');
          completedTasks.forEach((task, idx) => {
            console.log(`   ${idx + 1}. ${task.title} ✓`);
          });
        }
        
        // 7. 检查是否需要创建新的子任务
        console.log('\n🔍 评估是否需要创建新的优化子任务...');
        
        if (childrenResult.children.length < 5) {
          console.log('💡 建议创建的额外优化子任务:');
          console.log('   • 系统性能监控和分析');
          console.log('   • 用户界面响应速度优化');
          console.log('   • 数据库查询优化');
          console.log('   • 前端资源加载优化');
          console.log('   • 错误处理机制改进');
        } else {
          console.log('ℹ️ 当前子任务数量适中，建议先完成现有任务');
        }
        
      } else {
        console.log('❌ 验证任务结构失败:', childrenResult.error);
      }
      
      // 8. 创建任务文档
      console.log('\n📄 为根任务创建详细文档...');
      const documentContent = `# 32周：系统Bug修复与优化 - 任务文档

## 📋 任务概述
本任务专注于第32周的系统关键Bug修复和性能优化工作。

## 🎯 主要目标
- [x] 修复任务编辑页父任务选择器UI问题
- [ ] 完成居中弹窗格式优化
- [ ] 提升整体系统性能
- [ ] 增强用户交互体验

## 📊 当前进展
### 已完成
- 任务编辑页父任务选择器UI优化

### 进行中
- 居中弹窗格式优化

## 🔧 技术细节
### UI优化
- 从下拉菜单界面转换为居中模态框界面
- 弹窗尺寸：600×450px
- 提升用户体验和交互便利性

## 📅 时间安排
- 开始时间：2025年8月6日
- 预期完成：2025年8月10日
- 状态跟踪：每日更新

## 🐛 已修复的Bug
1. 父任务选择器UI界面问题
2. 数据一致性问题（任务397重建）

## 📈 性能指标
- UI响应时间改进：待测量
- 用户满意度：待收集反馈

## 📝 备注
- 使用Claude Code MCP工具进行任务管理
- 修复了原任务397的数据一致性问题
- 建立了完整的任务层级结构

最后更新：${new Date().toISOString()}`;
      
      const docResult = await taskServer.createOrUpdateTaskDocument(newRootTaskId, documentContent);
      
      if (docResult.success) {
        console.log(`✅ ${docResult.message}`);
      } else {
        console.log(`⚠️ 创建文档失败: ${docResult.error}`);
      }
      
    } else {
      console.log('❌ 创建根任务失败:', rootTaskResult.error);
    }
    
  } catch (error) {
    console.error('❌ 修复操作失败:', error.message);
  }
}

fixTask397Consistency();