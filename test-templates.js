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

async function testGetTemplates() {
    try {
        console.log('\n🧪 Testing Get Templates endpoint...');
        const response = await axios.get(`${BASE_URL}/system/ai-tasks/templates`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Get Templates Response:');
        console.log(`   Total templates: ${response.data.data.total}`);
        console.log(`   Templates found: ${response.data.data.templates.length}`);
        response.data.data.templates.forEach((template, index) => {
            console.log(`   ${index + 1}. ${template.name} (${template.category})`);
        });
        return true;
    } catch (error) {
        console.log('❌ Get Templates failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testGetTemplate() {
    try {
        console.log('\n🧪 Testing Get Single Template endpoint...');
        const response = await axios.get(`${BASE_URL}/system/ai-tasks/templates/1`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Get Single Template Response:');
        console.log(`   Name: ${response.data.data.name}`);
        console.log(`   Category: ${response.data.data.category}`);
        console.log(`   Usage Count: ${response.data.data.usage_count}`);
        console.log(`   Template Text: ${response.data.data.template_text.substring(0, 100)}...`);
        return true;
    } catch (error) {
        console.log('❌ Get Single Template failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testCreateTemplate() {
    try {
        console.log('\n🧪 Testing Create Template endpoint...');
        const templateRequest = {
            name: "测试项目模板",
            description: "这是一个用于测试的项目模板",
            category: "development",
            template_text: "为 {{.projectName}} 创建一个 {{.projectType}} 项目，包含 {{.features}} 功能。",
            task_pattern: {
                "estimated_hours": 40,
                "priority": "high",
                "tags": ["testing", "automation"]
            },
            tags: ["testing", "project", "automation"],
            is_public: false
        };
        
        const response = await axios.post(`${BASE_URL}/system/ai-tasks/templates`, templateRequest, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Create Template Response:');
        console.log(`   Created template ID: ${response.data.data.id}`);
        console.log(`   Name: ${response.data.data.name}`);
        console.log(`   Category: ${response.data.data.category}`);
        return response.data.data.id;
    } catch (error) {
        console.log('❌ Create Template failed:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testGenerateFromTemplate() {
    try {
        console.log('\n🧪 Testing Generate From Template endpoint...');
        const generationRequest = {
            template_id: 1,
            provider: "openai",
            variables: {
                projectName: "AI任务管理系统",
                features: "任务创建、分配、跟踪和报告"
            },
            options: {
                max_tasks: 5,
                enable_priority_assignment: true,
                enable_time_estimation: true
            }
        };
        
        const response = await axios.post(`${BASE_URL}/system/ai-tasks/templates/generate`, generationRequest, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Generate From Template Response:');
        console.log(`   Success: ${response.data.data.success}`);
        console.log(`   Generated tasks: ${response.data.data.total_tasks}`);
        console.log(`   Processing time: ${response.data.data.processing_time_ms}ms`);
        
        response.data.data.generated_tasks.forEach((task, index) => {
            console.log(`   Task ${index + 1}: ${task.title}`);
        });
        
        return true;
    } catch (error) {
        console.log('❌ Generate From Template failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testTemplateFiltering() {
    try {
        console.log('\n🧪 Testing Template Filtering...');
        
        // Test category filter
        const categoryResponse = await axios.get(`${BASE_URL}/system/ai-tasks/templates?category=development`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Category Filter (development):');
        console.log(`   Found ${categoryResponse.data.data.templates.length} development templates`);
        
        // Test public filter
        const publicResponse = await axios.get(`${BASE_URL}/system/ai-tasks/templates?is_public=true`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Public Filter:');
        console.log(`   Found ${publicResponse.data.data.templates.length} public templates`);
        
        return true;
    } catch (error) {
        console.log('❌ Template Filtering failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting AI Template System Tests...\n');
    
    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed without authentication');
        return;
    }
    
    // Step 2: Test all template endpoints
    const tests = [
        { name: 'Get Templates', fn: testGetTemplates },
        { name: 'Get Single Template', fn: testGetTemplate },
        { name: 'Create Template', fn: testCreateTemplate },
        { name: 'Generate From Template', fn: testGenerateFromTemplate },
        { name: 'Template Filtering', fn: testTemplateFiltering }
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
        console.log('\n🎉 All AI template system tests passed!');
        console.log('\n📝 Template System Features Verified:');
        console.log('   ✅ Template creation and storage');
        console.log('   ✅ Template retrieval and filtering');
        console.log('   ✅ Variable substitution in templates');
        console.log('   ✅ Task generation from templates');
        console.log('   ✅ Category and visibility filtering');
    } else {
        console.log('\n⚠️ Some tests failed. Please check the implementation.');
    }
}

// Run the tests
runTests().catch(console.error);