#!/usr/bin/env node

// 测试完整功能版本的高级功能

import { TaskMCPServer } from './task-mcp-full.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

console.log('=== MCP完整功能版本测试 ===\n');

const taskServer = new TaskMCPServer(
    process.env.TASK_API_BASE || 'http://localhost:8081/api/v1'
);

async function testAdvancedFeatures() {
    try {
        console.log('1. 测试项目管理功能...');
        const projects = await taskServer.listProjects();
        console.log('项目列表:', projects.success ? `找到${projects.data?.length || 0}个项目` : projects.error);

        console.log('\n2. 测试子任务创建...');
        // 为任务637创建子任务
        const subtask = await taskServer.createSubTask(637, '测试子任务功能', '这是一个测试子任务');
        console.log('子任务创建结果:', subtask);

        console.log('\n3. 测试任务详细信息获取...');
        const detailInfo = await taskServer.getDetailedTaskInfo(637);
        console.log('详细信息:', detailInfo.success ? '获取成功' : detailInfo.error);

        console.log('\n4. 测试按名称查找任务...');
        const taskByName = await taskServer.findTaskByName('测试createBatchDocuments功能');
        console.log('按名称查找:', taskByName);

        console.log('\n5. 测试计时器功能...');
        const timerStart = await taskServer.startTimer(637, '测试计时器', '开发');
        console.log('开始计时:', timerStart);

        // 等待一秒
        await new Promise(resolve => setTimeout(resolve, 1000));

        const currentTimer = await taskServer.getCurrentTimer();
        console.log('当前计时状态:', currentTimer);

        const timerStop = await taskServer.stopTimer();
        console.log('停止计时:', timerStop);

        console.log('\n6. 测试文档模板生成...');
        const templateDoc = await taskServer.generateDocumentFromTemplate(
            'test_report',
            {
                title: '测试报告模板',
                taskId: 637,
                projectId: 1,
                requirements: '测试完整功能版本的各项能力'
            },
            false
        );
        console.log('模板生成:', templateDoc);

        console.log('\n✅ 完整功能版本测试完成！');
        
    } catch (error) {
        console.error('❌ 测试过程中出错：', error.message);
    }
}

testAdvancedFeatures();
