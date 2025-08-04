#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 配置文件路径
const CONFIG_PATH = path.join(process.env.HOME, '.claude-code', 'config.json');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';

// JWT解码函数
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to decode JWT:', error);
        return null;
    }
}

// 检查token是否即将过期（提前1天刷新）
function isTokenExpiringSoon(token) {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) {
        return true;
    }
    
    const expirationTime = decoded.exp * 1000; // 转换为毫秒
    const currentTime = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    return (expirationTime - currentTime) < oneDayInMs;
}

// 刷新token
async function refreshToken(currentToken) {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data.token;
    } catch (error) {
        console.error('Failed to refresh token:', error.message);
        throw error;
    }
}

// 更新配置文件
function updateConfig(newToken) {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        
        // 更新AUTH_TOKEN
        if (config.mcpServers && config.mcpServers['ai-project-manager']) {
            config.mcpServers['ai-project-manager'].env.AUTH_TOKEN = newToken;
            
            // 写回配置文件
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
            console.log('✅ Token updated successfully');
            
            // 显示新token的过期时间
            const decoded = decodeJWT(newToken);
            if (decoded && decoded.exp) {
                const expirationDate = new Date(decoded.exp * 1000);
                console.log(`📅 New token expires at: ${expirationDate.toLocaleString()}`);
            }
        } else {
            console.error('❌ Invalid config structure');
        }
    } catch (error) {
        console.error('Failed to update config:', error.message);
        throw error;
    }
}

// 主函数
async function main() {
    try {
        // 读取当前配置
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        const currentToken = config.mcpServers?.['ai-project-manager']?.env?.AUTH_TOKEN;
        
        if (!currentToken) {
            console.error('❌ No token found in config');
            process.exit(1);
        }
        
        // 检查token状态
        const decoded = decodeJWT(currentToken);
        if (decoded && decoded.exp) {
            const expirationDate = new Date(decoded.exp * 1000);
            console.log(`📅 Current token expires at: ${expirationDate.toLocaleString()}`);
        }
        
        // 检查是否需要刷新
        if (isTokenExpiringSoon(currentToken)) {
            console.log('🔄 Token is expiring soon, refreshing...');
            const newToken = await refreshToken(currentToken);
            updateConfig(newToken);
        } else {
            console.log('✅ Token is still valid');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// 如果直接运行脚本
if (require.main === module) {
    main();
}

// 导出函数供其他模块使用
module.exports = {
    refreshToken,
    isTokenExpiringSoon,
    updateConfig
};
