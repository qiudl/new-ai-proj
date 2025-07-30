#!/usr/bin/env node

// 前端AI任务生成集成测试
const fs = require('fs');
const path = require('path');

/**
 * 检查前端服务是否使用了正确的API路径
 */
function checkFrontendApiIntegration() {
    console.log('🔍 检查前端AI任务生成API集成...\n');
    
    const frontendServicePath = path.join(__dirname, 'frontend/src/services/aiTaskGeneratorService.ts');
    
    if (!fs.existsSync(frontendServicePath)) {
        console.log('❌ 前端服务文件不存在:', frontendServicePath);
        return false;
    }
    
    const content = fs.readFileSync(frontendServicePath, 'utf8');
    
    // 检查API路径
    const checks = [
        {
            name: '生成任务API路径',
            pattern: /\/api\/v1\/system\/ai-tasks\/generate/,
            exists: content.includes('/api/v1/system/ai-tasks/generate')
        },
        {
            name: '验证任务API路径',
            pattern: /\/api\/v1\/system\/ai-tasks\/validate/,
            exists: content.includes('/api/v1/system/ai-tasks/validate')
        },
        {
            name: '优化任务API路径',
            pattern: /\/api\/v1\/system\/ai-tasks\/optimize/,
            exists: content.includes('/api/v1/system/ai-tasks/optimize')
        },
        {
            name: 'Authorization头设置',
            pattern: /Authorization.*Bearer/,
            exists: content.includes('Authorization') && content.includes('Bearer')
        },
        {
            name: 'generateTasks方法',
            pattern: /async generateTasks/,
            exists: content.includes('async generateTasks')
        }
    ];
    
    let allPassed = true;
    
    checks.forEach(check => {
        if (check.exists) {
            console.log(`✅ ${check.name}: 已正确配置`);
        } else {
            console.log(`❌ ${check.name}: 配置错误或缺失`);
            allPassed = false;
        }
    });
    
    return allPassed;
}

/**
 * 检查前端组件是否正确调用服务
 */
function checkFrontendComponents() {
    console.log('\n🔍 检查前端组件集成...\n');
    
    const componentPaths = [
        'frontend/src/components/AITaskGenerator.tsx',
        'frontend/src/pages/AITaskManagerPage.tsx'
    ];
    
    let componentsExist = 0;
    let componentsUsingService = 0;
    
    componentPaths.forEach(componentPath => {
        const fullPath = path.join(__dirname, componentPath);
        
        if (fs.existsSync(fullPath)) {
            componentsExist++;
            console.log(`✅ 组件存在: ${componentPath}`);
            
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // 检查是否导入了服务
            if (content.includes('aiTaskGeneratorService') || content.includes('AITaskGeneratorService')) {
                componentsUsingService++;
                console.log(`✅ 组件使用服务: ${componentPath}`);
                
                // 检查是否调用了generateTasks方法
                if (content.includes('generateTasks')) {
                    console.log(`✅ 组件调用生成方法: ${componentPath}`);
                } else {
                    console.log(`⚠️ 组件未调用生成方法: ${componentPath}`);
                }
            } else {
                console.log(`❌ 组件未使用服务: ${componentPath}`);
            }
        } else {
            console.log(`❌ 组件不存在: ${componentPath}`);
        }
    });
    
    console.log(`\n📊 组件统计:`);
    console.log(`   存在的组件: ${componentsExist}/${componentPaths.length}`);
    console.log(`   使用服务的组件: ${componentsUsingService}/${componentsExist}`);
    
    return componentsUsingService > 0;
}

/**
 * 检查类型定义
 */
function checkTypeDefinitions() {
    console.log('\n🔍 检查类型定义...\n');
    
    const typePath = path.join(__dirname, 'frontend/src/types/aiTaskGenerator.ts');
    
    if (!fs.existsSync(typePath)) {
        console.log('❌ 类型定义文件不存在:', typePath);
        return false;
    }
    
    const content = fs.readFileSync(typePath, 'utf8');
    
    const typeChecks = [
        'AITaskGenerationRequest',
        'AITaskGenerationResponse',
        'GeneratedSubTask',
        'AIProvider'
    ];
    
    let allTypesExist = true;
    
    typeChecks.forEach(typeName => {
        if (content.includes(typeName)) {
            console.log(`✅ 类型定义存在: ${typeName}`);
        } else {
            console.log(`❌ 类型定义缺失: ${typeName}`);
            allTypesExist = false;
        }
    });
    
    return allTypesExist;
}

/**
 * 生成集成测试建议
 */
function generateIntegrationSuggestions() {
    console.log('\n🎯 前端集成测试建议:\n');
    
    const suggestions = [
        {
            title: '手动测试步骤',
            items: [
                '1. 启动前端开发服务器: cd frontend && npm start',
                '2. 登录系统并进入AI任务管理页面',
                '3. 测试任务生成功能，输入需求描述',
                '4. 检查生成的任务是否显示正确',
                '5. 验证错误处理和加载状态'
            ]
        },
        {
            title: '集成测试要点',
            items: [
                '✓ API调用是否使用正确的端点路径',
                '✓ 请求格式是否与后端API匹配',
                '✓ 响应数据解析是否正确',
                '✓ 错误处理是否完善',
                '✓ 加载状态是否友好'
            ]
        },
        {
            title: '常见问题排查',
            items: [
                '• 检查浏览器网络面板中的API请求',
                '• 确认token是否正确传递',
                '• 验证请求体格式是否正确',
                '• 检查CORS配置是否正确',
                '• 确认前端路由配置'
            ]
        }
    ];
    
    suggestions.forEach(suggestion => {
        console.log(`📋 ${suggestion.title}:`);
        suggestion.items.forEach(item => {
            console.log(`   ${item}`);
        });
        console.log('');
    });
}

/**
 * 创建简单的前端测试用例
 */
function createFrontendTestCase() {
    console.log('🧪 创建前端测试用例...\n');
    
    const testContent = `
// AI任务生成前端测试用例
import aiTaskGeneratorService from '../services/aiTaskGeneratorService';

// 测试AI任务生成
async function testAITaskGeneration() {
    console.log('开始测试AI任务生成...');
    
    try {
        const request = {
            project_id: 39, // 替换为实际项目ID
            provider: "deepseek",
            input_text: "开发一个用户管理模块，包括增删改查功能",
            options: {
                max_tasks: 5,
                enable_duplicate_check: true,
                enable_dependency_analysis: true,
                enable_skill_tagging: true
            }
        };
        
        console.log('发送请求:', request);
        
        const response = await aiTaskGeneratorService.generateTasks(request);
        
        if (response.success) {
            console.log('✅ 任务生成成功!');
            console.log('生成的任务数量:', response.data.generation_result.total_tasks);
            console.log('生成的任务:', response.data.generation_result.generated_tasks);
        } else {
            console.error('❌ 任务生成失败:', response.error);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

// 在浏览器控制台中运行
// testAITaskGeneration();

export { testAITaskGeneration };
    `;
    
    const testFilePath = path.join(__dirname, 'frontend/src/utils/aiTaskGeneratorTest.js');
    
    try {
        // 确保目录存在
        const dir = path.dirname(testFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(testFilePath, testContent.trim());
        console.log(`✅ 测试用例已创建: ${testFilePath}`);
        console.log('可以在浏览器控制台中导入并运行测试');
    } catch (error) {
        console.log(`❌ 创建测试用例失败:`, error.message);
    }
}

/**
 * 主函数
 */
function main() {
    console.log('🚀 AI任务生成前端集成检查\n');
    console.log('=' .repeat(50));
    
    const apiIntegrationOk = checkFrontendApiIntegration();
    const componentsOk = checkFrontendComponents();
    const typesOk = checkTypeDefinitions();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 检查结果汇总:\n');
    
    console.log(`API集成: ${apiIntegrationOk ? '✅ 正常' : '❌ 有问题'}`);
    console.log(`组件集成: ${componentsOk ? '✅ 正常' : '❌ 有问题'}`);
    console.log(`类型定义: ${typesOk ? '✅ 正常' : '❌ 有问题'}`);
    
    const overallScore = [apiIntegrationOk, componentsOk, typesOk].filter(Boolean).length;
    console.log(`\n总体评分: ${overallScore}/3 ${overallScore === 3 ? '🎉' : overallScore >= 2 ? '👍' : '⚠️'}`);
    
    if (overallScore === 3) {
        console.log('\n🎉 前端集成检查通过！可以进行实际测试。');
    } else {
        console.log('\n⚠️ 发现一些问题，建议先修复后再测试。');
    }
    
    generateIntegrationSuggestions();
    createFrontendTestCase();
}

// 运行检查
main();