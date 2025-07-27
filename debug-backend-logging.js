const axios = require('axios');

async function testBackendLogging() {
  const baseURL = 'http://localhost:8080/api/v1';
  
  console.log('🔍 测试后端日志和数据处理...\n');
  
  try {
    // 登录
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'qiudl',
      password: '123456'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功');
    
    // 获取企业详情
    const companyResponse = await axios.get(`${baseURL}/companies/1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const company = companyResponse.data.data;
    console.log('原始企业名称:', company.companyName);
    
    // 测试1: 发送最小数据
    console.log('\n测试1: 发送最小更新数据...');
    try {
      const response = await axios.put(`${baseURL}/companies/1`, {
        company_name: company.companyName  // 完全相同的名称
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ 测试1成功');
    } catch (error) {
      console.log('❌ 测试1失败:', error.response.data);
    }
    
    // 测试2: 发送空的更新数据
    console.log('\n测试2: 发送空数据...');
    try {
      const response = await axios.put(`${baseURL}/companies/1`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ 测试2成功');
    } catch (error) {
      console.log('❌ 测试2失败:', error.response.data);
    }
    
    // 测试3: 检查数据库中的实际企业名称
    console.log('\n测试3: 查询所有企业检查名称...');
    try {
      const allCompaniesResponse = await axios.get(`${baseURL}/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const companies = allCompaniesResponse.data.data.data;
      console.log('数据库中的所有企业:');
      companies.forEach(c => {
        console.log(`- ID: ${c.id}, 名称: "${c.companyName}"`);
        if (c.id === 1) {
          console.log(`  当前企业名称字符串长度: ${c.companyName.length}`);
          console.log(`  当前企业名称字符编码: ${Array.from(c.companyName).map(char => char.charCodeAt(0)).join(',')}`);
        }
      });
      
      // 检查是否有重复名称
      const nameCount = {};
      companies.forEach(c => {
        nameCount[c.companyName] = (nameCount[c.companyName] || 0) + 1;
      });
      
      console.log('\n名称统计:');
      Object.entries(nameCount).forEach(([name, count]) => {
        if (count > 1) {
          console.log(`🚨 重复名称: "${name}" (${count}次)`);
        } else {
          console.log(`✅ 唯一名称: "${name}"`);
        }
      });
      
    } catch (error) {
      console.log('❌ 测试3失败:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ 整体测试失败:', error.message);
  }
}

testBackendLogging().catch(console.error);
