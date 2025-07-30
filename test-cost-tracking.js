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

async function testCostSummary() {
    try {
        console.log('\n🧪 Testing Cost Summary endpoint...');
        const response = await axios.get(`${BASE_URL}/system/ai-tasks/cost/summary?period=monthly`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Cost Summary Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Cost Summary failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testBudgetStatus() {
    try {
        console.log('\n🧪 Testing Budget Status endpoint...');
        const response = await axios.get(`${BASE_URL}/system/ai-tasks/budget/status`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Budget Status Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Budget Status failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testSetBudgetLimit() {
    try {
        console.log('\n🧪 Testing Set Budget Limit endpoint...');
        const budgetRequest = {
            budget_type: 'monthly',
            budget_amount: 100.0,
            alert_threshold: 0.8,
            is_enabled: true
        };
        
        const response = await axios.post(`${BASE_URL}/system/ai-tasks/budget/limit`, budgetRequest, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Set Budget Limit Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Set Budget Limit failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testBudgetAlerts() {
    try {
        console.log('\n🧪 Testing Budget Alerts endpoint...');
        const response = await axios.get(`${BASE_URL}/system/ai-tasks/budget/alerts`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Budget Alerts Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Budget Alerts failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting AI Cost Tracking and Budget Management Tests...\n');
    
    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed without authentication');
        return;
    }
    
    // Step 2: Test all cost tracking endpoints
    const tests = [
        { name: 'Cost Summary', fn: testCostSummary },
        { name: 'Budget Status', fn: testBudgetStatus },
        { name: 'Set Budget Limit', fn: testSetBudgetLimit },
        { name: 'Budget Alerts', fn: testBudgetAlerts }
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
        console.log('\n🎉 All AI cost tracking and budget management tests passed!');
    } else {
        console.log('\n⚠️ Some tests failed. Please check the implementation.');
    }
}

// Run the tests
runTests().catch(console.error);