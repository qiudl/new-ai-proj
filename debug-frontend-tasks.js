// 在浏览器控制台执行这个脚本来调试前端任务加载

console.log('=== 前端任务加载调试 ===');

// 检查localStorage中的token
const token = localStorage.getItem('token');
console.log('Token存在:', !!token);

// 模拟前端API调用
async function debugTaskLoading() {
  try {
    // 1. 测试项目API
    console.log('1. 测试项目列表API...');
    const projectsResponse = await fetch('/api/v1/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const projectsData = await projectsResponse.json();
    console.log('项目API响应:', projectsData.success);
    console.log('项目数量:', projectsData.data.data.length);
    
    // 2. 测试每个项目的任务API
    for (const project of projectsData.data.data) {
      console.log(`\n2. 测试项目${project.id} (${project.name}) 的任务...`);
      
      try {
        const tasksResponse = await fetch(`/api/v1/projects/${project.id}/tasks?page_size=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`项目${project.id} - HTTP状态:`, tasksResponse.status);
        
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          console.log(`项目${project.id} - API成功:`, tasksData.success);
          console.log(`项目${project.id} - 任务数量:`, tasksData.data.data.length);
          console.log(`项目${project.id} - 分页总数:`, tasksData.data.pagination.total);
        } else {
          console.error(`项目${project.id} - API失败:`, tasksResponse.statusText);
        }
      } catch (error) {
        console.error(`项目${project.id} - 请求错误:`, error.message);
      }
    }
    
    // 3. 检查实际前端组件状态
    console.log('\n3. 检查前端组件状态...');
    const taskRows = document.querySelectorAll('.ant-table-tbody tr');
    console.log('表格显示的任务数:', taskRows.length);
    
    // 4. 检查统计卡片
    console.log('\n4. 检查统计卡片...');
    const statCards = document.querySelectorAll('.ant-card');
    statCards.forEach((card, index) => {
      const numberElement = card.querySelector('div[style*="fontSize: 24"]');
      const labelElement = card.querySelector('div[style*="color: #666"]');
      if (numberElement && labelElement) {
        console.log(`统计${index + 1}: ${labelElement.textContent} = ${numberElement.textContent}`);
      }
    });
    
  } catch (error) {
    console.error('调试过程出错:', error);
  }
}

// 等待页面加载后执行
if (document.readyState === 'complete') {
  debugTaskLoading();
} else {
  window.addEventListener('load', debugTaskLoading);
}