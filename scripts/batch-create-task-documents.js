#!/usr/bin/env node

/**
 * 批量为今天创建的任务生成文档的自动化脚本
 * 使用方式: node scripts/batch-create-task-documents.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const API_BASE_URL = 'http://localhost:8081/api/v1';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const TODAY = '2025-08-18';

// 全局变量
let authToken = '';

/**
 * 登录获取Token
 */
async function login() {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: USERNAME,
            password: PASSWORD
        });
        
        if (response.data.success) {
            authToken = response.data.data.token;
            console.log('✅ 登录成功');
            return true;
        } else {
            console.error('❌ 登录失败:', response.data.message);
            return false;
        }
    } catch (error) {
        console.error('❌ 登录请求失败:', error.message);
        return false;
    }
}

/**
 * 获取今天创建的所有任务
 */
async function getTodaysTasks() {
    try {
        const response = await axios.get(`${API_BASE_URL}/projects/1/tasks?page=1&page_size=100`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            // 过滤今天创建的任务
            const todaysTasks = response.data.data.data.filter(task => 
                task.created_at.startsWith(TODAY)
            );
            
            console.log(`📋 找到 ${todaysTasks.length} 个今天创建的任务`);
            return todaysTasks;
        } else {
            console.error('❌ 获取任务失败:', response.data.message);
            return [];
        }
    } catch (error) {
        console.error('❌ 获取任务请求失败:', error.message);
        return [];
    }
}

/**
 * 检查任务是否已有文档
 */
async function getTaskDocuments(taskId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/projects/1/tasks/${taskId}/documents`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            return response.data.documents || response.data.data?.documents || [];
        }
        return [];
    } catch (error) {
        // 404 表示没有文档，这是正常的
        if (error.response?.status === 404) {
            return [];
        }
        console.warn(`⚠️  获取任务 ${taskId} 的文档失败:`, error.message);
        return [];
    }
}

/**
 * 根据任务信息生成文档内容
 */
function generateDocumentContent(task) {
    const taskType = detectTaskType(task);
    
    const baseContent = `# ${task.title}

## 任务概述
**任务ID**: ${task.id}  
**创建时间**: ${task.created_at}  
**状态**: ${task.status}  
**优先级**: ${task.priority || '未设置'}  

## 任务描述
${task.description || '暂无详细描述'}

## 技术要点
${generateTechPoints(task, taskType)}

## 实施计划
${generateImplementationPlan(task, taskType)}

## 验收标准
${generateAcceptanceCriteria(task, taskType)}

## 预估工时
${task.custom_fields?.estimated_hours || 2} 小时

---
*文档自动生成时间: ${new Date().toISOString()}*
*生成工具: Claude Code 自动化脚本*`;

    return baseContent;
}

/**
 * 检测任务类型
 */
function detectTaskType(task) {
    const title = task.title.toLowerCase();
    const description = (task.description || '').toLowerCase();
    
    if (title.includes('bug') || title.includes('修复') || title.includes('fix')) {
        return 'bug_fix';
    } else if (title.includes('部署') || title.includes('deploy')) {
        return 'deployment';
    } else if (title.includes('文档') || title.includes('document')) {
        return 'documentation';
    } else if (title.includes('重构') || title.includes('refactor')) {
        return 'refactor';
    } else if (title.includes('第一阶段') || title.includes('第二阶段') || title.includes('第三阶段')) {
        return 'project_phase';
    } else {
        return 'feature';
    }
}

/**
 * 生成技术要点
 */
function generateTechPoints(task, taskType) {
    switch (taskType) {
        case 'bug_fix':
            return `### 问题分析
- 根本原因分析和定位
- 影响范围评估
- 修复方案设计

### 技术细节
- 涉及的文件和代码位置
- 数据流和逻辑修复
- 兼容性考虑`;

        case 'feature':
            return `### 功能设计
- 用户需求分析
- 技术方案选择
- 接口设计

### 技术实现
- 前端组件开发
- 后端API设计
- 数据库改动（如需要）`;

        case 'deployment':
            return `### 部署配置
- 环境准备和配置
- 依赖项检查
- 部署脚本编写

### 监控和验证
- 部署状态检查
- 性能监控
- 回滚预案`;

        case 'project_phase':
            return `### 阶段目标
- 核心功能列表
- 技术架构设计
- 质量标准定义

### 关键技术
- 前端技术栈
- 后端技术选型
- 数据处理方案`;

        default:
            return `### 技术分析
- 需求技术评估
- 实现方案设计
- 风险点识别

### 开发要点
- 核心功能实现
- 测试策略规划
- 性能优化考虑`;
    }
}

/**
 * 生成实施计划
 */
function generateImplementationPlan(task, taskType) {
    const estimatedHours = task.custom_fields?.estimated_hours || 2;
    
    if (taskType === 'project_phase') {
        return `### 分阶段实施
1. **需求分析** (${Math.round(estimatedHours * 0.2)}小时)
2. **设计方案** (${Math.round(estimatedHours * 0.3)}小时)  
3. **开发实现** (${Math.round(estimatedHours * 0.4)}小时)
4. **测试验证** (${Math.round(estimatedHours * 0.1)}小时)`;
    } else {
        return `### 实施步骤
1. **准备阶段** - 环境和依赖检查
2. **实现阶段** - 核心功能开发
3. **测试阶段** - 功能测试和验证
4. **发布阶段** - 部署和上线确认`;
    }
}

/**
 * 生成验收标准
 */
function generateAcceptanceCriteria(task, taskType) {
    switch (taskType) {
        case 'bug_fix':
            return `1. ✅ Bug现象完全消失
2. ✅ 相关功能正常工作
3. ✅ 无新的回归问题
4. ✅ 代码review通过`;

        case 'feature':
            return `1. ✅ 功能按需求正确实现
2. ✅ 用户界面友好易用
3. ✅ 性能指标满足要求
4. ✅ 兼容性测试通过`;

        case 'deployment':
            return `1. ✅ 部署流程顺利完成
2. ✅ 服务状态健康正常
3. ✅ 功能验证全部通过
4. ✅ 监控指标正常`;

        default:
            return `1. ✅ 任务目标完全达成
2. ✅ 质量标准满足要求
3. ✅ 文档更新完整
4. ✅ 相关测试通过`;
    }
}

/**
 * 创建文档
 */
async function createDocument(title, content, description, projectId = 1, taskId = null) {
    try {
        const docData = {
            title,
            content,
            description,
            type: 'markdown',
            status: 'draft',
            project_id: projectId,
            is_template: false
        };

        const response = await axios.post(`${API_BASE_URL}/documents`, docData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (response.data.success) {
            const documentId = response.data.data.id;
            
            // 如果指定了taskId，将文档关联到任务
            if (taskId) {
                await attachDocumentToTask(projectId, taskId, documentId);
            }
            
            return documentId;
        } else {
            console.error('❌ 创建文档失败:', response.data.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 创建文档请求失败:', error.response?.data?.message || error.message);
        return null;
    }
}

/**
 * 将文档关联到任务
 */
async function attachDocumentToTask(projectId, taskId, documentId) {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/documents/${documentId}/attach`,
            { relationship_type: 'main' },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (response.data.success) {
            return true;
        } else {
            console.warn(`⚠️  文档 ${documentId} 关联到任务 ${taskId} 失败:`, response.data.message);
            return false;
        }
    } catch (error) {
        console.warn(`⚠️  文档 ${documentId} 关联请求失败:`, error.response?.data?.message || error.message);
        return false;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 开始批量创建任务文档...\n');
    
    // 1. 登录
    if (!(await login())) {
        process.exit(1);
    }
    
    // 2. 获取今天的任务
    const tasks = await getTodaysTasks();
    if (tasks.length === 0) {
        console.log('📋 没有找到今天创建的任务');
        return;
    }
    
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    // 3. 为每个任务创建文档
    for (const task of tasks) {
        console.log(`\n📝 处理任务 ${task.id}: ${task.title}`);
        
        // 检查是否已有文档
        const existingDocs = await getTaskDocuments(task.id);
        if (existingDocs.length > 0) {
            console.log(`   ⏭️  跳过 - 已有 ${existingDocs.length} 个文档`);
            skippedCount++;
            continue;
        }
        
        // 生成文档内容
        const content = generateDocumentContent(task);
        const title = `${task.title} - 技术文档`;
        const description = `任务${task.id}的自动生成技术文档`;
        
        // 创建文档
        const documentId = await createDocument(title, content, description, 1, task.id);
        
        if (documentId) {
            console.log(`   ✅ 成功创建文档 ${documentId}`);
            createdCount++;
        } else {
            console.log(`   ❌ 创建文档失败`);
            failedCount++;
        }
        
        // 短暂延迟避免API压力
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 4. 输出统计结果
    console.log(`\n📊 批量创建完成:`);
    console.log(`   ✅ 成功创建: ${createdCount} 个文档`);
    console.log(`   ⏭️  跳过已有: ${skippedCount} 个任务`);
    console.log(`   ❌ 创建失败: ${failedCount} 个任务`);
    console.log(`   📋 总处理数: ${tasks.length} 个任务`);
}

// 运行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('💥 脚本执行失败:', error.message);
        process.exit(1);
    });
}

module.exports = { main };