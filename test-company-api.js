#!/usr/bin/env node

const http = require('http');

// JWT Token for authentication
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoiYWRtaW4iLCJleHAiOjE3NTM2Mzc3NDAsImlhdCI6MTc1MzYzNDE0MCwibmJmIjoxNzUzNjM0MTQwLCJzdWIiOiJhZG1pbiJ9.qsqAth_OZSQxWW7Vseu5RUK8YJU-6LF-Iv0NdzdUo3o';

// 测试项目详情API
function testProjectAPI(projectId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: `/api/v1/projects/${projectId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

// 测试企业API
function testCompanyAPI(companyId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: `/api/v1/companies/${companyId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function runTest() {
  console.log('🧪 测试项目详情页企业信息API调用...\n');
  
  try {
    // 测试项目34 (有关联企业的项目)
    console.log('1. 测试项目API...');
    const projectResult = await testProjectAPI(34);
    console.log(`   状态码: ${projectResult.status}`);
    console.log(`   项目数据:`, JSON.stringify(projectResult.data, null, 2));
    
    if (projectResult.data && projectResult.data.data && projectResult.data.data.company_id) {
      console.log(`\n2. 测试企业API (ID: ${projectResult.data.data.company_id})...`);
      const companyResult = await testCompanyAPI(projectResult.data.data.company_id);
      console.log(`   状态码: ${companyResult.status}`);
      console.log(`   企业数据:`, JSON.stringify(companyResult.data, null, 2));
      
      if (companyResult.status !== 200) {
        console.log('\n❌ 企业API调用失败！这就是"获取企业信息失败"错误的原因');
      } else {
        console.log('\n✅ 企业API调用成功');
      }
    } else {
      console.log('\n⚠️  项目没有关联企业ID');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

runTest();