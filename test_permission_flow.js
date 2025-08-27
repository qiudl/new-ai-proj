// 测试前端权限检查流程
const axios = require('axios');

async function testPermissionFlow() {
  console.log('🔍 测试前端权限检查流程...\n');
  
  try {
    // 1. 登录获取token
    console.log('1. 登录获取token...');
    const loginResponse = await axios.post('http://localhost:8081/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ 获取到token:', token.substring(0, 50) + '...');
    
    // 2. 解析token载荷（模拟前端逻辑）
    console.log('\n2. 解析token载荷...');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('✅ Token载荷:', payload);
    
    // 3. 检查开发环境回退逻辑
    console.log('\n3. 检查开发环境回退逻辑...');
    if (payload && payload.role === 'admin') {
      console.log('✅ 开发环境，admin用户，应该允许访问');
    }
    
    // 4. 测试权限检查API（模拟前端权限服务）
    console.log('\n4. 测试权限检查API...');
    
    // 测试不同的权限代码格式
    const permissionCodes = [
      'user_create',    // 下划线格式
      'user.create',    // 点格式
      'USER_CREATE'     // 大写格式
    ];
    
    for (const permCode of permissionCodes) {
      try {
        const permResponse = await axios.post('http://localhost:8081/api/v1/permissions/check', 
          { permissionCode: permCode },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        console.log(`✅ ${permCode}:`, permResponse.data.result.has_permission);
      } catch (error) {
        console.log(`❌ ${permCode}: 检查失败 -`, error.response?.data || error.message);
      }
    }
    
    // 5. 测试前端API代理
    console.log('\n5. 测试前端API代理...');
    try {
      const proxyResponse = await axios.post('http://localhost:3001/api/v1/permissions/check',
        { permissionCode: 'user_create' },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      console.log('✅ 前端代理正常:', proxyResponse.data.result.has_permission);
    } catch (error) {
      console.log('❌ 前端代理失败:', error.response?.status, error.response?.statusText);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error.response?.data || error.message);
  }
}

// 检查axios是否可用
try {
  require.resolve('axios');
  testPermissionFlow();
} catch (e) {
  console.log('请先安装axios: npm install axios');
  
  // 提供curl版本的测试
  console.log('\n或者使用curl测试:');
  console.log('1. 获取token:');
  console.log('TOKEN=$(curl -s -X POST http://localhost:8081/api/v1/auth/login -H "Content-Type: application/json" -d \'{"username": "admin", "password": "admin123"}\' | jq -r \'.data.token\')');
  console.log('\n2. 测试权限:');
  console.log('curl -s -X POST http://localhost:8081/api/v1/permissions/check -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d \'{"permissionCode": "user_create"}\'');
}
