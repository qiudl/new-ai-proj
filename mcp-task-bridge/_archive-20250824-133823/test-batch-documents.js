#!/usr/bin/env node

// 测试 createBatchDocuments 功能的独立脚本

import { TaskMCPServerFixed } from './task-mcp-fixed.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') });

console.log('=== MCP CreateBatchDocuments 功能测试 ===\n');

// 初始化TaskMCPServer
const taskServer = new TaskMCPServerFixed(
    process.env.TASK_API_BASE || 'http://localhost:8081/api/v1'
);

async function testCreateBatchDocuments() {
    try {
        console.log('1. 测试批量创建文档...');
        
        const documents = [
            {
                title: 'MCP批量测试文档1',
                content: `# MCP批量测试文档1

## 测试内容
这是第一个通过批量接口创建的测试文档。

## 创建时间
${new Date().toISOString()}

## 功能验证
如果这个文档成功创建，说明批量文档创建功能的基础逻辑正常工作。
`,
                type: 'markdown',
                project_id: 1,
                description: '批量创建测试文档 - 文档1'
            },
            {
                title: 'MCP批量测试文档2',
                content: `# MCP批量测试文档2

## 测试内容
这是第二个通过批量接口创建的测试文档。

## 特点
- 批量处理能力测试
- API稳定性验证
- 错误处理测试

## 创建时间
${new Date().toISOString()}
`,
                type: 'markdown',
                project_id: 1,
                description: '批量创建测试文档 - 文档2'
            },
            {
                title: 'MCP批量测试文档3',
                content: `# MCP批量测试文档3

## 测试总结
这是第三个文档，用于测试批量创建功能的完整性。

### 测试要点
1. 多个文档同时创建
2. 不同内容和长度处理
3. 成功率统计
4. 错误处理机制

## 结论
如果所有3个文档都创建成功，说明 createBatchDocuments 功能完全正常！

创建时间: ${new Date().toISOString()}
`,
                type: 'markdown',
                project_id: 1,
                description: '批量创建测试文档 - 文档3'
            }
        ];

        const result = await taskServer.createBatchDocuments(documents);
        
        console.log('批量创建结果：', result);
        
        if (result.success) {
            console.log('✅ createBatchDocuments功能测试成功！');
            console.log(`   总计处理: ${result.total} 个文档`);
            console.log(`   成功创建: ${result.successful} 个`);
            console.log(`   失败数量: ${result.failed} 个`);
            
            if (result.data && result.data.length > 0) {
                console.log('\n详细结果:');
                result.data.forEach((doc, index) => {
                    if (doc.success) {
                        console.log(`   ${index + 1}. ✅ ${doc.title} (ID: ${doc.id})`);
                    } else {
                        console.log(`   ${index + 1}. ❌ ${doc.title} - ${doc.error}`);
                    }
                });
            }
        } else {
            console.log('❌ createBatchDocuments功能测试失败：', result.error);
        }
    } catch (error) {
        console.error('❌ 测试过程中出错：', error.message);
    }
}

// 运行测试
testCreateBatchDocuments();
