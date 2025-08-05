const axios = require('axios');

const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

async function analyzeTaskHierarchy() {
  try {
    console.log('🔍 正在分析项目1中的任务层级结构...\n');
    
    const response = await axios.get(`${apiBase}/projects/1/tasks`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      proxy: false
    });
    
    const tasks = response.data.data?.data || [];
    console.log(`📊 项目1总任务数量: ${tasks.length}\n`);
    
    // 1. 分析层级结构
    const rootTasks = tasks.filter(t => !t.parent_id);
    const childTasks = tasks.filter(t => t.parent_id);
    
    console.log('🌳 层级结构概览:');
    console.log('================');
    console.log(`根任务（第1层）: ${rootTasks.length} 个`);
    console.log(`子任务（第2层及以下）: ${childTasks.length} 个\n`);
    
    // 2. 找到有子任务的父任务
    const parentsWithChildren = new Map();
    childTasks.forEach(child => {
      const parentId = child.parent_id;
      if (!parentsWithChildren.has(parentId)) {
        parentsWithChildren.set(parentId, []);
      }
      parentsWithChildren.get(parentId).push(child);
    });
    
    console.log('👥 父子关系详情:');
    console.log('================');
    
    // 3. 显示每个有子任务的父任务
    for (const [parentId, children] of parentsWithChildren.entries()) {
      const parent = tasks.find(t => t.id === parentId);
      if (parent) {
        console.log(`\n📋 父任务 ${parent.id}: "${parent.title}"`);
        console.log(`   状态: ${parent.status} | 创建时间: ${new Date(parent.created_at).toLocaleString()}`);
        console.log(`   子任务数量: ${children.length}`);
        
        children.forEach((child, index) => {
          const childrenOfChild = tasks.filter(t => t.parent_id === child.id);
          const hasGrandchildren = childrenOfChild.length > 0;
          
          console.log(`   ${index + 1}. 子任务 ${child.id}: "${child.title}" [${child.status}]${hasGrandchildren ? ` (有${childrenOfChild.length}个子任务)` : ''}`);
          
          // 显示第三层子任务
          if (hasGrandchildren) {
            childrenOfChild.forEach((grandchild, gcIndex) => {
              console.log(`      ${gcIndex + 1}. 孙任务 ${grandchild.id}: "${grandchild.title}" [${grandchild.status}]`);
            });
          }
        });
      }
    }
    
    // 4. 推荐适合测试批量更改父任务功能的任务组
    console.log('\n\n🎯 批量更改父任务功能测试建议:');
    console.log('==============================');
    
    const goodTestCandidates = [];
    for (const [parentId, children] of parentsWithChildren.entries()) {
      if (children.length >= 2) { // 至少有2个子任务
        const parent = tasks.find(t => t.id === parentId);
        goodTestCandidates.push({
          parent,
          children,
          childCount: children.length
        });
      }
    }
    
    // 按子任务数量排序
    goodTestCandidates.sort((a, b) => b.childCount - a.childCount);
    
    goodTestCandidates.forEach((candidate, index) => {
      console.log(`\n✅ 推荐测试组 ${index + 1}:`);
      console.log(`   父任务: ${candidate.parent.id} - "${candidate.parent.title}"`);
      console.log(`   包含 ${candidate.childCount} 个子任务:`);
      
      candidate.children.forEach(child => {
        console.log(`   - ${child.id}: "${child.title}" [${child.status}]`);
      });
      
      console.log(`   💡 测试说明: 可以选择其中的 2-3 个子任务，批量将它们移动到另一个父任务下`);
    });
    
    // 5. 层级深度统计
    console.log('\n\n📈 层级深度详细统计:');
    console.log('==================');
    
    const depthAnalysis = {
      level1: rootTasks.length,
      level2: 0,
      level3: 0,
      maxDepth: 1
    };
    
    tasks.forEach(task => {
      if (task.parent_id) {
        const parent = tasks.find(t => t.id === task.parent_id);
        if (parent && !parent.parent_id) {
          depthAnalysis.level2++;
          depthAnalysis.maxDepth = Math.max(depthAnalysis.maxDepth, 2);
        } else if (parent && parent.parent_id) {
          depthAnalysis.level3++;
          depthAnalysis.maxDepth = Math.max(depthAnalysis.maxDepth, 3);
        }
      }
    });
    
    console.log(`第1层（根任务）: ${depthAnalysis.level1} 个`);
    console.log(`第2层（子任务）: ${depthAnalysis.level2} 个`);
    console.log(`第3层（孙任务）: ${depthAnalysis.level3} 个`);
    console.log(`最大层级深度: ${depthAnalysis.maxDepth} 层`);
    
    console.log(`\n✨ 总结: 项目具有${depthAnalysis.maxDepth}层任务结构，有${parentsWithChildren.size}个父任务，非常适合测试批量更改父任务功能！`);
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
    if (error.response?.data) {
      console.error('API响应:', error.response.data);
    }
  }
}

analyzeTaskHierarchy();