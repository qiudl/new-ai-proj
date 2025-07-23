#!/usr/bin/env node
/**
 * 检查项目列表页客户名称显示问题
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080/api/v1';

// 使用有效token
const VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozNCwidXNlcm5hbWUiOiJxaXVkbCIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsInN1YiI6InFpdWRsIiwiZXhwIjoxNzUzMzEyNDc5LCJuYmYiOjE3NTMyMjYwNzksImlhdCI6MTc1MzIyNjA3OX0.CPn3UItxNvvkMrbxXFnjcMlK9ybJ--x8Grk_wFIrS2Q';

axios.defaults.headers.common['Authorization'] = `Bearer ${VALID_TOKEN}`;

async function checkProjectListCustomerNames() {
  console.log('🔍 检查项目列表页客户名称显示问题...\n');

  try {
    // 1. 获取项目列表
    console.log('1️⃣ 获取项目列表...');
    const projectsResponse = await axios.get(`${API_BASE}/projects`);
    console.log(`✅ 项目列表获取成功，状态码: ${projectsResponse.status}`);
    console.log(`📊 项目数量: ${projectsResponse.data.data?.data?.length || 0}`);

    // 2. 检查项目列表中的客户信息
    if (projectsResponse.data.data?.data?.length > 0) {
      console.log('\n2️⃣ 分析项目列表中的客户信息...');
      
      const projects = projectsResponse.data.data.data;
      console.log('\n📋 项目列表中的客户信息:');
      
      projects.forEach((project, index) => {
        console.log(`\n项目 ${index + 1}:`);
        console.log(`  ID: ${project.id}`);
        console.log(`  名称: ${project.name}`);
        console.log(`  客户ID: ${project.company_id || '无'}`);
        console.log(`  客户名称: ${project.company_name || project.customer_name || '❌ 缺失'}`);
        console.log(`  所有字段:`, Object.keys(project));
      });

      // 3. 获取客户列表进行对比
      console.log('\n3️⃣ 获取客户列表进行对比...');
      try {
        const customersResponse = await axios.get(`${API_BASE}/customers`);
        if (customersResponse.data.data?.data) {
          console.log('\n📋 客户列表:');
          customersResponse.data.data.data.forEach(customer => {
            console.log(`  ID: ${customer.id}, 名称: ${customer.companyName || customer.name}`);
          });
        }
      } catch (error) {
        console.log('⚠️ 获取客户列表失败，尝试公司列表...');
        
        try {
          const companiesResponse = await axios.get(`${API_BASE}/companies`);
          if (companiesResponse.data.data?.data) {
            console.log('\n📋 公司列表:');
            companiesResponse.data.data.data.forEach(company => {
              console.log(`  ID: ${company.id}, 名称: ${company.companyName || company.name}`);
            });
          }
        } catch (companyError) {
          console.log('❌ 获取公司列表也失败');
        }
      }

      // 4. 检查单个项目详情的客户信息
      const firstProject = projects[0];
      if (firstProject.company_id) {
        console.log(`\n4️⃣ 检查单个项目详情的客户信息 (项目ID: ${firstProject.id})...`);
        
        const projectDetailResponse = await axios.get(`${API_BASE}/projects/${firstProject.id}`);
        const projectDetail = projectDetailResponse.data.data;
        
        console.log('\n📋 项目详情中的客户信息:');
        console.log(`  客户ID: ${projectDetail.company_id || '无'}`);
        console.log(`  客户名称: ${projectDetail.company_name || projectDetail.customer_name || '❌ 缺失'}`);
        console.log(`  所有字段:`, Object.keys(projectDetail));
      }

    } else {
      console.log('\n⚠️ 没有找到项目');
    }

    // 5. 问题分析和建议
    console.log('\n📊 问题分析:');
    console.log('✅ 检查完成');
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    
    if (error.response) {
      console.error('HTTP状态码:', error.response.status);
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkProjectListCustomerNames();
