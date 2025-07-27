// 测试企业更新API的修复情况
// 可以在浏览器控制台中运行这个脚本

const testCompanyUpdate = async () => {
  try {
    console.log('🧪 开始测试企业更新API...');
    
    // 模拟前端发送的数据（修复后的格式）
    const testData = {
      company_name: "测试企业",
      company_type: "limited_company",
      status: "active",
      priority: "medium",
      start_date: new Date().toISOString(), // 使用 ISO 格式
      employee_count: 100,
      main_email: "test@example.com",
      website: "https://example.com"
    };
    
    console.log('📤 发送数据:', testData);
    
    // 获取 token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ 未找到认证 token');
      return;
    }
    
    // 发送请求到一个存在的企业ID（假设ID为1存在）
    const response = await fetch('/api/v1/companies/1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 响应状态:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 更新成功!', result);
    } else {
      const error = await response.text();
      console.error('❌ 更新失败:', error);
      
      // 尝试解析错误信息
      try {
        const errorJson = JSON.parse(error);
        console.error('错误详情:', errorJson);
      } catch (e) {
        console.error('原始错误文本:', error);
      }
    }
    
  } catch (error) {
    console.error('🚨 测试过程中发生异常:', error);
  }
};

// 运行测试
console.log('使用方法：在浏览器控制台运行 testCompanyUpdate()');
console.log('或者直接运行测试：');
testCompanyUpdate();