const axios = require('axios');

// 模拟测试企业编辑页面登录问题
async function testCompanyEditAuth() {
  const baseURL = 'http://localhost:8080/api/v1';
  
  console.log('🔍 开始调试企业编辑页面自动退出登录问题...\n');
  
  try {
    // 1. 测试登录获取token
    console.log('1. 测试登录...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'qiudl',
      password: '123456'
    });
    
    if (loginResponse.data && loginResponse.data.success && loginResponse.data.data.token) {
      const token = loginResponse.data.data.token;
      console.log('✅ 登录成功，获取到token:', token.substring(0, 20) + '...');
      
      // 2. 测试获取企业详情（正常应该成功）
      console.log('\n2. 测试获取企业详情...');
      const companyDetailResponse = await axios.get(`${baseURL}/companies/1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (companyDetailResponse.data && companyDetailResponse.data.success) {
        console.log('✅ 获取企业详情成功');
        const company = companyDetailResponse.data.data;
        console.log('企业名称:', company.companyName);
        
        // 3. 测试更新企业信息（这里可能出现问题）
        console.log('\n3. 测试更新企业信息...');
        const updateData = {
          companyName: company.companyName,
          companyType: company.companyType,
          status: company.status,
          priority: company.priority,
          // 只修改一个小字段来测试
          industry: company.industry || '测试行业'
        };
        
        const updateResponse = await axios.put(`${baseURL}/companies/1`, updateData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (updateResponse.data && updateResponse.data.success) {
          console.log('✅ 更新企业信息成功');
        } else {
          console.log('❌ 更新企业信息失败:', updateResponse.data);
        }
        
      } else {
        console.log('❌ 获取企业详情失败:', companyDetailResponse.data);
      }
      
    } else {
      console.log('❌ 登录失败:', loginResponse.data);
    }
    
  } catch (error) {
    console.error('❌ 请求出错:');
    
    if (error.response) {
      // 服务器返回了错误状态码
      console.log('状态码:', error.response.status);
      console.log('响应头:', error.response.headers);
      console.log('响应数据:', error.response.data);
      
      // 检查是否是401认证失败
      if (error.response.status === 401) {
        console.log('\n🚨 检测到401错误！这是导致自动退出登录的原因:');
        console.log('- 前端API拦截器检测到401状态码');
        console.log('- 自动清除localStorage中的token');
        console.log('- 重定向到登录页面');
        
        // 分析可能的原因
        console.log('\n可能的原因分析:');
        console.log('1. JWT token已过期');
        console.log('2. JWT token格式不正确');
        console.log('3. 后端JWT验证逻辑有问题');
        console.log('4. 企业更新接口权限校验失败');
      }
      
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.log('网络错误，没有收到响应');
      console.log('请检查后端服务是否正在运行');
    } else {
      // 其他错误
      console.log('错误信息:', error.message);
    }
  }
}

// 检查token有效性的函数
async function validateToken(token) {
  const baseURL = 'http://localhost:8080/api/v1';
  
  try {
    console.log('\n🔍 验证token有效性...');
    const response = await axios.get(`${baseURL}/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.success) {
      console.log('✅ Token有效');
      return true;
    } else {
      console.log('❌ Token无效:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Token验证失败:', error.response?.data || error.message);
    return false;
  }
}

// 主函数
async function main() {
  console.log('='.repeat(60));
  console.log('企业详情页编辑时自动退出登录问题调试工具');
  console.log('='.repeat(60));
  
  await testCompanyEditAuth();
  
  console.log('\n' + '='.repeat(60));
  console.log('调试完成');
  console.log('='.repeat(60));
}

// 运行测试
main().catch(console.error);
