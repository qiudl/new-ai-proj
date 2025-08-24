#!/usr/bin/env node

/**
 * 测试 create-and-attach MCP 接口
 * 用于验证创建并关联任务文档功能
 */

import { TaskMCPServer } from './task-mcp.js';

async function testCreateAndAttach() {
    console.log('========== 测试 create-and-attach 接口 ==========\n');
    
    const API_BASE = process.env.TASK_API_BASE || process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
    const server = new TaskMCPServer(API_BASE);

    // 若未提供令牌，则尝试开发环境快速登录以获取 JWT（不输出令牌）
    if (!process.env.TASK_API_TOKEN && !process.env.API_TOKEN) {
        try {
            const loginRes = await server.devQuickLogin(process.env.DEV_LOGIN_USERNAME);
            console.log(`🔐 开发登录: ${loginRes.success ? '成功' : `失败(${loginRes.error})`}`);
        } catch (e) {
            console.log(`🔐 开发登录失败: ${e?.message || e}`);
        }
    }
    
    try {
        // 测试参数
        const testTaskId = Number(process.env.TASK_ID || process.env.TEST_TASK_ID || '546'); // 可通过环境变量 TASK_ID 覆盖任务ID
        const testContent = `# 测试文档

这是通过 MCP create-and-attach 接口创建的测试文档。

## 测试内容

- 测试时间: ${new Date().toISOString()}
- 任务ID: ${testTaskId}
- 接口: create-and-attach

## 功能验证

1. 创建新文档
2. 自动关联到任务
3. 返回成功状态`;

        const testTitle = `测试文档 - ${new Date().toLocaleString('zh-CN')}`;
        
        console.log('📝 准备创建文档...');
        console.log(`  - 任务ID: ${testTaskId}`);
        console.log(`  - 文档标题: ${testTitle}`);
        console.log(`  - 内容长度: ${testContent.length} 字符\n`);
        
        // 调用 createAndAttachTaskDocument 方法
        const result = await server.createAndAttachTaskDocument(
            testTaskId,
            testContent,
            1, // projectId
            testTitle
        );
        
        console.log('📊 执行结果:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\n✅ 测试成功！');
            console.log(`  - 文档ID: ${result.document_id}`);
            console.log(`  - 任务ID: ${result.task_id}`);
            console.log(`  - 项目ID: ${result.project_id}`);
            
            // 验证文档是否真的被创建
            console.log('\n🔍 验证文档是否存在...');
            const hasDocResult = await server.hasTaskDocument(testTaskId, 1);
            console.log(`  - 文档存在: ${hasDocResult.has_document ? '是' : '否'}`);
            
            if (hasDocResult.has_document) {
                // 获取文档内容进行验证
                console.log('\n📖 获取文档内容进行验证...');
                const getDocResult = await server.getTaskDocument(testTaskId, 1);
                if (getDocResult.success) {
                    console.log(`  - 文档标题: ${getDocResult.title}`);
                    console.log(`  - 内容长度: ${getDocResult.content?.length || 0} 字符`);
                    console.log(`  - 内容预览: ${getDocResult.content?.substring(0, 100)}...`);
                }
            }
        } else {
            console.error('\n❌ 测试失败！');
            console.error(`  - 错误信息: ${result.error}`);
            
            // 尝试诊断问题
            console.log('\n🔧 诊断信息:');
            
            // 检查任务是否存在
            try {
                const task = await server.findTaskById(testTaskId);
                console.log(`  - 任务存在: 是 (${task.title})`);
            } catch (e) {
                console.log(`  - 任务存在: 否 (${e.message})`);
            }
            
            // 检查API连接
            try {
                const projects = await server.listProjects();
                console.log(`  - API连接: 正常 (找到 ${projects.projects?.length || 0} 个项目)`);
            } catch (e) {
                console.log(`  - API连接: 异常 (${e.message})`);
            }
        }
        
    } catch (error) {
        console.error('\n💥 发生未预期的错误:');
        console.error(error);
        
        if (error.response) {
            console.error('\n响应详情:');
            console.error(`  - 状态码: ${error.response.status}`);
            console.error(`  - 响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
    
    console.log('\n========== 测试完成 ==========');
}

// 运行测试
testCreateAndAttach().catch(console.error);
