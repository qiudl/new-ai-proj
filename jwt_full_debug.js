#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const axios = require('axios');

class JWTDebugger {
  constructor() {
    this.apiBase = 'http://localhost:8081/api/v1';
    this.dockerSecret = 'dev_jwt_secret_key_2024';
  }

  async fullDebugFlow() {
    console.log('🔍 JWT身份验证问题完整调试流程');
    console.log('='.repeat(50));

    // 步骤1: 获取新token
    console.log('\n1. 获取dev-quick-login token...');
    const loginResult = await this.getToken();
    if (!loginResult.success) {
      console.error('登录失败，终止调试');
      return;
    }

    const token = loginResult.token;
    console.log('✅ 获取token成功');
    console.log('Token (前50字符):', token.substring(0, 50) + '...');

    // 步骤2: 解码token验证结构
    console.log('\n2. 解码token验证结构...');
    const decoded = jwt.decode(token);
    console.log('Token payload:', JSON.stringify(decoded, null, 2));
    
    // 步骤3: 本地验证token
    console.log('\n3. 使用Docker密钥本地验证token...');
    try {
      const verified = jwt.verify(token, this.dockerSecret);
      console.log('✅ 本地验证成功');
      console.log('验证结果 - 用户ID:', verified.user_id, '用户名:', verified.username);
    } catch (error) {
      console.log('❌ 本地验证失败:', error.message);
      return;
    }

    // 步骤4: 测试不需要权限的端点
    console.log('\n4. 测试健康检查端点（无需认证）...');
    try {
      const healthResp = await axios.get(`${this.apiBase.replace('/api/v1', '')}/health`);
      console.log('✅ 健康检查成功:', healthResp.status);
    } catch (error) {
      console.log('❌ 健康检查失败:', error.response?.status || error.message);
    }

    // 步骤5: 测试需要权限的端点
    console.log('\n5. 测试需要认证的端点...');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('请求头:', JSON.stringify(headers, null, 2));

    try {
      const timerResp = await axios.get(`${this.apiBase}/user/timer/current`, { headers });
      console.log('✅ 计时器端点访问成功:', timerResp.status);
      console.log('响应数据:', timerResp.data);
    } catch (error) {
      console.log('❌ 计时器端点访问失败');
      console.log('状态码:', error.response?.status);
      console.log('错误响应:', error.response?.data);
      console.log('错误信息:', error.message);

      // 步骤6: 测试其他需要认证的端点
      console.log('\n6. 测试其他认证端点...');
      const testEndpoints = [
        '/tasks',
        '/projects',
        '/users/profile'
      ];

      for (const endpoint of testEndpoints) {
        try {
          const resp = await axios.get(`${this.apiBase}${endpoint}`, { headers });
          console.log(`✅ ${endpoint}: 成功 (${resp.status})`);
        } catch (err) {
          console.log(`❌ ${endpoint}: 失败 (${err.response?.status || 'unknown'})`);
        }
      }
    }

    // 步骤7: 分析可能的原因
    console.log('\n7. 问题分析...');
    console.log('可能原因:');
    console.log('- JWT验证中间件配置错误');
    console.log('- Token blacklist机制阻止了token');
    console.log('- 路由权限配置问题');
    console.log('- Docker容器内外时间不同步');
    console.log('- JWT服务实例不一致');
  }

  async getToken() {
    try {
      const response = await axios.post(`${this.apiBase}/auth/dev-quick-login`, {
        username: 'guoym'
      });
      
      const token = response.data?.data?.access_token || response.data?.data?.token;
      if (!token) {
        return { success: false, error: 'No token in response' };
      }

      return { success: true, token };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

async function main() {
  const jwtDebug = new JWTDebugger();
  await jwtDebug.fullDebugFlow();
}

main().catch(console.error);
