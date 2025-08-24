const axios = require('axios');

// System JWT token from the task-mcp.js file
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function getTasksFromProject1() {
    try {
        console.log('🔍 Getting task list from project 1...');
        
        const response = await axios.get(`${apiBase}/projects/1/tasks`, {
            headers,
            proxy: false
        });
        
        const tasks = response.data.data?.data || [];
        console.log(`📋 Found ${tasks.length} tasks in project 1`);
        
        // Look for tasks 74 and 75 specifically
        const task74 = tasks.find(t => t.id === 74);
        const task75 = tasks.find(t => t.id === 75);
        
        console.log('\n🎯 Looking for specific tasks:');
        
        if (task74) {
            console.log(`✅ Task ID 74 found:`);
            console.log(`   Title: ${task74.title}`);
            console.log(`   Status: ${task74.status}`);
            console.log(`   Created: ${task74.created_at}`);
            console.log(`   Parent ID: ${task74.parent_id || 'None (root task)'}`);
            console.log(`   Project ID: ${task74.project_id}`);
        } else {
            console.log(`❌ Task ID 74 not found`);
        }
        
        if (task75) {
            console.log(`✅ Task ID 75 found:`);
            console.log(`   Title: ${task75.title}`);
            console.log(`   Status: ${task75.status}`);
            console.log(`   Created: ${task75.created_at}`);
            console.log(`   Parent ID: ${task75.parent_id || 'None (root task)'}`);
            console.log(`   Project ID: ${task75.project_id}`);
        } else {
            console.log(`❌ Task ID 75 not found`);
        }
        
        // Show the latest 10 tasks for context
        console.log('\n📊 Latest 10 tasks in project 1:');
        const latestTasks = tasks.slice(-10);
        latestTasks.forEach(task => {
            const parentInfo = task.parent_id ? ` (child of ${task.parent_id})` : ' (root)';
            console.log(`   ID ${task.id}: "${task.title}" [${task.status}]${parentInfo}`);
        });
        
        return { task74, task75, allTasks: tasks };
        
    } catch (error) {
        console.error('❌ Error fetching tasks:', error.response?.data || error.message);
        return null;
    }
}

// Run the test
getTasksFromProject1();