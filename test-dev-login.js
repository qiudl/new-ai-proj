#!/usr/bin/env node

// 测试 dev_quick_login 功能
const axios = require('axios');

async function testDevQuickLogin() {
    try {
        console.log('测试 dev_quick_login 功能...\n');
        
        // 直接调用后端 API
        const response = await axios.post(
            'http://localhost:8081/api/v1/auth/dev/quick-login',
            { username: 'admin' },
            { 
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            }
        );
        
        if (response.data.success) {
            console.log('✅ 登录成功！');
            console.log('用户名:', response.data.data.user.username);
            console.log('角色:', response.data.data.user.role);
            console.log('Token (前50字符):', response.data.data.access_token.substring(0, 50) + '...');
            console.log('\n完整响应:');
            console.log(JSON.stringify(response.data, null, 2));
            return response.data.data.access_token;
        } else {
            console.log('❌ 登录失败:', response.data.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 错误:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
        return null;
    }
}

// 执行测试
testDevQuickLogin().then(token => {
    if (token) {
        console.log('\n========================================');
        console.log('测试完成 - dev_quick_login 功能正常！');
        console.log('========================================');
        process.exit(0);
    } else {
        process.exit(1);
    }
});
