const axios = require('axios');

// System JWT token from the task-mcp.js file
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function findTasks307And308() {
    try {
        console.log('🔍 Searching for tasks 307 and 308...');
        
        const response = await axios.get(`${apiBase}/projects/1/tasks`, {
            headers,
            proxy: false
        });
        
        const tasks = response.data.data?.data || [];
        console.log(`📋 Total tasks found: ${tasks.length}`);
        
        // Look for tasks 307 and 308 specifically
        const task307 = tasks.find(t => t.id === 307);
        const task308 = tasks.find(t => t.id === 308);
        
        console.log('\n🎯 Target Tasks:');
        console.log('================');
        
        if (task307) {
            console.log(`✅ Task ID 307: "${task307.title}"`);
            console.log(`   Status: ${task307.status}`);
            console.log(`   Created: ${new Date(task307.created_at).toLocaleString()}`);
            console.log(`   Parent ID: ${task307.parent_id || 'None (root task)'}`);
            console.log(`   Project ID: ${task307.project_id}`);
            if (task307.description) {
                console.log(`   Description: ${task307.description}`);
            }
            console.log(`   Custom Fields: ${JSON.stringify(task307.custom_fields, null, 2)}`);
        } else {
            console.log(`❌ Task ID 307 not found`);
        }
        
        console.log('');
        
        if (task308) {
            console.log(`✅ Task ID 308: "${task308.title}"`);
            console.log(`   Status: ${task308.status}`);
            console.log(`   Created: ${new Date(task308.created_at).toLocaleString()}`);
            console.log(`   Parent ID: ${task308.parent_id || 'None (root task)'}`);
            console.log(`   Project ID: ${task308.project_id}`);
            if (task308.description) {
                console.log(`   Description: ${task308.description}`);
            }
            console.log(`   Custom Fields: ${JSON.stringify(task308.custom_fields, null, 2)}`);
        } else {
            console.log(`❌ Task ID 308 not found`);
        }
        
        // Show all subtasks of task 307
        if (task307) {
            console.log('\n🔗 Subtasks of Task 307:');
            console.log('========================');
            const subtasks = tasks.filter(t => t.parent_id === 307).sort((a, b) => a.id - b.id);
            if (subtasks.length > 0) {
                subtasks.forEach(subtask => {
                    const statusIcon = subtask.status === 'completed' ? '✅' : subtask.status === 'in_progress' ? '🚀' : '⏳';
                    console.log(`   ${statusIcon} ID ${subtask.id}: "${subtask.title}" [${subtask.status}]`);
                    console.log(`      Created: ${new Date(subtask.created_at).toLocaleString()}`);
                    if (subtask.description) {
                        console.log(`      Description: ${subtask.description}`);
                    }
                });
            } else {
                console.log('   No subtasks found');
            }
        }
        
        return { task307, task308, allTasks: tasks };
        
    } catch (error) {
        console.error('❌ Error fetching tasks:', error.response?.data || error.message);
        return null;
    }
}

// Run the search
findTasks307And308();