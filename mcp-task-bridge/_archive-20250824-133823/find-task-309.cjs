const axios = require('axios');

// System JWT token from the task-mcp.js file
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function findTask309() {
    try {
        console.log('🔍 Searching for task 309 (task 307-02)...');
        
        const response = await axios.get(`${apiBase}/projects/1/tasks`, {
            headers,
            proxy: false
        });
        
        const tasks = response.data.data?.data || [];
        console.log(`📋 Total tasks found: ${tasks.length}`);
        
        // Look for task 309 specifically
        const task309 = tasks.find(t => t.id === 309);
        
        console.log('\n🎯 Task 309 Details:');
        console.log('==================');
        
        if (task309) {
            console.log(`✅ Task ID 309: "${task309.title}"`);
            console.log(`   Status: ${task309.status}`);
            console.log(`   Priority: ${task309.priority || 'Not set'}`);
            console.log(`   Created: ${new Date(task309.created_at).toLocaleString()}`);
            console.log(`   Updated: ${new Date(task309.updated_at).toLocaleString()}`);
            console.log(`   Parent ID: ${task309.parent_id || 'None (root task)'}`);
            console.log(`   Project ID: ${task309.project_id}`);
            
            if (task309.description) {
                console.log(`\n📝 Description:`);
                console.log(`   ${task309.description}`);
            }
            
            if (task309.custom_fields) {
                console.log(`\n⚙️ Custom Fields:`);
                console.log(JSON.stringify(task309.custom_fields, null, 4));
            }
            
            // Check if this is indeed a subtask of 307
            if (task309.parent_id === 307) {
                console.log(`\n🔗 Confirmed: This is a subtask of Task 307`);
                
                // Find the parent task for context
                const parentTask = tasks.find(t => t.id === 307);
                if (parentTask) {
                    console.log(`   Parent Task: "${parentTask.title}"`);
                }
            }
            
            // Show any subtasks of 309 if they exist
            const subtasks = tasks.filter(t => t.parent_id === 309).sort((a, b) => a.id - b.id);
            if (subtasks.length > 0) {
                console.log(`\n🔗 Subtasks of Task 309:`);
                console.log('========================');
                subtasks.forEach(subtask => {
                    const statusIcon = subtask.status === 'completed' ? '✅' : subtask.status === 'in_progress' ? '🚀' : '⏳';
                    console.log(`   ${statusIcon} ID ${subtask.id}: "${subtask.title}" [${subtask.status}]`);
                });
            }
            
        } else {
            console.log(`❌ Task ID 309 not found`);
            
            // Show all subtasks of 307 to help locate it
            console.log('\n🔍 All subtasks of Task 307:');
            console.log('============================');
            const task307Subtasks = tasks.filter(t => t.parent_id === 307).sort((a, b) => a.id - b.id);
            if (task307Subtasks.length > 0) {
                task307Subtasks.forEach(subtask => {
                    const statusIcon = subtask.status === 'completed' ? '✅' : subtask.status === 'in_progress' ? '🚀' : '⏳';
                    console.log(`   ${statusIcon} ID ${subtask.id}: "${subtask.title}" [${subtask.status}]`);
                });
            }
        }
        
        return task309;
        
    } catch (error) {
        console.error('❌ Error fetching tasks:', error.response?.data || error.message);
        return null;
    }
}

// Run the search
findTask309().then(task => {
    if (task) {
        console.log('\n✅ Task 309 search completed successfully');
    } else {
        console.log('\n❌ Task 309 not found or error occurred');
    }
});