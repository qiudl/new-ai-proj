#!/usr/bin/env node

/**
 * AI配置模块测试脚本
 * 用于测试DeepSeek API配置和连接
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

// 测试用的JWT token (需要从登录获取)
let authToken = '';

// 测试用的DeepSeek配置
const testDeepSeekConfig = {
  provider: 'deepseek',
  apiKey: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz123456', // 测试密钥
  model: 'deepseek-chat',
  baseURL: 'https://api.deepseek.com/v1',
  temperature: 0.3,
  maxTokens: 2000,
  enabled: true
};

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 添加请求拦截器
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    console.log(`📡 ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
      const logData = { ...config.data };
      if (logData.apiKey) {
        logData.apiKey = logData.apiKey.substring(0, 8) + '••••••••';
      }
      console.log('   请求数据:', JSON.stringify(logData, null, 2));
    }
    return config;
  },
  (error) => {
    console.error('❌ 请求错误:', error.message);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`❌ ${error.response.status} ${error.config.url}`);
      console.error('   错误信息:', error.response.data);
    } else {
      console.error('❌ 网络错误:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * 用户登录获取token
 */
async function login() {
  try {
    console.log('\n🔐 正在登录...');
    const response = await api.post('/auth/login', {
      username: 'test_user',
      password: 'password123'
    });
    
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.error('❌ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录异常:', error.message);
    return false;
  }
}

/**
 * 检查后端服务状态
 */
async function checkBackendStatus() {
  try {
    console.log('\n🏥 检查后端服务状态...');
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ 后端服务正常运行');
    return true;
  } catch (error) {
    console.error('❌ 后端服务不可用:', error.message);
    console.log('💡 请确保后端服务正在运行: cd backend && go run main.go');
    return false;
  }
}

/**
 * 检查数据库连接和表结构
 */
async function checkDatabase() {
  try {
    console.log('\n🗃️  检查数据库连接...');
    // 通过获取用户信息来测试数据库连接
    const response = await api.get('/users/profile');
    console.log('✅ 数据库连接正常');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接异常:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 获取所有AI配置
 */
async function getAllAIConfigs() {
  try {
    console.log('\n📋 获取所有AI配置...');
    const response = await api.get('/system/ai-configs');
    
    if (response.data.success) {
      const configs = response.data.data || [];
      console.log(`✅ 找到 ${configs.length} 个AI配置`);
      
      configs.forEach((config, index) => {
        console.log(`   ${index + 1}. ${config.provider}: ${config.model} (${config.enabled ? '启用' : '禁用'})`);
        console.log(`      API密钥: ${config.api_key_masked || 'N/A'}`);
      });
      
      return configs;
    } else {
      console.error('❌ 获取AI配置失败:', response.data);
      return [];
    }
  } catch (error) {
    console.error('❌ 获取AI配置异常:', error.response?.data || error.message);
    return [];
  }
}

/**
 * 创建DeepSeek配置
 */
async function createDeepSeekConfig() {
  try {
    console.log('\n🛠️  创建DeepSeek配置...');
    const response = await api.post('/system/ai-configs', testDeepSeekConfig);
    
    if (response.data.success) {
      console.log('✅ DeepSeek配置创建成功');
      console.log('   配置详情:', JSON.stringify(response.data.data, null, 2));
      return response.data.data;
    } else {
      console.error('❌ 创建DeepSeek配置失败:', response.data);
      return null;
    }
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  DeepSeek配置已存在，跳过创建');
      return { alreadyExists: true };
    } else {
      console.error('❌ 创建DeepSeek配置异常:', error.response?.data || error.message);
      return null;
    }
  }
}

/**
 * 测试DeepSeek连接
 */
async function testDeepSeekConnection() {
  try {
    console.log('\n🧪 测试DeepSeek连接...');
    
    const testRequest = {
      provider: 'deepseek',
      apiKey: testDeepSeekConfig.apiKey,
      model: testDeepSeekConfig.model,
      baseURL: testDeepSeekConfig.baseURL
    };
    
    const response = await api.post('/system/ai-configs/test', testRequest);
    
    if (response.data.success) {
      const testResult = response.data.data;
      console.log('✅ 连接测试完成');
      console.log(`   结果: ${testResult.success ? '成功' : '失败'}`);
      console.log(`   消息: ${testResult.message}`);
      console.log(`   响应时间: ${testResult.response_time}ms`);
      
      if (testResult.conversation) {
        console.log('\n💬 测试对话:');
        console.log(`   问题: ${testResult.conversation.question}`);
        console.log(`   回答: ${testResult.conversation.answer}`);
        
        if (testResult.conversation.usage) {
          console.log(`   Token使用: ${testResult.conversation.usage.total_tokens} (输入: ${testResult.conversation.usage.prompt_tokens}, 输出: ${testResult.conversation.usage.completion_tokens})`);
        }
      }
      
      return testResult;
    } else {
      console.error('❌ 连接测试失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ 连接测试异常:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 获取AI配置统计
 */
async function getAIConfigStats() {
  try {
    console.log('\n📊 获取AI配置统计...');
    const response = await api.get('/system/ai-configs/stats');
    
    if (response.data.success) {
      const stats = response.data.data;
      console.log('✅ 统计信息:');
      console.log(`   总配置数: ${stats.total_configs}`);
      console.log(`   启用配置数: ${stats.enabled_configs}`);
      console.log(`   已测试配置数: ${stats.tested_configs}`);
      return stats;
    } else {
      console.error('❌ 获取统计失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ 获取统计异常:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 更新DeepSeek配置
 */
async function updateDeepSeekConfig() {
  try {
    console.log('\n📝 更新DeepSeek配置...');
    
    const updateData = {
      model: 'deepseek-chat',
      temperature: 0.5, // 修改temperature
      maxTokens: 1500,   // 修改maxTokens
      enabled: true
    };
    
    const response = await api.put('/system/ai-configs/deepseek', updateData);
    
    if (response.data.success) {
      console.log('✅ DeepSeek配置更新成功');
      console.log('   更新后配置:', JSON.stringify(response.data.data, null, 2));
      return response.data.data;
    } else {
      console.error('❌ 更新DeepSeek配置失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ 更新DeepSeek配置异常:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('🚀 开始AI配置模块测试\n');
  
  // 1. 检查后端服务
  const backendOk = await checkBackendStatus();
  if (!backendOk) {
    console.log('\n❌ 测试中止：后端服务不可用');
    process.exit(1);
  }
  
  // 2. 登录获取token
  const loginOk = await login();
  if (!loginOk) {
    console.log('\n❌ 测试中止：登录失败');
    process.exit(1);
  }
  
  // 3. 检查数据库
  const dbOk = await checkDatabase();
  if (!dbOk) {
    console.log('\n❌ 测试中止：数据库连接异常');
    process.exit(1);
  }
  
  // 4. 获取现有配置
  const existingConfigs = await getAllAIConfigs();
  
  // 5. 创建DeepSeek配置
  const createResult = await createDeepSeekConfig();
  
  // 6. 再次获取配置列表（验证创建结果）
  if (createResult && !createResult.alreadyExists) {
    await getAllAIConfigs();
  }
  
  // 7. 测试DeepSeek连接
  const testResult = await testDeepSeekConnection();
  
  // 8. 更新配置测试
  await updateDeepSeekConfig();
  
  // 9. 获取统计信息
  await getAIConfigStats();
  
  // 10. 最终配置列表
  console.log('\n📋 最终配置状态:');
  await getAllAIConfigs();
  
  console.log('\n🎉 AI配置模块测试完成！');
  
  // 总结
  console.log('\n📋 测试总结:');
  console.log(`✅ 后端服务: ${backendOk ? '正常' : '异常'}`);
  console.log(`✅ 数据库连接: ${dbOk ? '正常' : '异常'}`);
  console.log(`✅ 用户认证: ${loginOk ? '正常' : '异常'}`);
  console.log(`✅ 配置管理: ${createResult ? '正常' : '异常'}`);
  console.log(`✅ 连接测试: ${testResult?.success ? '成功' : (testResult ? '失败' : '异常')}`);
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ 测试执行异常:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  login,
  checkBackendStatus,
  getAllAIConfigs,
  createDeepSeekConfig,
  testDeepSeekConnection
};
