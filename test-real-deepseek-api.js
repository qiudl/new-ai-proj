#!/usr/bin/env node

/**
 * DeepSeek真实API密钥测试脚本
 * 使用此脚本测试真实的DeepSeek API密钥
 */

const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 提示用户输入
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * 登录获取token
 */
async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'test_user',
      password: 'password123'
    });
    
    if (response.data.success && response.data.data.token) {
      console.log('✅ 登录成功');
      return response.data.data.token;
    } else {
      console.error('❌ 登录失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ 登录异常:', error.message);
    return null;
  }
}

/**
 * 测试DeepSeek API密钥
 */
async function testDeepSeekAPI(token, apiKey) {
  try {
    console.log('\n🧪 测试DeepSeek API密钥...');
    console.log(`密钥: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 6)}`);
    
    const response = await axios.post(`${API_BASE}/system/ai-configs/test`, {
      provider: 'deepseek',
      api_key: apiKey,
      model: 'deepseek-chat',
      base_url: 'https://api.deepseek.com/v1'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000  // 30秒超时
    });
    
    if (response.data.success) {
      const result = response.data.data;
      console.log(`\n📊 测试结果:`);
      console.log(`✅ 状态: ${result.success ? '成功' : '失败'}`);
      console.log(`📝 消息: ${result.message}`);
      console.log(`⏱️  响应时间: ${result.response_time}ms`);
      
      if (result.model_info) {
        console.log(`🤖 模型信息: ${result.model_info.name} v${result.model_info.version}`);
      }
      
      if (result.conversation) {
        console.log(`\n💬 测试对话:`);
        console.log(`   问题: ${result.conversation.question}`);
        console.log(`   回答: ${result.conversation.answer}`);
        
        if (result.conversation.usage) {
          const usage = result.conversation.usage;
          console.log(`   Token使用: ${usage.total_tokens} (输入: ${usage.prompt_tokens}, 输出: ${usage.completion_tokens})`);
        }
      }
      
      return result.success;
    } else {
      console.error('❌ API调用失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 测试异常:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 保存有效的API密钥到配置
 */
async function saveAPIKey(token, apiKey) {
  try {
    console.log('\n💾 保存API密钥到配置...');
    
    const configData = {
      api_key: apiKey,
      model: 'deepseek-chat',
      base_url: 'https://api.deepseek.com/v1',
      temperature: 0.3,
      max_tokens: 2000,
      enabled: true
    };
    
    const response = await axios.put(`${API_BASE}/system/ai-configs/deepseek`, configData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ API密钥保存成功！');
      const config = response.data.data;
      console.log(`   配置ID: ${config.id}`);
      console.log(`   模型: ${config.model}`);
      console.log(`   状态: ${config.enabled ? '启用' : '禁用'}`);
      console.log(`   脱敏密钥: ${config.api_key_masked}`);
      return true;
    } else {
      console.error('❌ 保存失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 保存异常:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 验证API密钥格式
 */
function validateAPIKeyFormat(apiKey) {
  if (!apiKey) {
    return { valid: false, message: 'API密钥不能为空' };
  }
  
  if (!apiKey.startsWith('sk-')) {
    return { valid: false, message: 'DeepSeek API密钥应以 sk- 开头' };
  }
  
  if (apiKey.length < 20) {
    return { valid: false, message: 'API密钥长度不足，请检查是否完整' };
  }
  
  // 检查是否为测试密钥
  const testKeywords = ['test', 'demo', 'mock', 'example'];
  const isTestKey = testKeywords.some(keyword => apiKey.toLowerCase().includes(keyword));
  
  if (isTestKey) {
    return { valid: true, message: '这是一个测试密钥，将使用模拟模式', isTestKey: true };
  }
  
  return { valid: true, message: 'API密钥格式正确', isTestKey: false };
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 DeepSeek API密钥测试工具\n');
  console.log('此工具将帮助您测试和配置DeepSeek API密钥');
  console.log('如果您还没有API密钥，请访问: https://platform.deepseek.com\n');
  
  try {
    // 1. 登录获取token
    const token = await login();
    if (!token) {
      console.log('❌ 无法继续，登录失败');
      process.exit(1);
    }
    
    // 2. 获取API密钥
    const apiKey = await askQuestion('\n🔑 请输入您的DeepSeek API密钥 (或输入 "test" 使用测试密钥): ');
    
    // 处理测试模式
    let actualApiKey = apiKey.trim();
    if (actualApiKey.toLowerCase() === 'test') {
      actualApiKey = 'sk-test1234567890abcdefghijklmnopqrstuvwxyz123456';
      console.log('🧪 使用测试密钥（模拟模式）');
    }
    
    // 3. 验证密钥格式
    const validation = validateAPIKeyFormat(actualApiKey);
    if (!validation.valid) {
      console.error(`❌ ${validation.message}`);
      process.exit(1);
    }
    
    console.log(`✅ ${validation.message}`);
    if (validation.isTestKey) {
      console.log('⚠️  注意: 测试密钥只会返回模拟响应');
    }
    
    // 4. 测试API密钥
    const testSuccess = await testDeepSeekAPI(token, actualApiKey);
    
    if (testSuccess) {
      console.log('\n🎉 API密钥测试成功！');
      
      // 5. 询问是否保存配置
      const shouldSave = await askQuestion('\n💾 是否将此API密钥保存到系统配置？ (y/n): ');
      
      if (shouldSave.toLowerCase() === 'y' || shouldSave.toLowerCase() === 'yes') {
        const saveSuccess = await saveAPIKey(token, actualApiKey);
        
        if (saveSuccess) {
          console.log('\n✅ 完成！DeepSeek API已配置并可以使用');
          console.log('💡 您现在可以在前端页面 http://localhost:3000/ai-config 查看配置');
          console.log('🔧 或在其他功能模块中使用AI智能填充功能');
        }
      } else {
        console.log('\n✅ 测试完成，配置未保存');
        console.log('💡 您可以稍后在前端页面手动配置');
      }
    } else {
      console.log('\n❌ API密钥测试失败');
      console.log('💡 请检查:');
      console.log('   1. API密钥是否正确');
      console.log('   2. DeepSeek账户是否有足够余额');
      console.log('   3. 网络连接是否正常');
      console.log('   4. API密钥是否已激活');
    }
    
  } catch (error) {
    console.error('\n❌ 程序异常:', error);
  } finally {
    rl.close();
  }
}

// 错误处理
process.on('SIGINT', () => {
  console.log('\n\n👋 测试已取消');
  rl.close();
  process.exit(0);
});

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error);
    rl.close();
    process.exit(1);
  });
}
