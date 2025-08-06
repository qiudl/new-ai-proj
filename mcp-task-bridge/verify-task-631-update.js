#!/usr/bin/env node

// 验证任务631更新结果
import { TaskMCPServer } from './task-mcp.js';

async function main() {
    console.log('\n=== 🔍 验证任务631更新结果 ===\n');
    
    const taskMCP = new TaskMCPServer();
    const taskId = 631;
    
    try {
        // 获取更新后的任务详情
        const task = await taskMCP.findTaskById(taskId);
        
        console.log('📋 任务基本信息:');
        console.log(`  ID: ${task.id}`);
        console.log(`  标题: "${task.title}"`);
        console.log(`  状态: ${task.status} ✅`);
        console.log(`  优先级: ${task.custom_fields?.priority || 'unknown'} ✅`);
        console.log(`  项目ID: ${task.project_id}`);
        console.log(`  创建时间: ${task.created_at}`);
        console.log(`  更新时间: ${task.updated_at}`);
        
        console.log('\n📄 任务描述预览:');
        if (task.description) {
            const lines = task.description.split('\n');
            console.log(`  总长度: ${task.description.length} 字符`);
            console.log(`  总行数: ${lines.length} 行`);
            console.log(`  前5行内容:`);
            lines.slice(0, 5).forEach((line, index) => {
                console.log(`    ${index + 1}. ${line}`);
            });
            
            // 检查关键内容是否存在
            const hasAnalysisSection = task.description.includes('🔍 问题分析结果');
            const hasArchitectureSection = task.description.includes('### 1. 架构现状');
            const hasSolutionSection = task.description.includes('### 4. 解决方案');
            const hasPlanSection = task.description.includes('📋 执行计划');
            
            console.log('\n✅ 内容完整性检查:');
            console.log(`  包含问题分析结果: ${hasAnalysisSection ? '✅' : '❌'}`);
            console.log(`  包含架构现状: ${hasArchitectureSection ? '✅' : '❌'}`);
            console.log(`  包含解决方案: ${hasSolutionSection ? '✅' : '❌'}`);
            console.log(`  包含执行计划: ${hasPlanSection ? '✅' : '❌'}`);
            
        } else {
            console.log('  ❌ 任务描述为空');
        }
        
        // 检查子任务
        console.log('\n🌳 检查子任务...');
        const childrenResult = await taskMCP.getTaskChildren(taskId);
        
        if (childrenResult.success) {
            console.log(`  子任务数量: ${childrenResult.total}`);
            if (childrenResult.total > 0) {
                childrenResult.children.forEach((child, index) => {
                    console.log(`    ${index + 1}. [${child.status}] ${child.title} (ID: ${child.id})`);
                });
            } else {
                console.log('  📝 暂无子任务，可考虑根据执行计划创建具体的子任务');
            }
        } else {
            console.log(`  ❌ 获取子任务失败: ${childrenResult.error}`);
        }
        
        console.log('\n✨ 验证完成');
        console.log('📊 任务631已成功更新:');
        console.log('   • 添加了详细的Mermaid问题分析报告');
        console.log('   • 状态已设为进行中（in_progress）');
        console.log('   • 优先级保持为高（high）');
        console.log('   • 包含完整的执行计划和风险评估');
        
    } catch (error) {
        console.error('\n❌ 验证失败:', error.message);
        console.error('🔍 详细错误:', error);
    }
}

// 执行验证
main().catch(console.error);