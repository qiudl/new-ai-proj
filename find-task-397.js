import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function findTask397AndAnalyze() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🔍 分析任务397相关信息...\n');
    
    // 1. 获取项目1的所有任务，寻找parent_id为397的任务
    console.log('📊 获取项目1的所有任务...');
    const listResult = await taskServer.listTasks(1);
    if (!listResult.success) {
      console.error('❌ 获取任务列表失败:', listResult.error);
      return;
    }
    
    const allTasks = listResult.tasks;
    console.log(`✅ 共获取到 ${allTasks.length} 个任务\n`);
    
    // 2. 查找所有parent_id为397的子任务
    console.log('🔍 查找父任务ID为397的子任务...');
    const childrenOf397 = [];
    
    for (const task of allTasks) {
      try {
        const taskDetail = await taskServer.findTaskById(task.id);
        if (taskDetail.parent_id === 397) {
          childrenOf397.push(taskDetail);
        }
      } catch (error) {
        console.log(`⚠️ 无法获取任务${task.id}详情: ${error.message}`);
      }
    }
    
    console.log(`✅ 找到 ${childrenOf397.length} 个父任务ID为397的子任务:\n`);
    
    if (childrenOf397.length > 0) {
      childrenOf397.forEach((child, index) => {
        console.log(`${index + 1}. 任务${child.id}: ${child.title}`);
        console.log(`   状态: ${child.status} | 优先级: ${child.custom_fields?.priority || '未设置'}`);
        console.log(`   创建时间: ${child.created_at}`);
        console.log(`   描述预览: ${child.description ? child.description.substring(0, 100) + '...' : '无描述'}`);
        console.log('');
      });
      
      console.log('❗ 重要发现: 虽然任务397本身不存在，但有子任务引用它作为父任务');
      console.log('这表明任务397可能已被删除，但子任务关系仍然存在\n');
    }
    
    // 3. 尝试多个项目查找397
    console.log('🔍 在所有项目中查找任务397...');
    const projectsResult = await taskServer.listProjects();
    if (projectsResult.success) {
      console.log(`📁 共有 ${projectsResult.projects.length} 个项目\n`);
      
      for (const project of projectsResult.projects) {
        console.log(`🔍 在项目${project.id}: ${project.name} 中查找任务397...`);
        try {
          const projectTasks = await taskServer.listTasks(project.id);
          if (projectTasks.success) {
            const task397InProject = projectTasks.tasks.find(t => t.id === 397);
            if (task397InProject) {
              console.log(`✅ 在项目${project.id}中找到任务397!`);
              const detailedTask397 = await taskServer.findTaskById(397);
              console.log(`📋 任务397详情:`);
              console.log(`   标题: ${detailedTask397.title}`);
              console.log(`   状态: ${detailedTask397.status}`);
              console.log(`   项目ID: ${detailedTask397.project_id}`);
              console.log(`   父任务ID: ${detailedTask397.parent_id || '无(根任务)'}`);
              console.log(`   创建时间: ${detailedTask397.created_at}`);
              console.log(`   描述: ${detailedTask397.description || '无描述'}`);
              
              // 获取任务397的子任务
              const children397 = await taskServer.getTaskChildren(397);
              if (children397.success) {
                console.log(`\n🌳 任务397的子任务 (${children397.children.length}个):`);
                children397.children.forEach((child, idx) => {
                  console.log(`   ${idx + 1}. 任务${child.id}: ${child.title} (${child.status})`);
                });
              }
              
              return; // 找到了就结束搜索
            }
          }
        } catch (error) {
          console.log(`   ❌ 搜索项目${project.id}失败: ${error.message}`);
        }
      }
      
      console.log('❌ 在所有项目中都未找到任务397\n');
    }
    
    // 4. 搜索标题包含"32周"、"系统Bug修复与优化"的任务
    console.log('🎯 搜索可能的32周系统优化根任务...');
    const week32Keywords = [
      '32周', '第32周', 'week32', 'week 32', 
      '系统Bug修复', '系统优化', '系统bug修复', 'system optimization',
      'Bug修复与优化', 'bug修复与优化'
    ];
    
    const potentialRootTasks = [];
    
    for (const task of allTasks) {
      try {
        const taskDetail = await taskServer.findTaskById(task.id);
        const titleLower = taskDetail.title.toLowerCase();
        const descLower = (taskDetail.description || '').toLowerCase();
        
        const isMatch = week32Keywords.some(keyword => 
          titleLower.includes(keyword.toLowerCase()) || 
          descLower.includes(keyword.toLowerCase())
        );
        
        if (isMatch && !taskDetail.parent_id) { // 只查找根任务
          potentialRootTasks.push(taskDetail);
        }
      } catch (error) {
        console.log(`⚠️ 无法检查任务${task.id}: ${error.message}`);
      }
    }
    
    console.log(`✅ 找到 ${potentialRootTasks.length} 个可能的32周系统优化根任务:\n`);
    
    if (potentialRootTasks.length > 0) {
      potentialRootTasks.forEach((task, index) => {
        console.log(`${index + 1}. 任务${task.id}: ${task.title}`);
        console.log(`   状态: ${task.status} | 优先级: ${task.custom_fields?.priority || '未设置'}`);
        console.log(`   创建时间: ${task.created_at}`);
        console.log(`   描述: ${task.description ? task.description.substring(0, 150) + '...' : '无描述'}`);
        console.log('');
      });
    }
    
    // 5. 分析和建议
    console.log('📋 分析总结和建议:\n');
    
    if (childrenOf397.length > 0) {
      console.log('🔍 关键发现:');
      console.log(`   • 任务397作为父任务被 ${childrenOf397.length} 个子任务引用`);
      console.log('   • 但任务397本身在数据库中不存在');
      console.log('   • 这可能是数据一致性问题\n');
      
      console.log('💡 建议操作:');
      console.log('   1. 重新创建任务397作为"32周：系统Bug修复与优化"根任务');
      console.log('   2. 或者将现有子任务重新分配给其他合适的父任务');
      console.log('   3. 检查并修复数据一致性问题\n');
    }
    
    if (potentialRootTasks.length > 0) {
      console.log('📌 替代方案:');
      console.log(`   可以使用任务${potentialRootTasks[0].id}: "${potentialRootTasks[0].title}" 作为32周系统优化的主任务`);
      console.log(`   然后将孤立的子任务归并到这个任务下\n`);
    }
    
    // 6. 列出所有未完成的系统优化相关任务
    console.log('⚠️ 32周相关未完成任务统计:');
    const incompleteTasks = childrenOf397.filter(task => !['completed'].includes(task.status));
    if (incompleteTasks.length > 0) {
      console.log(`   未完成的子任务: ${incompleteTasks.length}个`);
      incompleteTasks.forEach((task, idx) => {
        console.log(`   ${idx + 1}. 任务${task.id}: ${task.title} (${task.status})`);
      });
    } else {
      console.log('   ✅ 所有相关任务都已完成');
    }
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

findTask397AndAnalyze();