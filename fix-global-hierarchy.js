#!/usr/bin/env node

/**
 * 诊断并修复全局任务列表的层级问题
 */

console.log('🔍 深度诊断全局任务列表层级问题...\n');

// 分析API数据结构差异
const axios = require('axios');
const API_BASE = 'http://localhost:8080';

async function diagnoseIssue() {
  try {
    // 1. 对比全局API和项目API的数据结构
    console.log('📊 对比API数据结构...');
    
    const globalResponse = await axios.get(`${API_BASE}/api/tasks?page=1&page_size=15`);
    const globalTasks = globalResponse.data.data.data || [];
    
    const projectResponse = await axios.get(`${API_BASE}/api/projects/1/tasks?page=1&page_size=15`);
    const projectTasks = projectResponse.data.data.data || [];
    
    console.log('全局任务API结构:');
    const globalRoots = globalTasks.filter(t => !t.parent_id);
    const globalChildren = globalTasks.filter(t => t.parent_id);
    console.log(`  - 根任务: ${globalRoots.length} 个`);
    console.log(`  - 子任务: ${globalChildren.length} 个`);
    console.log('  - 混合数据（根+子任务都在同一个响应中）\n');
    
    console.log('项目任务API结构:');
    const projectRoots = projectTasks.filter(t => !t.parent_id);
    const projectChildren = projectTasks.filter(t => t.parent_id);
    console.log(`  - 根任务: ${projectRoots.length} 个`);
    console.log(`  - 子任务: ${projectChildren.length} 个`);
    console.log('  - 纯根任务（子任务通过单独API获取）\n');
    
    // 2. 分析问题根源
    console.log('🎯 问题根源分析:');
    console.log('❌ 当前修复的问题：');
    console.log('  - buildExpandedDataSource 只显示根任务 (!task.parent_id)');
    console.log('  - 全局模式下的子任务被过滤掉，无法显示');
    console.log('  - 展开父任务时，子任务从哪里来？subTasks Map为空！\n');
    
    console.log('✅ 正确的解决方案：');
    console.log('  1. 全局模式需要预处理已知的父子关系');
    console.log('  2. 将当前页面的子任务预填充到 subTasks Map');
    console.log('  3. 但不自动展开，保持用户控制');
    console.log('  4. 点击展开时优先使用预填充数据，没有再调API\n');
    
    // 3. 展示理想的数据流
    console.log('🔄 理想的数据处理流程:');
    console.log('全局模式:');
    console.log('  API数据 → 分离根任务和子任务 → 预填充subTasks → buildExpandedDataSource只处理根任务');
    console.log('  → 用户点击展开 → 优先使用预填充数据 → 如需要再调API获取更深层级\n');
    
    console.log('项目模式:');
    console.log('  API数据 → 只有根任务 → buildExpandedDataSource处理根任务');
    console.log('  → 用户点击展开 → 调API获取子任务 → 填充subTasks → 重新渲染\n');
    
    // 4. 具体的修复代码建议
    console.log('🛠️  具体修复建议：');
    console.log('需要在 TasksPage.tsx 中添加全局模式的预处理逻辑：');
    console.log(`
// 全局模式下预处理父子关系
useEffect(() => {
  if (!effectiveProjectId && Array.isArray(tasks) && tasks.length > 0) {
    const childrenMap = new Map<number, Task[]>();
    
    // 构建父子关系映射
    tasks.forEach(task => {
      if (task.parent_id) {
        if (!childrenMap.has(task.parent_id)) {
          childrenMap.set(task.parent_id, []);
        }
        childrenMap.get(task.parent_id)!.push(task);
      }
    });
    
    // 预填充 subTasks，但不展开
    if (childrenMap.size > 0) {
      setSubTasks(prev => {
        const newSubTasks = new Map(prev);
        childrenMap.forEach((children, parentId) => {
          newSubTasks.set(parentId, children);
        });
        return newSubTasks;
      });
    }
  }
}, [effectiveProjectId, tasks]);
    `);

    console.log('\n🎯 关键点：');
    console.log('- 预填充 subTasks 但不自动展开');
    console.log('- buildExpandedDataSource 依然只处理根任务');  
    console.log('- 用户点击展开时使用预填充的数据');
    console.log('- 保持项目模式的逻辑不变');

  } catch (error) {
    console.error('❌ 诊断失败:', error.message);
  }
}

diagnoseIssue();
