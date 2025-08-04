#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function testDocumentTools() {
    console.log('🧪 开始测试任务文档工具...\n');
    
    // 1. 测试创建/更新文档
    console.log('1. 测试创建任务文档...');
    const createResult = await taskServer.createOrUpdateTaskDocument(
        105, // 使用任务105
        '# 任务文档测试\n\n这是通过MCP接口创建的文档内容。\n\n## 功能测试\n- 创建文档 ✓\n- 更新文档\n- 获取文档\n- 删除文档',
        '任务105文档'
    );
    console.log('创建结果:', JSON.stringify(createResult, null, 2));
    console.log('');
    
    // 2. 测试检查文档是否存在
    console.log('2. 测试检查文档是否存在...');
    const hasResult = await taskServer.hasTaskDocument(105);
    console.log('检查结果:', JSON.stringify(hasResult, null, 2));
    console.log('');
    
    // 3. 测试获取文档
    console.log('3. 测试获取文档内容...');
    const getResult = await taskServer.getTaskDocument(105);
    console.log('获取结果:', JSON.stringify(getResult, null, 2));
    console.log('');
    
    // 4. 测试更新文档
    console.log('4. 测试更新文档内容...');
    const updateResult = await taskServer.createOrUpdateTaskDocument(
        105,
        '# 任务文档测试 (已更新)\n\n这是通过MCP接口更新的文档内容。\n\n## 功能测试\n- 创建文档 ✓\n- 更新文档 ✓\n- 获取文档 ✓\n- 删除文档 (待测试)',
        '任务105文档 (更新版)'
    );
    console.log('更新结果:', JSON.stringify(updateResult, null, 2));
    console.log('');
    
    // 5. 验证更新后的内容
    console.log('5. 验证更新后的内容...');
    const getUpdatedResult = await taskServer.getTaskDocument(105);
    console.log('更新后内容:', JSON.stringify(getUpdatedResult, null, 2));
    console.log('');
    
    console.log('✅ 文档工具测试完成！');
}

testDocumentTools().catch(console.error);
