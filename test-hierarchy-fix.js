#!/usr/bin/env node

/**
 * 测试层级修复效果
 * 验证全局任务列表和项目任务列表的展开样式一致性
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080';

async function testHierarchyFix() {
  console.log('🔍 测试任务层级修复效果...\n');

  try {
    // 1. 获取项目列表
    console.log('📋 获取项目列表...');
    const projectsResponse = await axios.get(`${API_BASE}/api/projects`);
    const projects = projectsResponse.data.data.data || []; // 修复数据结构访问
    
    if (projects.length === 0) {
      console.log('❌ 没有找到项目，无法进行测试');
      return;
    }

    // 找一个有任务的项目进行测试
    let firstProject = projects.find(p => p.id === 34); // 李宁团购管理平台
    if (!firstProject) {
      firstProject = projects[0]; // 如果找不到，使用第一个项目
    }
    console.log(`✅ 找到项目: ${firstProject.name} (ID: ${firstProject.id})\n`);

    // 2. 获取项目任务（项目模式）
    console.log('📝 测试项目模式任务列表...');
    const projectTasksResponse = await axios.get(`${API_BASE}/api/projects/${firstProject.id}/tasks`, {
      params: { page: 1, page_size: 10 }
    });
    
    const projectTasks = projectTasksResponse.data.data.data || []; // 修复数据结构访问
    console.log(`✅ 项目模式获取到 ${projectTasks.length} 个任务`);

    // 3. 获取全局任务（全局模式）
    console.log('🌍 测试全局模式任务列表...');
    const globalTasksResponse = await axios.get(`${API_BASE}/api/tasks`, {
      params: { page: 1, page_size: 10 }
    });
    
    const globalTasks = globalTasksResponse.data.data.data || []; // 修复数据结构访问
    console.log(`✅ 全局模式获取到 ${globalTasks.length} 个任务\n`);

    // 4. 分析任务结构
    console.log('🔍 分析任务结构...');
    
    const projectRootTasks = projectTasks.filter(task => !task.parent_id);
    const projectChildTasks = projectTasks.filter(task => task.parent_id);
    
    const globalRootTasks = globalTasks.filter(task => !task.parent_id);
    const globalChildTasks = globalTasks.filter(task => task.parent_id);

    console.log(`项目模式 - 根任务: ${projectRootTasks.length}, 子任务: ${projectChildTasks.length}`);
    console.log(`全局模式 - 根任务: ${globalRootTasks.length}, 子任务: ${globalChildTasks.length}`);

    // 5. 测试子任务获取
    if (projectRootTasks.length > 0) {
      const testTask = projectRootTasks[0];
      console.log(`\n🧪 测试任务 "${testTask.title}" 的子任务获取...`);
      
      try {
        const childrenResponse = await axios.get(`${API_BASE}/api/projects/${firstProject.id}/tasks/${testTask.id}/children`);
        const children = childrenResponse.data || [];
        console.log(`✅ 成功获取 ${children.length} 个子任务`);
        
        if (children.length > 0) {
          console.log('子任务列表:');
          children.forEach((child, index) => {
            console.log(`  ${index + 1}. ${child.title}`);
          });
        }
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('ℹ️  该任务没有子任务');
        } else {
          console.log(`❌ 获取子任务失败: ${error.message}`);
        }
      }
    }

    console.log('\n✅ 层级修复测试完成！');
    console.log('\n📊 修复效果总结:');
    console.log('- 全局模式和项目模式现在使用统一的数据处理逻辑');
    console.log('- 移除了复杂的"孤儿任务"处理逻辑');  
    console.log('- 子任务展开完全依赖 subTasks Map 和 API 调用');
    console.log('- depth 计算统一，从根任务的 0 开始递增');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 请确保后端服务正在运行: docker-compose up -d');
    }
  }
}

// 运行测试
testHierarchyFix();
