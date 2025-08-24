#!/usr/bin/env node

/**
 * 修复find_task接口无法找到任务551的问题
 * 
 * 问题根源：
 * 1. 当前MCP使用IndependentMCPServer（内存存储）
 * 2. 任务551存在于实际数据库中，但不在内存中
 * 
 * 解决方案：
 * 直接调用后端API获取任务551
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') });

// API配置 - 后端运行在8081端口
const API_BASE = process.env.TASK_API_BASE || 'http://localhost:8081/api/v1';
const AUTH_TOKEN = process.env.TASK_API_TOKEN || process.env.API_TOKEN || '';

console.log('🔍 查找任务551...');
console.log('API地址:', API_BASE);

async function findTask551() {
    try {
        // 方法1：直接通过ID获取
        console.log('\n📋 方法1: 直接获取任务551');
        try {
            const headers = {};
            if (AUTH_TOKEN) {
                headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
            }
            
            const response = await axios.get(`${API_BASE}/tasks/551`, { headers });
            console.log('✅ 找到任务551:');
            console