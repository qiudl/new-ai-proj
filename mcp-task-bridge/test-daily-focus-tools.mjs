#!/usr/bin/env node

/**
 * 测试新添加的Daily Focus Tools是否在MCP中正常工作
 */

import { spawn } from 'child_process';
import { readFile } from 'fs/promises';

const API_BASE = process.env.TASK_API_BASE || 'http://localhost:8080/api/v1';

async function testMCPTools() {
    console.log('🧪 测试Daily Focus MCP工具集成...\n');
    
    try {
        // 读取index.ts文件检查工具定义
        const indexContent = await readFile('./index.ts', 'utf-8');
        
        // 检查是否包含Daily Focus工具
        const dailyFocusTools = [
            'get_daily_focus_tasks',
            'add_daily_focus_task',
            'update_daily_focus_task',
            'remove_daily_focus_task',
            'complete_daily_focus_task',
            'get_daily_focus_stats',
            'get_task_recommendations',
            'batch_add_daily_focus_tasks',
            'clear_completed_tasks',
            'quick_add_current_task',
            'focus_task_with_timer'
        ];
        
        console.log('📋 检查工具定义...');
        const missingTools = [];
        const presentTools = [];
        
        for (const tool of dailyFocusTools) {
            if (indexContent.includes(`name: '${tool}'`)) {
                presentTools.push(tool);
                console.log(`✅ ${tool}`);
            } else {
                missingTools.push(tool);
                console.log(`❌ ${tool}`);
            }
        }
        
        console.log(`\n📊 统计结果:`);
        console.log(`✅ 已添加: ${presentTools.length}/${dailyFocusTools.length}`);
        console.log(`❌ 缺失: ${missingTools.length}/${dailyFocusTools.length}`);
        
        if (missingTools.length > 0) {
            console.log('\n❌ 缺失的工具:');
            missingTools.forEach(tool => console.log(`   - ${tool}`));
        }
        
        // 检查case处理
        console.log('\n🔧 检查case处理...');
        const missingCases = [];
        const presentCases = [];
        
        for (const tool of dailyFocusTools) {
            if (indexContent.includes(`case '${tool}':`)) {
                presentCases.push(tool);
                console.log(`✅ case '${tool}'`);
            } else {
                missingCases.push(tool);
                console.log(`❌ case '${tool}'`);
            }
        }
        
        console.log(`\n📊 Case处理统计:`);
        console.log(`✅ 已添加: ${presentCases.length}/${dailyFocusTools.length}`);
        console.log(`❌ 缺失: ${missingCases.length}/${dailyFocusTools.length}`);
        
        if (missingCases.length > 0) {
            console.log('\n❌ 缺失的case处理:');
            missingCases.forEach(tool => console.log(`   - case '${tool}'`));
        }
        
        // 语法检查
        console.log('\n🔍 基础语法检查...');
        const syntaxErrors = [];
        
        // 检查常见语法错误
        if (indexContent.includes('name: undefined') || indexContent.includes('case undefined')) {
            syntaxErrors.push('发现undefined引用');
        }
        
        // 检查大括号匹配
        const openBraces = (indexContent.match(/{/g) || []).length;
        const closeBraces = (indexContent.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
            syntaxErrors.push(`大括号不匹配: { ${openBraces} vs } ${closeBraces}`);
        }
        
        // 检查方括号匹配
        const openBrackets = (indexContent.match(/\[/g) || []).length;
        const closeBrackets = (indexContent.match(/\]/g) || []).length;
        if (openBrackets !== closeBrackets) {
            syntaxErrors.push(`方括号不匹配: [ ${openBrackets} vs ] ${closeBrackets}`);
        }
        
        if (syntaxErrors.length === 0) {
            console.log('✅ 基础语法检查通过');
        } else {
            console.log('❌ 发现语法问题:');
            syntaxErrors.forEach(error => console.log(`   - ${error}`));
        }
        
        // 总结
        console.log('\n🎯 集成状态总结:');
        const toolsComplete = missingTools.length === 0;
        const casesComplete = missingCases.length === 0;
        const syntaxClean = syntaxErrors.length === 0;
        
        if (toolsComplete && casesComplete && syntaxClean) {
            console.log('🎉 Daily Focus工具已完全集成到MCP桥！');
            console.log('✅ 所有工具定义已添加');
            console.log('✅ 所有case处理已添加');
            console.log('✅ 语法检查通过');
        } else {
            console.log('⚠️  集成未完成:');
            if (!toolsComplete) console.log('   - 工具定义不完整');
            if (!casesComplete) console.log('   - case处理不完整');
            if (!syntaxClean) console.log('   - 存在语法问题');
        }
        
        return {
            toolsComplete,
            casesComplete,
            syntaxClean,
            presentTools,
            presentCases,
            missingTools,
            missingCases,
            syntaxErrors
        };
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
        return { error: error.message };
    }
}

// 运行测试
testMCPTools().then(result => {
    if (result.error) {
        process.exit(1);
    } else if (result.toolsComplete && result.casesComplete && result.syntaxClean) {
        console.log('\n🚀 可以开始测试Daily Focus功能了！');
        process.exit(0);
    } else {
        console.log('\n⏳ 需要完成剩余的集成工作');
        process.exit(1);
    }
}).catch(console.error);
