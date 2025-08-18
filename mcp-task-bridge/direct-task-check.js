import axios from 'axios';

const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTYwOTgwMDUsImlhdCI6MTc1NTQ5MzIwNSwibmJmIjoxNzU1NDkzMjA1LCJyb2xlIjoiYWRtaW4iLCJzdWIiOiJhZG1pbiIsInVzZXJfaWQiOjEsInVzZXJfdHlwZSI6InN5c3RlbSIsInVzZXJuYW1lIjoiYWRtaW4ifQ.Lguj_VFqr_2vGG_L2gUM_dsmnezCYFzdZ0Loudx6vcg';

async function directTaskCheck() {
  console.log('🔍 直接检查项目1中的任务...\n');

  try {
    const response = await axios.get('http://localhost:8081/api/v1/projects/1/tasks?page_size=1000', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      proxy: false
    });

    const tasks = response.data.data?.data || [];
    console.log(`找到 ${tasks.length} 个任务\n`);

    // 找到任务200和203
    const task200 = tasks.find(t => t.id === 200);
    const task203 = tasks.find(t => t.id === 203);
    const childrenOf200 = tasks.filter(t => t.parent_id === 200);

    console.log('📋 任务200:');
    if (task200) {
      console.log(`   ID: ${task200.id}`);
      console.log(`   标题: ${task200.title}`);
      console.log(`   parent_id: ${task200.parent_id}`);
      console.log(`   has_children: ${task200.has_children}`);
      console.log(`   children_count: ${task200.children_count}`);
    } else {
      console.log('   未找到任务200');
    }

    console.log('\n📋 任务203:');
    if (task203) {
      console.log(`   ID: ${task203.id}`);
      console.log(`   标题: ${task203.title}`);
      console.log(`   parent_id: ${task203.parent_id}`);
      console.log(`   task_level: ${task203.task_level}`);
    } else {
      console.log('   未找到任务203');
    }

    console.log('\n📋 任务200的子任务:');
    if (childrenOf200.length > 0) {
      childrenOf200.forEach(child => {
        console.log(`   - ID: ${child.id}, 标题: ${child.title}, parent_id: ${child.parent_id}`);
      });
    } else {
      console.log('   没有找到任务200的子任务');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    if (error.response) {
      console.error('错误响应:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

directTaskCheck();