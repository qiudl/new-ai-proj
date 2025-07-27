const axios = require('axios');

async function debugCompanyUpdate() {
  const baseURL = 'http://localhost:8080/api/v1';
  
  console.log('🔍 详细调试企业更新问题...\n');
  
  try {
    // 1. 登录获取token
    console.log('1. 登录...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'qiudl',
      password: '123456'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功');
    
    // 2. 获取企业详情
    console.log('\n2. 获取企业详情...');
    const companyResponse = await axios.get(`${baseURL}/companies/1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const company = companyResponse.data.data;
    console.log('✅ 获取成功');
    console.log('原始企业数据:');
    console.log(JSON.stringify(company, null, 2));
    
    // 3. 尝试不同的更新策略
    console.log('\n3. 测试不同的更新策略...\n');
    
    // 策略1: 只发送变化的字段
    console.log('策略1: 只发送变化的字段...');
    try {
      const updateData1 = {
        industry: (company.industry || '原行业') + ' - 测试更新'
      };
      
      console.log('发送数据:', JSON.stringify(updateData1, null, 2));
      
      const response1 = await axios.put(`${baseURL}/companies/1`, updateData1, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ 策略1成功');
      
    } catch (error) {
      console.log('❌ 策略1失败:', error.response?.data || error.message);
    }
    
    // 策略2: 发送完整数据但保持名称不变
    console.log('\n策略2: 发送完整数据但保持名称不变...');
    try {
      const updateData2 = {
        companyName: company.companyName, // 保持原名称
        companyType: company.companyType,
        status: company.status,
        priority: company.priority,
        industry: company.industry
      };
      
      console.log('发送数据:', JSON.stringify(updateData2, null, 2));
      
      const response2 = await axios.put(`${baseURL}/companies/1`, updateData2, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ 策略2成功');
      
    } catch (error) {
      console.log('❌ 策略2失败:', error.response?.data || error.message);
    }
    
    // 策略3: 完全模拟前端发送的数据
    console.log('\n策略3: 模拟前端CompanyForm发送的数据...');
    try {
      // 模拟前端表单数据 (来自CompanyForm组件)
      const updateData3 = {
        company_name: company.companyName,  // 后端期望的snake_case
        company_code: company.companyCode,
        industry: company.industry,
        company_type: company.companyType,
        business_license: company.businessLicense,
        tax_number: company.taxNumber,
        legal_representative: company.legalRepresentative,
        address: company.address,
        city: company.city,
        province: company.province,
        postal_code: company.postalCode,
        website: company.website,
        main_phone: company.mainPhone,
        main_email: company.mainEmail,
        status: company.status,
        priority: company.priority,
        annual_contract_value: company.annualContractValue,
        start_date: company.startDate,
        employee_count: company.employeeCount,
        company_size: company.companySize
      };
      
      console.log('发送数据 (snake_case):', JSON.stringify(updateData3, null, 2));
      
      const response3 = await axios.put(`${baseURL}/companies/1`, updateData3, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ 策略3成功');
      
    } catch (error) {
      console.log('❌ 策略3失败:', error.response?.data || error.message);
    }
    
    // 策略4: 检查其他企业是否有相同名称
    console.log('\n策略4: 检查企业名称冲突...');
    try {
      const companiesResponse = await axios.get(`${baseURL}/companies?search=${encodeURIComponent(company.companyName)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const searchResults = companiesResponse.data.data.data;
      console.log(`找到 ${searchResults.length} 个匹配的企业:`);
      searchResults.forEach(c => {
        console.log(`- ID: ${c.id}, 名称: ${c.companyName} ${c.id === company.id ? '(当前企业)' : ''}`);
      });
      
      if (searchResults.length > 1) {
        console.log('🚨 发现名称冲突！这可能是问题的根源。');
      }
      
    } catch (error) {
      console.log('❌ 策略4失败:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error.message);
  }
}

debugCompanyUpdate().catch(console.error);
