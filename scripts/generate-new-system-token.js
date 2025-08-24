#!/usr/bin/env node

/**
 * 生成新的系统JWT Token
 * 用于MCP服务器和其他系统集成
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT 密钥（需要与后端配置保持一致）
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_2024';

// 生成新的系统token
function generateSystemToken() {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 365 * 24 * 60 * 60; // 1年有效期
    
    const payload = {
        user_id: 1,
        username: 'admin',
        role: 'admin',
        user_type: 'system',
        sub: 'admin',
        iat: now,
        nbf: now,
        exp: now + expiresIn
    };
    
    const token = jwt.sign(payload, JWT_SECRET, {
        algorithm: 'HS256'
    });
    
    return {
        token,
        payload,
        expiresAt: new Date((now + expiresIn) * 1000).toISOString()
    };
}

// 更新 task-mcp.js 文件中的 token
function updateTaskMCPFile(token) {
    const taskMCPPath = path.join(__dirname, '..', 'mcp-task-bridge', 'task-mcp.js');
    
    if (!fs.existsSync(taskMCPPath)) {
        console.error('❌ 找不到 task-mcp.js 文件');
        return false;
    }
    
    let content = fs.readFileSync(taskMCPPath, 'utf8');
    
    // 查找并替换 authToken 行
    const tokenRegex = /this\.authToken = ['"].*['"]/;
    if (tokenRegex.test(content)) {
        content = content.replace(tokenRegex, `this.authToken = '${token}'`);
        fs.writeFileSync(taskMCPPath, content, 'utf8');
        console.log('✅ 已更新 task-mcp.js 中的 token');
        return true;
    } else {
        console.error('❌ 无法在 task-mcp.js 中找到 authToken 行');
        return false;
    }
}

// 更新 index.js 文件中的 token（如果存在）
function updateIndexFile(token) {
    const indexPath = path.join(__dirname, '..', 'mcp-task-bridge', 'index.js');
    
    if (!fs.existsSync(indexPath)) {
        console.log('⚠️  找不到 index.js 文件，跳过');
        return false;
    }
    
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // 查找并替换 token 相关的行
    const tokenRegex = /const\s+token\s*=\s*['"].*['"]/g;
    if (tokenRegex.test(content)) {
        content = content.replace(tokenRegex, `const token = '${token}'`);
        fs.writeFileSync(indexPath, content, 'utf8');
        console.log('✅ 已更新 index.js 中的 token');
        return true;
    }
    
    return false;
}

// 保存 token 到文件（备份）
function saveTokenToFile(tokenInfo) {
    const tokenFile = path.join(__dirname, '..', '.env.mcp-token');
    const content = `# MCP System Token
# Generated at: ${new Date().toISOString()}
# Expires at: ${tokenInfo.expiresAt}

MCP_SYSTEM_TOKEN=${tokenInfo.token}
`;
    
    fs.writeFileSync(tokenFile, content, 'utf8');
    console.log('✅ Token 已保存到 .env.mcp-token');
}

// 主函数
function main() {
    console.log('🔧 生成新的系统 JWT Token...\n');
    
    const tokenInfo = generateSystemToken();
    
    console.log('📋 Token 信息:');
    console.log('  - User ID:', tokenInfo.payload.user_id);
    console.log('  - Username:', tokenInfo.payload.username);
    console.log('  - Role:', tokenInfo.payload.role);
    console.log('  - User Type:', tokenInfo.payload.user_type);
    console.log('  - 过期时间:', tokenInfo.expiresAt);
    console.log('\n');
    
    console.log('📝 新的 Token:');
    console.log(tokenInfo.token);
    console.log('\n');
    
    // 更新文件
    console.log('📂 更新文件中的 Token...');
    updateTaskMCPFile(tokenInfo.token);
    updateIndexFile(tokenInfo.token);
    saveTokenToFile(tokenInfo);
    
    console.log('\n✨ 完成！新的 token 已生成并更新到相关文件。');
    console.log('🔄 请重启 MCP 服务以使用新的 token。');
}

// 运行
main();
