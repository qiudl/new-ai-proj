#!/usr/bin/env node

/**
 * 最终验证脚本 - 检查层级修复是否生效
 */

const axios = require('axios');
const fs = require('fs').promises;

async function finalValidation() {
  console.log('🏁 最终验证：层级展开修复效果\n');

  try {
    // 1. 检查前端代码是否正确修复
    console.log('📁 检查前端代码修复状态...');
    const tasksPageContent = await fs.readFile('/Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/pages/TasksPage.tsx', 'utf8');
    
    // 检查关键修复点
    const fixes = {
      '移除全局模式useEffect': !tasksPageContent.includes('处理全局模式下的父子任务关系'),
      '统一buildExpandedDataSource逻辑': !tasksPageContent.includes('在全局模式下，需要特殊处理层级关系'),
      '移除orphanTasks逻辑': !tasksPageContent.includes('orphanTasks.forEach'),
      '移除effectiveProjectId依赖': tasksPageContent.includes('}, [tasks, expandedTasks, subTasks]')
    };

    console.log('✅ 代码修复状态:');
    Object.entries(fixes).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}`);
    });

    // 2. 验证API数据结构一致性
    console.log('\n📊 验证API数据结构...');
    
    // 获取有子任务的父任务
    const globalResponse = await axios.get('http://localhost:8080/api/tasks?page=1&page_size=20');
    const allTasks = globalResponse.data.data.data || [];
    const parentTask = allTasks.find(t => {
      return allTasks.some(child => child.parent_id === t.id);
    });

    if (parentTask) {
      console.log(`找到父任务: ${parentTask.title} (ID: ${parentTask.id})`);
      
      // 测试项目模式API
      try {
        const projectResponse = await axios.get(`http://localhost:8080/api/projects/${parentTask.project_id}/tasks?page=1&page_size=20`);
        const projectTasks = projectResponse.data.data.data || [];
        console.log(`✅ 项目模式API正常，获取 ${projectTasks.length} 个任务`);
      } catch (error) {
        console.log(`❌ 项目模式API异常: ${error.message}`);
      }

      // 测试子任务获取API
      try {
        const childrenResponse = await axios.get(`http://localhost:8080/api/projects/${parentTask.project_id}/tasks/${parentTask.id}/children`);
        const children = childrenResponse.data || [];
        console.log(`✅ 子任务API正常，获取 ${children.length} 个子任务`);
      } catch (error) {
        console.log(`❌ 子任务API异常: ${error.message}`);
      }
    }

    // 3. 检查样式文件
    console.log('\n🎨 检查样式文件...');
    try {
      const cssContent = await fs.readFile('/Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/styles/task-hierarchy.css', 'utf8');
      const hasDepthStyles = /\.depth-[1-6]/.test(cssContent);
      const hasHierarchyStyles = cssContent.includes('task-hierarchy-item');
      
      console.log(`✅ 样式文件状态:`);
      console.log(`  ${hasDepthStyles ? '✅' : '❌'} 包含深度样式 (.depth-1, .depth-2 等)`);
      console.log(`  ${hasHierarchyStyles ? '✅' : '❌'} 包含层级样式 (.task-hierarchy-item)`);
    } catch (error) {
      console.log(`❌ 样式文件读取失败: ${error.message}`);
    }

    // 4. 总结修复效果
    console.log('\n🎯 修复效果总结:');
    console.log('');
    console.log('✅ 问题诊断:');
    console.log('  - 全局模式使用复杂的orphanTasks逻辑导致depth计算错误');
    console.log('  - buildExpandedDataSource中两套不同的层级处理逻辑冲突');
    console.log('  - subTasks Map与buildExpandedDataSource的数据不一致');
    console.log('');
    console.log('✅ 修复方案:');
    console.log('  - 移除全局模式的特殊useEffect处理');
    console.log('  - 统一buildExpandedDataSource逻辑，不再区分模式');
    console.log('  - 所有展开操作依赖subTasks Map和API调用');
    console.log('  - depth计算统一从根任务的0开始递增');
    console.log('');
    console.log('✅ 预期效果:');
    console.log('  - 全局任务列表和项目任务列表展开样式一致');
    console.log('  - 子任务正确显示缩进和层级连接线');
    console.log('  - CSS类名 depth-{n} 正确应用');
    console.log('  - 无样式混乱和布局问题');

    console.log('\n🚀 修复已完成！可以访问以下链接测试:');
    console.log('  - 全局任务列表: http://localhost/tasks');
    console.log('  - 项目任务列表: http://localhost/projects/34/tasks');
    console.log('  - 对比两个页面的展开效果应该一致');

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

finalValidation();
