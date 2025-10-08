#!/usr/bin/env node
import { TaskMCPServer } from './dist/task-mcp.js';

async function testUpdateMethods() {
    const mcp = new TaskMCPServer('http://localhost:8080/api/v1');

    // 设置token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTk5MzM5MDcsIm5iZiI6MTc1OTg0NzUwNywiaWF0IjoxNzU5ODQ3NTA3LCJqdGkiOiI4ZDE1NWE1YmMwNTU0MTRhMzBlODk2ZDk4ZDczYTA4NCJ9.USuFzaGXtynsVE5P8wS1RMhemL8GDTsWbYdweX5a5PI';
    mcp.setAuthToken(token);

    console.log('=== MCP工具更新方法测试 ===\n');

    try {
        // 1. 创建测试任务
        console.log('1️⃣  创建测试任务...');
        const taskResult = await mcp.createTask('MCP更新方法测试任务', 1);
        const taskId = taskResult.data?.id;
        console.log(`   ✅ 任务创建成功，ID: ${taskId}\n`);

        // 2. 创建初始文档
        console.log('2️⃣  创建初始文档...');
        const createResult = await mcp.createAndAttachTaskDocument(
            taskId,
            '## 初始内容\n\n这是版本1的文档',
            1,
            'MCP测试文档'
        );
        console.log(`   ✅ ${createResult.message}\n`);

        // 3. 读取初始文档
        console.log('3️⃣  读取初始文档...');
        const getResult1 = await mcp.getTaskDocument(taskId);
        const doc1 = getResult1.documents?.[0];
        console.log(`   📄 版本: ${doc1.version}`);
        console.log(`   📄 内容摘要: ${doc1.content.substring(0, 30)}...\n`);

        // 4. 测试updateTaskDocument (PUT)
        console.log('4️⃣  测试 updateTaskDocument (PUT更新)...');
        const updateResult = await mcp.updateTaskDocument(taskId, {
            content: '## 更新后的内容\n\n这是版本2，使用PUT方法更新。\n\n### 新增功能\n- 功能A\n- 功能B'
        });
        console.log(`   ${updateResult.message}`);
        console.log(`   📌 版本号: ${updateResult.version}`);
        console.log(`   📌 更新时间: ${updateResult.updated_at}\n`);

        // 5. 验证PUT更新
        console.log('5️⃣  验证PUT更新...');
        const getResult2 = await mcp.getTaskDocument(taskId);
        const doc2 = getResult2.documents?.[0];
        console.log(`   📄 当前版本: ${doc2.version}`);
        console.log(`   📄 内容摘要: ${doc2.content.substring(0, 40)}...\n`);

        // 6. 测试patchTaskDocument (PATCH)
        console.log('6️⃣  测试 patchTaskDocument (PATCH部分更新)...');
        const patchResult = await mcp.patchTaskDocument(taskId, {
            title: '【已更新V3】MCP测试文档'
        });
        console.log(`   ${patchResult.message}`);
        console.log(`   📌 版本号: ${patchResult.version}`);
        console.log(`   📌 更新字段: ${patchResult.fields_updated?.join(', ')}\n`);

        // 7. 最终验证
        console.log('7️⃣  最终验证...');
        const getResult3 = await mcp.getTaskDocument(taskId);
        const doc3 = getResult3.documents?.[0];
        console.log(`   📄 最终版本: ${doc3.version}`);
        console.log(`   📄 最终标题: ${doc3.title}\n`);

        // 8. 测试结果总结
        console.log('=== 📊 测试结果总结 ===');
        if (doc1.version === 1 && doc2.version === 2 && doc3.version === 3) {
            console.log('✅ 所有测试通过！');
            console.log(`   ✅ 初始版本: ${doc1.version}`);
            console.log(`   ✅ PUT更新后: ${doc2.version}`);
            console.log(`   ✅ PATCH更新后: ${doc3.version}`);
        } else {
            console.log('❌ 测试失败！');
            console.log(`   版本1: ${doc1.version} (期望:1)`);
            console.log(`   版本2: ${doc2.version} (期望:2)`);
            console.log(`   版本3: ${doc3.version} (期望:3)`);
        }

        // 清理测试数据
        console.log('\n🧹 清理测试数据...');
        await mcp.deleteTask(taskId, false);
        console.log('✅ 测试任务已删除\n');

    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message || error);
        console.error(error);
    }
}

// 运行测试
testUpdateMethods().catch(console.error);
