#!/usr/bin/env node

const axios = require('axios');

class AuthDebugger {
  constructor() {
    this.apiBase = 'http://localhost:8081/api/v1';
    this.authToken = undefined;
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  async devQuickLogin(username = 'guoym') {
    try {
      console.log('[1] 开始开发环境快速登录...');
      const response = await axios.post(`${this.apiBase}/auth/dev-quick-login`, 
        { username }, 
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      const payload = response.data?.data || response.data || {};
      const token = payload.access_token || payload.token;
      
      if (!token) {
        throw new Error('未获取到token');
      }

      this.authToken = token;
      console.log('[2] 登录成功，获取到token:', token.substring(0, 50) + '...');
      console.log('[3] authToken已更新');
      
      return { success: true, token };
    } catch (error) {
      console.error('[ERROR] 登录失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testCurrentTimer() {
    try {
      console.log('[4] 测试获取当前计时状态...');
      const headers = this.getHeaders();
      console.log('[5] 请求头:', JSON.stringify(headers, null, 2));
      
      const response = await axios.get(`${this.apiBase}/user/timer/current`, {
        headers,
        proxy: false
      });
      
      console.log('[6] API响应成功:', response.status);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[ERROR] API请求失败:');
      console.error('  状态码:', error.response?.status);
      console.error('  响应数据:', JSON.stringify(error.response?.data, null, 2));
      console.error('  错误消息:', error.message);
      return { success: false, error: error.message };
    }
  }
}

async function main() {
  const debug = new AuthDebugger();
  
  // 步骤1: 登录
  const loginResult = await debug.devQuickLogin();
  if (!loginResult.success) {
    console.error('登录失败，退出测试');
    return;
  }

  // 步骤2: 测试需要身份验证的接口
  await debug.testCurrentTimer();
}

main().catch(console.error);
