// 简单的前端时间线测试脚本
async function testTimelineAPI() {
    // 模拟前端发送的请求
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTgxOTUwNTUsIm5iZiI6MTc1NzU5MDI1NSwiaWF0IjoxNzU3NTkwMjU1LCJqdGkiOiJkM2RhOTYyMzg5Y2Q1YTllOWNiNzEyNGM5ZWZiMWRiOSJ9.t_1ZOwRr8fiq8ET0v76Ba2IFgfVGIrsKPGDw_uZ5L2U';
    
    try {
        console.log('发送API请求到: /api/v1/projects/1/tasks/1441/timeline');
        
        const response = await fetch('http://localhost:8080/api/v1/projects/1/tasks/1441/timeline', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('响应状态:', response.status);
        console.log('响应头:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const data = await response.json();
            console.log('响应数据:', JSON.stringify(data, null, 2));
            
            const events = data.data?.events || [];
            console.log('✅ 找到时间线事件数量:', events.length);
            
            events.forEach((event, index) => {
                console.log(`事件 ${index + 1}:`, {
                    id: event.id,
                    type: event.event_type,
                    date: event.event_date,
                    description: event.description,
                    username: event.username
                });
            });
            
        } else {
            console.error('❌ API请求失败:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('错误详情:', errorText);
        }
        
    } catch (error) {
        console.error('❌ 请求异常:', error);
    }
}

// 执行测试
testTimelineAPI();