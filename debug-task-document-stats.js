// 在浏览器控制台执行这个脚本来调试统计数据

console.log('=== 任务文档统计调试 ===');

// 等待页面加载
setTimeout(() => {
  // 检查是否在正确的页面
  if (!window.location.pathname.includes('task-documents')) {
    console.log('请先访问 /task-documents 页面');
    return;
  }

  // 查找统计卡片
  const cards = document.querySelectorAll('.ant-card');
  console.log(`找到 ${cards.length} 个卡片`);

  // 提取统计数据
  cards.forEach((card, index) => {
    const numberElement = card.querySelector('div[style*="fontSize: 24"]') || 
                         card.querySelector('div[style*="font-size: 24"]');
    const labelElement = card.querySelector('div[style*="color: #666"]');
    
    if (numberElement && labelElement) {
      const number = numberElement.textContent;
      const label = labelElement.textContent;
      console.log(`卡片 ${index + 1}: ${label} = ${number}`);
    }
  });

  // 检查React组件状态
  const reactContainer = document.querySelector('#root');
  if (reactContainer && reactContainer._reactInternalFiber) {
    console.log('React组件已加载');
  }

  // 尝试查找任务数据
  const taskRows = document.querySelectorAll('.ant-table-tbody tr');
  console.log(`表格中有 ${taskRows.length} 行任务`);

  // 检查文档状态
  let withDoc = 0, withoutDoc = 0;
  taskRows.forEach(row => {
    const statusCell = row.querySelector('td:nth-child(3)'); // 文档状态列
    if (statusCell) {
      const statusText = statusCell.textContent;
      if (statusText.includes('有文档')) {
        withDoc++;
      } else if (statusText.includes('无文档')) {
        withoutDoc++;
      }
    }
  });

  console.log('=== 表格统计结果 ===');
  console.log(`总任务: ${taskRows.length}`);
  console.log(`有文档: ${withDoc}`);
  console.log(`无文档: ${withoutDoc}`);

}, 2000);