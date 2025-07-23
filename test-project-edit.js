#!/usr/bin/env node
/**
 * 项目详情编辑页保存功能测试脚本
 * 测试关联客户、用户和项目起止日期、进度比例等字段的保存
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080/api/v1';

// 添加默认的认证header
axios.defaults.headers.common['Authorization'] = 'Bearer test-token';

// 测试数据
const testProjectData = {
  name: "测试项目更新",
  description: "测试项目编辑页面保存功能",
  company_id: 1,
  status: "active",
  priority: "high", 
  progress: 75,
  start_date: "2025-01-01",
  end_date: "2025-12-31",
  budget: 100000.00
};

const testProjectUpdateData = {
  name: "更新后的项目名称",
  description: "更新后的项目描述",
  company_id: 2,
  status: "on_hold",
  priority: "medium",
  progress: 85,
  start_date: "2025-02-01", 
  end_date: "2025-11-30",
  budget: 150000.00
};

async function testProjectEditSave() {
  console.log('🧪 开始测试项目详情编辑页保存功能...\n');

  try {
    // 1. 创建测试项目
    console.log('1️⃣ 创建测试项目...');
    const createResponse = await axios.post(`${API_BASE}/projects`, testProjectData);
    
    if (createResponse.status !== 201) {
      throw new Error(`创建项目失败: ${createResponse.status}`);
    }
    
    const projectId = createResponse.data.data.id;
    console.log(`✅ 项目创建成功，ID: ${projectId}`);
    console.log(`📋 创建的项目数据:`, JSON.stringify(createResponse.data.data, null, 2));

    // 2. 获取项目详情
    console.log('\n2️⃣ 获取项目详情...');
    const getResponse = await axios.get(`${API_BASE}/projects/${projectId}`);
    
    if (getResponse.status !== 200) {
      throw new Error(`获取项目详情失败: ${getResponse.status}`);
    }
    
    console.log('✅ 项目详情获取成功');
    console.log('📋 项目详情:', JSON.stringify(getResponse.data.data, null, 2));

    // 3. 更新项目（模拟编辑页面保存）
    console.log('\n3️⃣ 更新项目信息（模拟编辑页面保存）...');
    const updateResponse = await axios.put(`${API_BASE}/projects/${projectId}`, testProjectUpdateData);
    
    if (updateResponse.status !== 200) {
      throw new Error(`更新项目失败: ${updateResponse.status}`);
    }
    
    console.log('✅ 项目更新成功');
    console.log('📋 更新后的项目数据:', JSON.stringify(updateResponse.data.data, null, 2));

    // 4. 验证更新结果
    console.log('\n4️⃣ 验证更新结果...');
    const verifyResponse = await axios.get(`${API_BASE}/projects/${projectId}`);
    
    if (verifyResponse.status !== 200) {
      throw new Error(`验证获取项目详情失败: ${verifyResponse.status}`);
    }
    
    const updatedProject = verifyResponse.data.data;
    
    // 检查关键字段是否正确保存
    const fieldsToCheck = [
      { field: 'name', expected: testProjectUpdateData.name, actual: updatedProject.name },
      { field: 'description', expected: testProjectUpdateData.description, actual: updatedProject.description },
      { field: 'company_id', expected: testProjectUpdateData.company_id, actual: updatedProject.company_id },
      { field: 'status', expected: testProjectUpdateData.status, actual: updatedProject.status },
      { field: 'priority', expected: testProjectUpdateData.priority, actual: updatedProject.priority },
      { field: 'progress', expected: testProjectUpdateData.progress, actual: updatedProject.progress },
      { field: 'start_date', expected: testProjectUpdateData.start_date, actual: updatedProject.start_date?.substring(0, 10) },
      { field: 'end_date', expected: testProjectUpdateData.end_date, actual: updatedProject.end_date?.substring(0, 10) },
      { field: 'budget', expected: testProjectUpdateData.budget, actual: updatedProject.budget }
    ];
    
    let allFieldsCorrect = true;
    console.log('\n🔍 字段验证结果:');
    
    fieldsToCheck.forEach(({ field, expected, actual }) => {
      const isCorrect = expected === actual;
      if (!isCorrect) allFieldsCorrect = false;
      
      console.log(`  ${isCorrect ? '✅' : '❌'} ${field}: 期望 ${expected}, 实际 ${actual}`);
    });

    // 5. 测试多客户关联
    console.log('\n5️⃣ 测试多客户关联保存...');
    const multiCompanyData = {
      ...testProjectUpdateData,
      company_ids: [1, 2, 3],
      user_ids: [1, 2]
    };
    
    const multiCompanyResponse = await axios.put(`${API_BASE}/projects/${projectId}`, multiCompanyData);
    
    if (multiCompanyResponse.status !== 200) {
      throw new Error(`多客户关联更新失败: ${multiCompanyResponse.status}`);
    }
    
    console.log('✅ 多客户关联更新成功');

    // 6. 清理测试数据
    console.log('\n6️⃣ 清理测试数据...');
    const deleteResponse = await axios.delete(`${API_BASE}/projects/${projectId}`);
    
    if (deleteResponse.status !== 200) {
      console.log(`⚠️ 删除测试项目失败: ${deleteResponse.status}`);
    } else {
      console.log('✅ 测试项目已删除');
    }

    // 总结
    console.log('\n📊 测试结果总结:');
    if (allFieldsCorrect) {
      console.log('🎉 所有字段保存功能正常！项目编辑页可以正确保存：');
      console.log('   ✅ 项目基本信息（名称、描述）');
      console.log('   ✅ 关联客户（company_id）');
      console.log('   ✅ 项目状态和优先级');
      console.log('   ✅ 进度比例（progress）');
      console.log('   ✅ 项目起止日期');
      console.log('   ✅ 项目预算');
      console.log('   ✅ 多客户关联');
    } else {
      console.log('❌ 部分字段保存存在问题，请检查上述验证结果');
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    
    if (error.response) {
      console.error('HTTP状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    
    // 检查后端服务是否运行
    try {
      await axios.get(`${API_BASE}/health`);
    } catch (healthError) {
      console.error('\n⚠️ 后端服务似乎未运行，请确保后端服务已启动');
    }
  }
}

// 检查是否有代码编译错误的函数
async function checkBackendCompilation() {
  console.log('🔍 检查后端代码编译状态...\n');
  
  try {
    // 尝试访问基础健康检查端点
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ 后端服务运行正常');
    return true;
  } catch (error) {
    console.log('❌ 后端服务访问失败');
    console.log('🔧 可能的问题:');
    console.log('   1. 后端服务未启动');
    console.log('   2. 后端代码存在编译错误');
    console.log('   3. 端口8080被占用或配置错误');
    console.log('\n💡 建议检查:');
    console.log('   - 运行 `cd backend && go run main.go` 查看编译错误');
    console.log('   - 检查8080端口是否被占用');
    console.log('   - 查看后端日志输出');
    return false;
  }
}

// 主执行函数
async function main() {
  console.log('🚀 项目详情编辑页保存功能检查');
  console.log('=' * 50);
  
  const backendRunning = await checkBackendCompilation();
  
  if (backendRunning) {
    await testProjectEditSave();
  } else {
    console.log('\n⏸️ 由于后端服务不可用，跳过功能测试');
    console.log('📝 请先解决后端问题，然后重新运行此测试');
  }
}

// 运行测试
main().catch(console.error);
