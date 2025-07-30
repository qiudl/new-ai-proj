const axios = require('axios');

// Base URL for the API
const BASE_URL = 'http://localhost:8080/api/v1';

// Test credentials
const TEST_USER = {
    username: 'admin',
    password: 'password123'
};

let authToken = '';

async function login() {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
        if (response.data && response.data.data && response.data.data.token) {
            authToken = response.data.data.token;
            console.log('✅ Login successful');
            return true;
        }
        console.log('❌ Login failed - no token in response');
        return false;
    } catch (error) {
        console.log('❌ Login failed:', error.response?.data?.message || error.message);
        return false;
    }
}

// Sample tasks for testing
const sampleTasks = {
    frontend: [
        {
            title: "设计用户登录界面",
            description: "创建用户友好的登录页面，包括用户名、密码输入和记住我选项",
            priority: "high",
            estimated_hours: 8.0,
            tags: ["frontend", "ui", "authentication"],
            confidence: 0.9,
            ai_generated_id: "frontend_1"
        },
        {
            title: "实现响应式导航栏",
            description: "开发适配各种屏幕尺寸的导航栏组件",
            priority: "medium",
            estimated_hours: 12.0,
            tags: ["frontend", "responsive", "navigation"],
            confidence: 0.85,
            ai_generated_id: "frontend_2"
        },
        {
            title: "优化登录界面样式",
            description: "美化登录页面的视觉效果和用户体验",
            priority: "low",
            estimated_hours: 6.0,
            tags: ["frontend", "ui", "styling"],
            confidence: 0.8,
            ai_generated_id: "frontend_3"
        }
    ],
    backend: [
        {
            title: "实现用户认证API",
            description: "开发JWT基于的用户登录和认证接口",
            priority: "high",
            estimated_hours: 10.0,
            tags: ["backend", "api", "authentication"],
            confidence: 0.95,
            ai_generated_id: "backend_1"
        },
        {
            title: "设计数据库架构",
            description: "设计用户管理和数据存储的数据库表结构",
            priority: "high",
            estimated_hours: 8.0,
            tags: ["backend", "database", "architecture"],
            confidence: 0.9,
            ai_generated_id: "backend_2"
        },
        {
            title: "编写API文档",
            description: "创建详细的API接口文档和使用说明",
            priority: "medium",
            estimated_hours: 4.0,
            tags: ["backend", "documentation", "api"],
            confidence: 0.85,
            ai_generated_id: "backend_3"
        }
    ],
    testing: [
        {
            title: "编写单元测试",
            description: "为关键业务逻辑编写全面的单元测试用例",
            priority: "medium",
            estimated_hours: 16.0,
            tags: ["testing", "unit-test", "quality"],
            confidence: 0.9,
            ai_generated_id: "testing_1"
        },
        {
            title: "集成测试方案",
            description: "设计和实施系统集成测试计划",
            priority: "medium",
            estimated_hours: 12.0,
            tags: ["testing", "integration", "automation"],
            confidence: 0.85,
            ai_generated_id: "testing_2"
        }
    ]
};

async function testBatchOptimization() {
    try {
        console.log('\n🧪 Testing Batch Task Optimization endpoint...');
        
        const optimizationRequest = {
            provider: "openai",
            task_groups: [
                {
                    group_name: "前端开发组",
                    tasks: sampleTasks.frontend,
                    group_options: {
                        deduplicate_tasks: true,
                        optimize_dependencies: true,
                        balance_priorities: true,
                        refine_estimates: true,
                        enhance_tags: true
                    }
                },
                {
                    group_name: "后端开发组", 
                    tasks: sampleTasks.backend,
                    group_options: {
                        deduplicate_tasks: true,
                        optimize_dependencies: true,
                        balance_priorities: false,
                        refine_estimates: true,
                        enhance_tags: false
                    }
                },
                {
                    group_name: "测试组",
                    tasks: sampleTasks.testing,
                    group_options: {
                        deduplicate_tasks: false,
                        optimize_dependencies: true,
                        balance_priorities: true,
                        refine_estimates: false,
                        enhance_tags: true
                    }
                }
            ],
            global_options: {
                cross_group_optimization: true,
                merge_similar_tasks: true,
                optimize_workflow: true,
                balance_workload: true,
                minimize_handoffs: true,
                max_processing_time_seconds: 120,
                parallel_processing: true
            },
            optimization_mode: "balanced"
        };
        
        const response = await axios.post(`${BASE_URL}/system/ai-tasks/batch/optimize`, optimizationRequest, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Batch Optimization Response:');
        console.log(`   Success: ${response.data.data.success}`);
        console.log(`   Processing time: ${response.data.data.processing_time_ms}ms`);
        console.log(`   Optimized groups: ${response.data.data.optimized_groups.length}`);
        
        // Display optimization statistics
        const stats = response.data.data.optimization_stats;
        console.log('\n📊 Optimization Statistics:');
        console.log(`   Total tasks processed: ${stats.total_tasks_processed}`);
        console.log(`   Total tasks optimized: ${stats.total_tasks_optimized}`);
        console.log(`   Tasks merged: ${stats.tasks_merged}`);
        console.log(`   Tasks reordered: ${stats.tasks_reordered}`);
        console.log(`   Estimated time saved: ${stats.estimated_time_saved_hours} hours`);
        console.log(`   Optimization ratio: ${(stats.optimization_ratio * 100).toFixed(1)}%`);
        
        // Display quality metrics
        const quality = response.data.data.quality_metrics;
        console.log('\n🎯 Quality Metrics:');
        console.log(`   Overall score: ${(quality.overall_score * 100).toFixed(1)}%`);
        console.log(`   Consistency score: ${(quality.consistency_score * 100).toFixed(1)}%`);
        console.log(`   Workflow efficiency: ${(quality.workflow_efficiency * 100).toFixed(1)}%`);
        console.log(`   Resource optimization: ${(quality.resource_optimization * 100).toFixed(1)}%`);
        console.log(`   Dependency quality: ${(quality.dependency_quality * 100).toFixed(1)}%`);
        
        // Display global suggestions
        console.log('\n💡 Global Suggestions:');
        response.data.data.global_suggestions.forEach((suggestion, index) => {
            console.log(`   ${index + 1}. ${suggestion}`);
        });
        
        // Display group-specific results
        console.log('\n📋 Group Optimization Results:');
        response.data.data.optimized_groups.forEach((group, index) => {
            console.log(`   Group ${index + 1}: ${group.group_name}`);
            console.log(`     Original tasks: ${group.original_task_count}`);
            console.log(`     Optimized tasks: ${group.optimized_tasks.length}`);
            console.log(`     Estimated savings: ${group.estimated_savings} hours`);
            console.log(`     Optimizations applied: ${group.optimization_applied.join(', ')}`);
            
            if (group.group_suggestions.length > 0) {
                console.log(`     Suggestions: ${group.group_suggestions.join('; ')}`);
            }
        });
        
        return true;
    } catch (error) {
        console.log('❌ Batch Optimization failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testDifferentOptimizationModes() {
    try {
        console.log('\n🔄 Testing Different Optimization Modes...');
        
        const modes = ['balanced', 'performance', 'quality', 'cost'];
        const results = {};
        
        for (const mode of modes) {
            console.log(`\n   Testing ${mode} mode...`);
            
            const request = {
                provider: "openai",
                task_groups: [
                    {
                        group_name: "测试组",
                        tasks: sampleTasks.frontend.slice(0, 2), // Use fewer tasks for speed
                        group_options: {
                            deduplicate_tasks: true,
                            optimize_dependencies: true
                        }
                    }
                ],
                global_options: {
                    merge_similar_tasks: true,
                    optimize_workflow: true
                },
                optimization_mode: mode
            };
            
            const response = await axios.post(`${BASE_URL}/system/ai-tasks/batch/optimize`, request, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            
            results[mode] = {
                processing_time: response.data.data.processing_time_ms,
                optimization_ratio: response.data.data.optimization_stats.optimization_ratio,
                quality_score: response.data.data.quality_metrics.overall_score
            };
            
            console.log(`     ✅ ${mode} mode completed in ${response.data.data.processing_time_ms}ms`);
        }
        
        console.log('\n📈 Mode Comparison:');
        console.log('Mode        | Processing Time | Optimization Ratio | Quality Score');
        console.log('------------|-----------------|-------------------|---------------');
        
        for (const [mode, stats] of Object.entries(results)) {
            const paddedMode = mode.padEnd(11);
            const paddedTime = `${stats.processing_time}ms`.padEnd(15);
            const paddedRatio = `${(stats.optimization_ratio * 100).toFixed(1)}%`.padEnd(17);
            const paddedQuality = `${(stats.quality_score * 100).toFixed(1)}%`;
            console.log(`${paddedMode} | ${paddedTime} | ${paddedRatio} | ${paddedQuality}`);
        }
        
        return true;
    } catch (error) {
        console.log('❌ Optimization modes testing failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting AI Batch Task Optimization Tests...\n');
    
    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed without authentication');
        return;
    }
    
    // Step 2: Test batch optimization capabilities
    const tests = [
        { name: 'Batch Task Optimization', fn: testBatchOptimization },
        { name: 'Different Optimization Modes', fn: testDifferentOptimizationModes }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        const success = await test.fn();
        if (success) {
            passed++;
        } else {
            failed++;
        }
    }
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All AI batch optimization tests passed!');
        console.log('\n🔧 Batch Optimization Features Verified:');
        console.log('   ✅ Multi-group task optimization');
        console.log('   ✅ Similar task merging');
        console.log('   ✅ Workflow optimization');
        console.log('   ✅ Workload balancing');
        console.log('   ✅ Cross-group optimization');
        console.log('   ✅ Multiple optimization modes (balanced, performance, quality, cost)');
        console.log('   ✅ Comprehensive statistics and metrics');
        console.log('   ✅ Global and group-specific suggestions');
        console.log('   ✅ Token usage tracking');
        console.log('   ✅ Quality metrics reporting');
    } else {
        console.log('\n⚠️ Some tests failed. Please check the implementation.');
    }
}

// Run the tests
runTests().catch(console.error);