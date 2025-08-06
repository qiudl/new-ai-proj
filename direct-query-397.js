import axios from 'axios';

async function directQueryTask397() {
  const apiBase = 'http://localhost:8080/api/v1';
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
  
  try {
    console.log('🔍 直接查询API获取项目1的所有任务...\n');
    
    // 1. 获取项目1的任务列表
    const response = await axios.get(`${apiBase}/projects/1/tasks`, {
      headers: headers,
      proxy: false
    });
    
    const tasks = response.data.data?.data || [];
    console.log(`📊 项目1共有 ${tasks.length} 个任务`);
    
    // 2. 查找任务397
    const task397 = tasks.find(t => t.id === 397);
    
    if (task397) {
      console.log('\n✅ 找到任务397!');
      console.log('📋 基本信息:');
      console.log(`   ID: ${task397.id}`);
      console.log(`   标题: ${task397.title}`);
      console.log(`   状态: ${task397.status}`);
      console.log(`   项目ID: ${task397.project_id}`);
      console.log(`   父任务ID: ${task397.parent_id || '无(根任务)'}`);
      console.log(`   创建时间: ${task397.created_at}`);
      console.log(`   更新时间: ${task397.updated_at}`);
      console.log(`   优先级: ${task397.custom_fields?.priority || '未设置'}`);
      if (task397.description) {
        console.log(`   描述: ${task397.description.substring(0, 200)}...`);
      }
      console.log('');
      
      // 3. 查找任务397的子任务
      console.log('🌳 查找任务397的子任务...');
      const childrenOf397 = tasks.filter(t => t.parent_id === 397);
      
      console.log(`✅ 找到 ${childrenOf397.length} 个子任务:\n`);
      
      if (childrenOf397.length > 0) {
        childrenOf397.forEach((child, index) => {
          console.log(`${index + 1}. 任务${child.id}: ${child.title}`);
          console.log(`   状态: ${child.status} | 优先级: ${child.custom_fields?.priority || '未设置'}`);
          console.log(`   创建时间: ${child.created_at}`);
          if (child.description) {
            console.log(`   描述: ${child.description.substring(0, 100)}...`);
          }
          console.log('');
        });
        
        // 4. 分析子任务状态
        const statusCounts = {};
        childrenOf397.forEach(child => {
          statusCounts[child.status] = (statusCounts[child.status] || 0) + 1;
        });
        
        console.log('📊 子任务状态统计:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          const percentage = Math.round((count / childrenOf397.length) * 100);
          console.log(`   ${status}: ${count}个 (${percentage}%)`);
        });
        console.log('');
        
        // 5. 识别未完成的子任务
        const incompleteTasks = childrenOf397.filter(child => 
          !['completed'].includes(child.status)
        );
        
        if (incompleteTasks.length > 0) {
          console.log(`⚠️ 未完成的子任务 (${incompleteTasks.length}个):`);
          incompleteTasks.forEach((task, idx) => {
            console.log(`   ${idx + 1}. 任务${task.id}: ${task.title} (${task.status})`);
          });
          console.log('');
          
          console.log('💡 建议下一步操作:');
          console.log('   1. 优先完成状态为 "todo" 的任务');
          console.log('   2. 检查是否需要创建额外的优化子任务');
          console.log('   3. 更新任务优先级和时间安排');
        } else {
          console.log('✅ 所有子任务都已完成！');
          console.log('💡 可以考虑:');
          console.log('   1. 创建新的系统优化子任务');
          console.log('   2. 进行综合测试和验证');
          console.log('   3. 总结优化成果并归档');
        }
        
        // 6. 检查是否有深层子任务（孙任务）
        console.log('\n🔍 检查深层任务结构...');
        let hasGrandChildren = false;
        
        for (const child of childrenOf397) {
          const grandChildren = tasks.filter(t => t.parent_id === child.id);
          if (grandChildren.length > 0) {
            hasGrandChildren = true;
            console.log(`📋 任务${child.id}的子任务 (${grandChildren.length}个):`);
            grandChildren.forEach((grandChild, gIdx) => {
              console.log(`   ${gIdx + 1}. 任务${grandChild.id}: ${grandChild.title} (${grandChild.status})`);
            });
            console.log('');
          }
        }
        
        if (!hasGrandChildren) {
          console.log('ℹ️ 没有发现更深层的子任务');
        }
        
      } else {
        console.log('ℹ️ 任务397暂无子任务');
      }
      
    } else {
      console.log('❌ 任务397不在任务列表中');
      
      // 检查是否有其他32周相关的任务
      console.log('\n🔍 搜索32周相关任务...');
      const week32Keywords = ['32周', '32', 'week32', '系统优化', '优化', 'Bug修复'];
      
      const week32Tasks = tasks.filter(task => {
        const title = task.title.toLowerCase();
        return week32Keywords.some(keyword => 
          title.includes(keyword.toLowerCase())
        );
      });
      
      if (week32Tasks.length > 0) {
        console.log(`✅ 找到 ${week32Tasks.length} 个32周相关任务:`);
        week32Tasks.forEach((task, idx) => {
          console.log(`${idx + 1}. 任务${task.id}: ${task.title} (${task.status})`);
          console.log(`   父任务ID: ${task.parent_id || '无(根任务)'}`);
        });
      } else {
        console.log('❌ 未找到32周相关任务');
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

directQueryTask397();