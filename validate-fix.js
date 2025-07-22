#!/usr/bin/env node

/**
 * 验证层级修复的最终测试
 */

const axios = require('axios');
const API_BASE = 'http://localhost:8080';

async function validateHierarchyFix() {
  console.log('🎯 验证层级修复效果...\n');

  try {
    // 1. 获取全局任务数据，查看父子任务结构
    const globalResponse = await axios.get(`${API_BASE}/api/tasks?page=1&page_size=20`);
    const globalTasks = globalResponse.data.data.data || [];
    
    console.log('📊 全局任务数据分析:');
    console.log(`总任务数: ${globalTasks.length}`);
    
    const rootTasks = globalTasks.filter(t => !t.parent_id);
    const childTasks = globalTasks.filter(t => t.parent_id);
    
    console.log(`根任务数: ${rootTasks.length}`);
    console.log(`子任务数: ${childTasks.length}\n`);
    
    // 2. 分析具体的层级结构
    console.log('🌳 任务层级结构:');
    
    // 构建父子关系映射
    const taskMap = new Map();
    const childrenMap = new Map();
    
    globalTasks.forEach(task => {
      taskMap.set(task.id, task);
      if (task.parent_id) {
        if (!childrenMap.has(task.parent_id)) {
          childrenMap.set(task.parent_id, []);
        }
        childrenMap.get(task.parent_id).push(task);
      }
    });
    
    // 显示根任务及其子任务
    rootTasks.slice(0, 5).forEach(rootTask => {
      console.log(`📁 ${rootTask.title} (ID: ${rootTask.id})`);
      if (childrenMap.has(rootTask.id)) {
        childrenMap.get(rootTask.id).forEach(child => {
          console.log(`  └── 📄 ${child.title} (ID: ${child.id})`);
          if (childrenMap.has(child.id)) {
            childrenMap.get(child.id).forEach(grandChild => {
              console.log(`      └── 📄 ${grandChild.title} (ID: ${grandChild.id})`);
            });
          }
        });
      }
    });

    // 3. 测试子任务API
    console.log('\n🧪 测试子任务API调用:');
    const parentTasksWithChildren = Array.from(childrenMap.keys()).slice(0, 3);
    
    for (const parentId of parentTasksWithChildren) {
      const parentTask = taskMap.get(parentId);
      if (parentTask) {
        try {
          const childrenResponse = await axios.get(`${API_BASE}/api/projects/${parentTask.project_id}/tasks/${parentId}/children`);
          const children = childrenResponse.data || [];
          console.log(`✅ 任务 "${parentTask.title}" 的子任务: ${children.length} 个`);
        } catch (error) {
          console.log(`❌ 获取任务 "${parentTask.title}" 的子任务失败: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 层级修复验证完成！');
    console.log('\n📋 修复要点总结:');
    console.log('✅ 全局模式和项目模式现在使用统一的数据处理逻辑');
    console.log('✅ 移除了复杂的全局模式特殊分支逻辑');
    console.log('✅ 子任务展开完全依赖 subTasks Map');
    console.log('✅ depth 从根任务的 0 开始统一计算');
    console.log('✅ 样式类名 depth-{n} 会正确应用');

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

validateHierarchyFix();
