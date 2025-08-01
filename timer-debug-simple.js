const axios = require('axios');

// 调试个人计时功能的403错误
async function debugTimerAPI() {
  const baseURL = 'http://localhost';
  
  console.log('=== 个人计时功能403错误调试 ===\n');
  
  try {
    // 1. 先尝试登录获取token
    console.log('1. 尝试登录获取token...');
    const loginResponse = await axios.post(`${baseURL}/api/v1/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✓ 登录成功，获得token:', token.substring(0, 20) + '...');
    
    // 2. 配置认证header
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 3. 获取用户信息
    console.log('\n2. 获取当前用户信息...');
    const userResponse = await axios.get(`${baseURL}/api/v1/users/profile`, {
      headers: authHeaders
    });
    console.log('✓ 用户信息:', {
      id: userResponse.data.data.id,
      username: userResponse.data.data.username,
      role: userResponse.data.data.role
    });
    
    // 4. 获取个人计时任务列表
    console.log('\n3. 获取个人计时任务列表...');
    const tasksResponse = await axios.get(`${baseURL}/api/v1/user/timer-tasks`, {
      headers: authHeaders
    });
    console.log('✓ 个人计时任务数量:', tasksResponse.data.tasks.length);
    
    if (tasksResponse.data.tasks.length > 0) {
      const firstTask = tasksResponse.data.tasks[0];
      console.log('首个任务:', {
        id: firstTask.id,
        title: firstTask.title,
        user_id: firstTask.user_id
      });
      
      // 5. 尝试开始个人计时
      console.log('\n4. 尝试开始个人计时...');
      try {
        const startTimerResponse = await axios.post(
          `${baseURL}/api/v1/user/timer/start-personal`,
          {
            task_id: firstTask.id,
            auto_stop_others: true
          },
          { headers: authHeaders }
        );
        console.log('✓ 计时开始成功:', startTimerResponse.data);
      } catch (timerError) {
        console.log('✗ 计时开始失败:');
        if (timerError.response) {
          console.log('状态码:', timerError.response.status);
          console.log('错误信息:', timerError.response.data);
          
          // 如果是403错误，检查用户权限
          if (timerError.response.status === 403) {
            console.log('\n=== 403权限错误分析 ===');
            console.log('任务所有者用户ID:', firstTask.user_id);
            console.log('当前登录用户ID:', userResponse.data.data.id);
            console.log('权限匹配:', firstTask.user_id === userResponse.data.data.id ? '✓' : '✗');
            
            // 如果权限不匹配，尝试使用任务所有者的token
            if (firstTask.user_id !== userResponse.data.data.id) {
              console.log('\n=== 权限不匹配，建议解决方案 ===');
              console.log('1. 创建新的个人计时任务');
              console.log('2. 或者使用正确的用户登录');
            }
          }
        } else {
          console.log('网络错误或其他问题:', timerError.message);
        }
      }
    } else {
      console.log('✗ 没有找到个人计时任务，尝试创建新任务...');
      
      // 创建新的个人计时任务
      try {
        const createTaskResponse = await axios.post(
          `${baseURL}/api/v1/user/timer-tasks`,
          {
            title: '测试个人计时任务',
            category: 'work',
            color: '#1890ff'
          },
          { headers: authHeaders }
        );
        console.log('✓ 创建任务成功:', createTaskResponse.data);
        
        // 再次尝试开始计时
        console.log('\n5. 使用新创建的任务开始计时...');
        const startTimerResponse = await axios.post(
          `${baseURL}/api/v1/user/timer/start-personal`,
          {
            task_id: createTaskResponse.data.id,
            auto_stop_others: true
          },
          { headers: authHeaders }
        );
        console.log('✓ 计时开始成功:', startTimerResponse.data);
      } catch (createError) {
        console.log('✗ 创建任务失败:', createError.response?.data || createError.message);
      }
    }
    
  } catch (error) {
    console.log('✗ 调试过程中出现错误:');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else {
      console.log('网络错误:', error.message);
    }
  }
}

// 运行调试脚本
debugTimerAPI().catch(console.error);