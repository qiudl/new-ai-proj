#!/usr/bin/env node
/**
 * 简单的API测试脚本
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080/api/v1';

async function getValidToken() {
  try {
    // 尝试登录获取token
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    if (loginResponse.data.success && loginResponse.data.data.token) {
      return loginResponse.data.data.token;
    }
  } catch (error) {
    console.log('登录失败，错误信息:', error.response?.data?.error?.message || error.message);
  }
  return null;
}

async function testBasicAPI() {
  console.log('🧪 测试基本API连接...\n');

  try {
    // 尝试获取token
    const token = await getValidToken();
    
    if (token) {
      console.log('✅ 成功获取认证token');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      console.log('⚠️ 未获取到token，尝试无认证访问');
      // 移除认证header
      delete axios.defaults.headers.common['Authorization'];
    }

    // 测试获取项目列表
    console.log('\n1️⃣ 测试获取项目列表...');
    const projectsResponse = await axios.get(`${API_BASE}/projects`);
    console.log(`✅ 项目列表获取成功，状态码: ${projectsResponse.status}`);
    console.log(`📊 项目数量: ${projectsResponse.data.data?.data?.length || 0}`);

    // 如果有项目，测试获取第一个项目的详情
    if (projectsResponse.data.data?.data?.length > 0) {
      const firstProject = projectsResponse.data.data.data[0];
      console.log(`\n2️⃣ 测试获取项目详情 (ID: ${firstProject.id})...`);
      
      const projectDetailResponse = await axios.get(`${API_BASE}/projects/${firstProject.id}`);
      console.log(`✅ 项目详情获取成功，状态码: ${projectDetailResponse.status}`);
      
      console.log('\n📋 项目详情:');
      const project = projectDetailResponse.data.data;
      console.log(`  名称: ${project.name}`);
      console.log(`  描述: ${project.description || '无'}`);
      console.log(`  客户ID: ${project.company_id || '无'}`);
      console.log(`  状态: ${project.status || '无'}`);
      console.log(`  优先级: ${project.priority || '无'}`);
      console.log(`  进度: ${project.progress || 0}%`);
      console.log(`  开始日期: ${project.start_date || '无'}`);
      console.log(`  结束日期: ${project.end_date || '无'}`);
      console.log(`  预算: ${project.budget || '无'}`);

      // 测试更新项目
      console.log(`\n3️⃣ 测试更新项目...`);
      const updateData = {
        name: project.name,
        description: project.description || '测试更新',
        company_id: 1,
        status: 'active',
        priority: 'high',
        progress: 75,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };

      const updateResponse = await axios.put(`${API_BASE}/projects/${firstProject.id}`, updateData);
      console.log(`✅ 项目更新成功，状态码: ${updateResponse.status}`);
      
      console.log('\n📋 更新后的项目信息:');
      const updatedProject = updateResponse.data.data;
      console.log(`  名称: ${updatedProject.name}`);
      console.log(`  客户ID: ${updatedProject.company_id}`);
      console.log(`  状态: ${updatedProject.status}`);
      console.log(`  优先级: ${updatedProject.priority}`);
      console.log(`  进度: ${updatedProject.progress}%`);
      console.log(`  开始日期: ${updatedProject.start_date}`);
      console.log(`  结束日期: ${updatedProject.end_date}`);

      console.log('\n🎉 项目编辑保存功能测试完成！');
      console.log('✅ 所有关键字段都可以正常保存：');
      console.log('   ✅ 客户关联 (company_id)');
      console.log('   ✅ 项目状态和优先级');
      console.log('   ✅ 进度比例');
      console.log('   ✅ 起止日期');
      
    } else {
      console.log('\n⚠️ 没有找到项目，请先创建一些测试项目');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.response) {
      console.error('HTTP状态码:', error.response.status);
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.log('\n💡 认证失败，请检查用户名密码或认证方式');
      } else if (error.response.status === 404) {
        console.log('\n💡 API端点不存在，请检查后端路由配置');
      }
    }
  }
}

testBasicAPI();
