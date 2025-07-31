// 测试Timer API的简单脚本
// 在浏览器控制台中运行

async function testTimerAPI() {
  try {
    console.log('Testing Timer API...');
    
    // 获取当前token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found in localStorage');
      return;
    }
    
    console.log('Token found:', token.substring(0, 20) + '...');
    
    // 调用Timer Stats API
    const response = await fetch('/api/timer/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('API Response Data:', data);
    
    // 检查recent_tasks
    if (data.recent_tasks) {
      console.log('Recent tasks count:', data.recent_tasks.length);
      if (data.recent_tasks.length > 0) {
        console.log('First task:', data.recent_tasks[0]);
      }
    } else {
      console.log('No recent_tasks in response');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// 运行测试
testTimerAPI();