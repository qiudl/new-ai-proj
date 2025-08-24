#!/usr/bin/env node

/**
 * 测试后端认证和API连接
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:8080/api/v1';

// 尝试不同的密钥
const SECRET_KEYS = [
    'dev-secret-key',
    'docker-staging-secret-key-very-secure',
    'dev-secret-key-change-in-production',
    'your-secret-key'
];

async function testWithToken(token) {
    try {
        const response = await axios.get(`${API_BASE}/projects`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            status: error.response?.status,
            error: error.response?.data || error.message
        };
    }
}

async function main() {
    console.log('🔍 测试后端认证...\n');
    
    // 首先测试后端是否在线
    try {
        const pingResponse = await axios.get(`${API_BASE}/projects`, {
            timeout: 3000
        });
        console.log('✅ 后端在线（未认证访问）');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ 后端在线（需要认证）');
        } else {
            console.error('❌ 后端可能未运行:', error.message);
            console.log('\n请确保后端服务正在运行：');
            console.log('  cd backend && go run main.go');
            return;
        }
    }
    
    console.log('\n尝试不同的JWT密钥...\n');
    
    for (const secret of SECRET_KEYS) {
        console.log(`测试密钥: ${secret}`);
        
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            user_id: 1,
            username: 'admin',
            role: 'admin',
            user_type: 'system',
            sub: 'admin',
            iat: now,
            nbf: now,
            exp: now + 3600 // 1小时有效期
        };
        
        const token = jwt.sign(payload, secret, {
            algorithm: 'HS256'
        });
        
        const result = await testWithToken(token);
        
        if (result.success) {
            console.log(`  ✅ 成功！使用密钥: ${secret}`);
            console.log(`  找到项目数: ${result.data?.data?.data?.length || 0}`);
            console.log('\n🎉 正确的JWT密钥是:', secret);
            console.log('\n生成的有效Token:');
            console.log(token);
            
            // 保存到文件
            const fs = (await import('fs')).default;
            const path = (await import('path')).default;
            const configPath = path.join(process.cwd(), '.env.jwt-config');
            fs.writeFileSync(configPath, `JWT_SECRET=${secret}\nJWT_TOKEN=${token}\n`);
            console.log('\n✅ 配置已保存到 .env.jwt-config');
            
            break;
        } else {
            console.log(`  ❌ 失败 (状态码: ${result.status})`);
            if (result.error?.error?.details) {
                console.log(`     ${result.error.error.details}`);
            }
        }
    }
    
    console.log('\n测试完成！');
}

main().catch(console.error);
