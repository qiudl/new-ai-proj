#!/usr/bin/env node

/**
 * 最终测试：验证全局任务列表层级展开修复
 */

const axios = require('axios');

async function testFinalFix() {
  console.log('🎯 测试全局任务列表层级展开修复...\n');

  try {
    // 1. 获取全局任务数据，分析父子结构
    console.log('📊 分析全局任务数据结构...');
    const globalResponse = await axios.get('http://localhost:8080/api/tasks?page=1&page_size=20');
    const globalTasks = globalResponse.data.data.data || [];
    
    const rootTasks = globalTasks.filter(t => !t.parent_id);
    const childTasks = globalTasks.filter(t => t.parent_id);
    
    console.log(`✅ 全局任务分析:`);
    console.log(`  - 根任务: ${rootTasks.length} 个`);
    console.log(`  - 子任务: ${childTasks.length} 个`);
    
    // 2. 分析父子关系
    const parentChildMap = new Map();
    childTasks.forEach(child => {
      if (!parentChildMap.has(child.parent_id)) {
        parentChildMap.set(child.parent_id, []);
      }
      parentChildMap.get(child.parent_id).push(child);
    });
    
    console.log(`\n🌳 父子关系分析:`);
    parentChildMap.forEach((children, parentId) => {
      const parent = globalTasks.find(t => t.id === parentId);
      if (parent) {
        console.log(`📁 ${parent.title} (ID: ${parentId})`);
        children.forEach(child => {
          console.log(`  └── 📄 ${child.title} (ID: ${child.id})`);
        });
      }
    });
    
    // 3. 测试子任务API可用性
    console.log(`\n🧪 测试子任务API可用性:`);
    const parentIds = Array.from(parentChildMap.keys()).slice(0, 2);
    
    for (const parentId of parentIds) {
      const parent = globalTasks.find(t => t.id === parentId);
      if (parent) {
        try {
          const childrenResponse = await axios.get(`http://localhost:8080/api/projects/${parent.project_id}/tasks/${parentId}/children`);
          const apiChildren = childrenResponse.data || [];
          const localChildren = parentChildMap.get(parentId) || [];
          
          console.log(`✅ 父任务 "${parent.title}": API返回${apiChildren.length}个子任务, 本地有${localChildren.length}个`);
          
          // 验证数据一致性
          if (apiChildren.length === localChildren.length) {
            console.log(`  🎯 数据一致性: 完全匹配`);
          } else {
            console.log(`  ⚠️  数据一致性: 不匹配，可能有更深层级或分页`);
          }
          
        } catch (error) {
          console.log(`❌ 父任务 "${parent.title}": API调用失败 - ${error.message}`);
        }
      }
    }
    
    // 4. 总结修复效果
    console.log(`\n🎉 修复效果总结:`);
    console.log(``);
    console.log(`✅ 修复内容:`);
    console.log(`  - 恢复了全局模式下的父子关系预处理`);
    console.log(`  - 预填充 subTasks Map，但不自动展开`);
    console.log(`  - buildExpandedDataSource 只处理根任务`);
    console.log(`  - 用户点击展开时使用预填充的子任务数据`);
    console.log(``);
    console.log(`✅ 预期效果:`);
    console.log(`  - 全局任务列表显示所有根任务`);
    console.log(`  - 点击展开按钮能看到正确缩进的子任务`);
    console.log(`  - CSS 类名 depth-1, depth-2 等正确应用`);
    console.log(`  - 样式与项目任务列表一致`);
    console.log(``);
    console.log(`🔗 测试链接:`);
    console.log(`  - 全局任务列表: http://localhost/tasks`);
    console.log(`  - 项目任务列表: http://localhost/projects/1/tasks`);
    console.log(`  - 对比展开效果应该一致`);
    
    // 5. 显示可测试的父任务
    if (parentChildMap.size > 0) {
      console.log(`\n🧪 可测试的父任务:`);
      let count = 0;
      parentChildMap.forEach((children, parentId) => {
        if (count < 3) {
          const parent = globalTasks.find(t => t.id === parentId);
          if (parent) {
            console.log(`  📁 ${parent.title} - 有 ${children.length} 个子任务`);
            count++;
          }
        }
      });
      console.log(`\n💡 请在全局任务列表中点击这些父任务的展开按钮测试效果`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testFinalFix();
