#!/usr/bin/env node

/**
 * 测试父任务搜索API的脚本
 * 用于分析为什么search-parents API会返回当前选中的任务
 */
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080';

async function testSearchParentsAPI() {
    console.log('🔍 测试父任务搜索API');
    console.log('===============================');
    
    try {
        // 测试参数
        const projectId = 1; // 假设项目ID为1
        const currentTaskId = 400; // 假设当前任务ID为400（需要替换为实际的任务ID）
        
        // 1. 测试基本搜索（无排除参数）
        console.log('\n1. 测试基本搜索（无排除参数）');
        console.log('----------------------------');
        
        const basicSearchUrl = `${API_BASE_URL}/api/projects/${projectId}/tasks/search-parents`;
        const basicSearchParams = {
            keyword: '',
            max_level: 3,
            page: 1,
            page_size: 20
        };
        
        console.log(`📍 URL: ${basicSearchUrl}`);
        console.log(`📍 参数:`, basicSearchParams);
        
        const basicResponse = await axios.get(basicSearchUrl, { 
            params: basicSearchParams,
            timeout: 10000
        });
        
        console.log(`✅ 状态码: ${basicResponse.status}`);
        console.log(`✅ 返回任务数量: ${basicResponse.data?.data?.data?.length || 0}`);
        
        // 检查是否包含当前任务ID
        const basicTasks = basicResponse.data?.data?.data || [];
        const foundCurrentTaskInBasic = basicTasks.find(task => task.id === currentTaskId);
        if (foundCurrentTaskInBasic) {
            console.log(`⚠️  警告: 基本搜索返回了当前任务 ID ${currentTaskId}`);
            console.log(`   任务详情: ${foundCurrentTaskInBasic.title}`);
        } else {
            console.log(`✅ 基本搜索未返回当前任务 ID ${currentTaskId}（正常）`);
        }
        
        // 2. 测试带排除参数的搜索
        console.log('\n2. 测试带排除参数的搜索');
        console.log('----------------------------');
        
        const excludeSearchParams = {
            ...basicSearchParams,
            exclude_task_id: currentTaskId
        };
        
        console.log(`📍 URL: ${basicSearchUrl}`);
        console.log(`📍 参数:`, excludeSearchParams);
        
        const excludeResponse = await axios.get(basicSearchUrl, { 
            params: excludeSearchParams,
            timeout: 10000
        });
        
        console.log(`✅ 状态码: ${excludeResponse.status}`);
        console.log(`✅ 返回任务数量: ${excludeResponse.data?.data?.data?.length || 0}`);
        
        // 检查是否包含当前任务ID
        const excludeTasks = excludeResponse.data?.data?.data || [];
        const foundCurrentTaskInExclude = excludeTasks.find(task => task.id === currentTaskId);
        if (foundCurrentTaskInExclude) {
            console.log(`❌ 错误: 即使设置了exclude_task_id=${currentTaskId}，仍然返回了当前任务`);
            console.log(`   任务详情: ${foundCurrentTaskInExclude.title}`);
            console.log(`   这表明excludeTaskID参数可能没有正确处理`);
        } else {
            console.log(`✅ 排除搜索正确排除了当前任务 ID ${currentTaskId}`);
        }
        
        // 3. 分析SQL查询逻辑
        console.log('\n3. API实现分析');
        console.log('----------------------------');
        console.log('根据代码分析，SearchParentTasks函数的逻辑：');
        console.log('- 路由: GET /api/projects/:id/tasks/search-parents');
        console.log('- Handler: searchParentTasksHandler');
        console.log('- 数据库方法: SearchParentTasks');
        console.log('');
        console.log('SQL查询构建逻辑：');
        console.log('1. 基本条件: project_id = ? AND deleted_at IS NULL');
        console.log('2. 层级过滤: task_level <= max_level');
        console.log('3. 排除条件: id != exclude_task_id (如果提供)');
        console.log('4. 关键词搜索: title ILIKE %keyword% OR description ILIKE %keyword%');
        
        // 4. 显示实际返回的任务信息
        console.log('\n4. 返回的任务信息');
        console.log('----------------------------');
        
        const tasksToShow = excludeTasks.slice(0, 5); // 显示前5个任务
        tasksToShow.forEach((task, index) => {
            console.log(`${index + 1}. ID: ${task.id}, Title: ${task.title}, Level: ${task.task_level || 'N/A'}`);
        });
        
        if (excludeTasks.length > 5) {
            console.log(`... 还有 ${excludeTasks.length - 5} 个任务`);
        }
        
        // 5. 建议的修复方案
        console.log('\n5. 问题诊断和修复建议');
        console.log('----------------------------');
        
        if (foundCurrentTaskInExclude) {
            console.log('❌ 发现问题: exclude_task_id参数未生效');
            console.log('');
            console.log('可能的原因：');
            console.log('1. 前端传递的参数名或值不正确');
            console.log('2. 后端Handler中参数解析错误');
            console.log('3. SQL查询构建时条件添加错误');
            console.log('4. 数据类型不匹配（字符串vs整数）');
            console.log('');
            console.log('修复建议：');
            console.log('1. 检查前端传递的参数名是否为 exclude_task_id');
            console.log('2. 检查后端Handler中 c.Query("exclude_task_id") 的解析');
            console.log('3. 检查SQL条件 id != ? 是否正确添加');
            console.log('4. 添加调试日志查看excludeTaskID的值');
        } else {
            console.log('✅ exclude_task_id参数工作正常');
        }
        
    } catch (error) {
        console.error('❌ API测试失败:', error.message);
        
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        } else if (error.request) {
            console.error('请求错误:', error.request);
        }
        
        console.log('\n可能的原因：');
        console.log('1. 后端服务未启动 (http://localhost:8080)');
        console.log('2. 项目ID或任务ID不存在');
        console.log('3. API路由配置错误');
        console.log('4. 数据库连接问题');
    }
}

// 运行测试
testSearchParentsAPI().then(() => {
    console.log('\n🏁 测试完成');
}).catch((error) => {
    console.error('❌ 测试脚本执行失败:', error);
    process.exit(1);
});