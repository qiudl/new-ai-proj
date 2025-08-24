const axios = require('axios');

// System JWT token from the task-mcp.js file
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function getAllTasks() {
    try {
        console.log('🔍 Getting complete task list from project 1...');
        
        const response = await axios.get(`${apiBase}/projects/1/tasks`, {
            headers,
            proxy: false
        });
        
        const tasks = response.data.data?.data || [];
        console.log(`📋 Total tasks found: ${tasks.length}`);
        
        // Look for tasks 74 and 75 specifically
        const task74 = tasks.find(t => t.id === 74);
        const task75 = tasks.find(t => t.id === 75);
        
        console.log('\n🎯 Target Tasks:');
        console.log('================');
        
        if (task74) {
            console.log(`✅ Task ID 74: "${task74.title}"`);
            console.log(`   Status: ${task74.status}`);
            console.log(`   Created: ${new Date(task74.created_at).toLocaleString()}`);
            console.log(`   Parent ID: ${task74.parent_id || 'None (root task)'}`);
            console.log(`   Project ID: ${task74.project_id}`);
            if (task74.description) {
                console.log(`   Description: ${task74.description}`);
            }
        } else {
            console.log(`❌ Task ID 74 not found`);
        }
        
        console.log('');
        
        if (task75) {
            console.log(`✅ Task ID 75: "${task75.title}"`);
            console.log(`   Status: ${task75.status}`);
            console.log(`   Created: ${new Date(task75.created_at).toLocaleString()}`);
            console.log(`   Parent ID: ${task75.parent_id || 'None (root task)'}`);
            console.log(`   Project ID: ${task75.project_id}`);
            if (task75.description) {
                console.log(`   Description: ${task75.description}`);
            }
        } else {
            console.log(`❌ Task ID 75 not found`);
        }
        
        // Show hierarchical relationship
        if (task74 && task75) {
            console.log('\n🔗 Hierarchical Relationship:');
            console.log('===============================');
            console.log(`📋 ${task74.id}: "${task74.title}" (Parent)`);
            console.log(`  └─ 📋 ${task75.id}: "${task75.title}" (Child)`);
            
            // Find any other children of task 74
            const otherChildren = tasks.filter(t => t.parent_id === 74 && t.id !== 75);
            if (otherChildren.length > 0) {
                console.log('\n   Other children of Task 74:');
                otherChildren.forEach(child => {
                    console.log(`  └─ 📋 ${child.id}: "${child.title}" [${child.status}]`);
                });
            }
        }
        
        // Show all tasks starting from ID 70 for recent context
        console.log('\n📊 Recent Tasks (ID 70+):');
        console.log('==========================');
        const recentTasks = tasks.filter(t => t.id >= 70).sort((a, b) => a.id - b.id);
        recentTasks.forEach(task => {
            const parentInfo = task.parent_id ? ` (child of ${task.parent_id})` : ' (root)';
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            console.log(`   ${statusIcon} ID ${task.id}: "${task.title}" [${task.status}]${parentInfo}`);
            console.log(`      Created: ${new Date(task.created_at).toLocaleString()}`);
        });
        
        return { task74, task75, allTasks: tasks };
        
    } catch (error) {
        console.error('❌ Error fetching tasks:', error.response?.data || error.message);
        return null;
    }
}

// Run the test
getAllTasks();