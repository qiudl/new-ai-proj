import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function analyzeTaskRelationships() {
  try {
    console.log('📊 分析任务层级关系...');
    
    const result = await taskServer.listTasks(1);
    const tasks = result.tasks || [];
    
    const importantTaskIds = [617, 633, 630, 620, 619, 618];
    
    console.log('\n🌳 重要任务的子任务关系:');
    
    for (const parentId of importantTaskIds) {
      const parent = tasks.find(t => t.id === parentId);
      const children = tasks.filter(t => t.parent_task_id === parentId || t.parent_id === parentId);
      
      if (parent) {
        const statusIcon = parent.status === 'completed' ? '✅' : 
                          parent.status === 'in_progress' ? '🚧' : '📋';
        const priorityIcon = parent.custom_fields?.priority === 'high' ? '🔥' : 
                           parent.custom_fields?.priority === 'medium' ? '⚡' : '📋';
        
        console.log(`\n${statusIcon} ${priorityIcon} 任务 ${parentId}: ${parent.title}`);
        console.log(`   状态: ${parent.status} | 优先级: ${parent.custom_fields?.priority || 'low'}`);
        
        if (children.length > 0) {
          console.log(`   📦 子任务 (${children.length}个):`);
          children.forEach(child => {
            const childIcon = child.status === 'completed' ? '✅' : 
                             child.status === 'in_progress' ? '🚧' : '📋';
            console.log(`     ${childIcon} ID: ${child.id} | ${child.title} | ${child.status}`);
          });
        } else {
          console.log(`   📋 无子任务`);
        }
      }
    }
    
    // 分析任务优先级和建议
    console.log('\n\n🎯 执行建议分析:');
    
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress' && importantTaskIds.includes(t.id));
    const highPriorityTodos = tasks.filter(t => t.status === 'todo' && t.custom_fields?.priority === 'high' && importantTaskIds.includes(t.id));
    const mediumPriorityTodos = tasks.filter(t => t.status === 'todo' && t.custom_fields?.priority === 'medium' && importantTaskIds.includes(t.id));
    
    if (inProgressTasks.length > 0) {
      console.log('🚧 当前进行中的高优先级任务:');
      inProgressTasks.forEach(task => {
        console.log(`   - 任务 ${task.id}: ${task.title}`);
        console.log(`     建议: 继续完成此任务，进度 ${task.custom_fields?.progress || 0}%`);
      });
    }
    
    if (highPriorityTodos.length > 0) {
      console.log('\n🔥 高优先级待办任务:');
      highPriorityTodos.forEach(task => {
        console.log(`   - 任务 ${task.id}: ${task.title}`);
        console.log(`     建议: 优先启动此任务`);
      });
    }
    
    if (mediumPriorityTodos.length > 0) {
      console.log('\n⚡ 中优先级待办任务:');
      mediumPriorityTodos.forEach(task => {
        console.log(`   - 任务 ${task.id}: ${task.title}`);
        if (task.custom_fields?.estimated_hours) {
          console.log(`     预估工时: ${task.custom_fields.estimated_hours}小时`);
        }
      });
    }
    
    // 生成执行顺序建议
    console.log('\n📋 推荐执行顺序:');
    console.log('1. 🚧 继续任务617: 任务归档数据库模型设计与优化 (in_progress, 高优先级)');
    console.log('2. ⚡ 开始任务633: MCP环境检测技术实现方案 (todo, 中优先级)');
    console.log('3. 📋 执行任务618: 任务归档管理后端API开发 (todo, 6小时工时)');
    console.log('4. 📋 执行任务619: 任务归档管理前端界面开发 (todo, 5小时工时)');
    console.log('5. 📋 执行任务620: 任务归档功能集成测试与验证 (todo, 3小时工时)');
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

analyzeTaskRelationships();