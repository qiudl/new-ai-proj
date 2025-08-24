const axios = require('axios');

// System JWT token from the task-mcp.js file
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function getSpecificTasks() {
    try {
        console.log('🔍 Getting task 307 and 308 details...');
        
        // Get all tasks with pagination to make sure we get everything
        let allTasks = [];
        let currentPage = 1;
        let totalPages = 1;
        
        do {
            const response = await axios.get(`${apiBase}/projects/1/tasks`, {
                headers,
                proxy: false,
                params: {
                    page: currentPage,
                    page_size: 100
                }
            });
            
            const responseData = response.data.data;
            const tasks = responseData?.data || [];
            const total = responseData?.total || 0;
            const pageSize = responseData?.page_size || 20;
            
            allTasks = allTasks.concat(tasks);
            totalPages = Math.ceil(total / pageSize);
            currentPage++;
            
        } while (currentPage <= totalPages);
        
        console.log(`📋 Total tasks retrieved: ${allTasks.length}`);
        
        // Find task 307 and 308
        const task307 = allTasks.find(t => t.id === 307);
        const task308 = allTasks.find(t => t.id === 308);
        
        // Find the main task that has all these 307-xx subtasks
        const subtasks307 = allTasks.filter(t => t.parent_id === 307);
        
        console.log('\n🎯 Target Tasks Analysis:');
        console.log('===========================');
        
        if (task307) {
            console.log(`✅ Task ID 307: "${task307.title}"`);
            console.log(`   Status: ${task307.status}`);
            console.log(`   Created: ${new Date(task307.created_at).toLocaleString()}`);
            console.log(`   Parent ID: ${task307.parent_id || 'None (root task)'}`);
            console.log(`   Project ID: ${task307.project_id}`);
            console.log(`   Description:`);
            console.log(`   ${task307.description || 'No description'}`);
            console.log('');
        } else {
            console.log(`❌ Task ID 307 not found`);
        }
        
        if (task308) {
            console.log(`✅ Task ID 308: "${task308.title}"`);
            console.log(`   Status: ${task308.status}`);
            console.log(`   Created: ${new Date(task308.created_at).toLocaleString()}`);
            console.log(`   Parent ID: ${task308.parent_id || 'None (root task)'}`);
            console.log(`   Project ID: ${task308.project_id}`);
            console.log(`   Description:`);
            console.log(`   ${task308.description || 'No description'}`);
            console.log('');
        } else {
            console.log(`❌ Task ID 308 not found`);
        }
        
        // Show subtasks of 307
        console.log(`\n🔗 Subtasks of Task 307 (${subtasks307.length} found):`);
        console.log('=======================================================');
        subtasks307.sort((a, b) => a.id - b.id).forEach(subtask => {
            const statusIcon = subtask.status === 'completed' ? '✅' : subtask.status === 'in_progress' ? '🚀' : '⏳';
            console.log(`   ${statusIcon} ID ${subtask.id}: "${subtask.title}" [${subtask.status}]`);
        });
        
        // Look for any task about database table structure design
        const dbTasks = allTasks.filter(task => 
            task.title.includes('数据库表结构设计') ||
            task.title.includes('database') && task.title.includes('table') ||
            task.description && task.description.includes('数据库表结构设计')
        );
        
        console.log(`\n📊 Database Table Structure Design Tasks (${dbTasks.length} found):`);
        console.log('================================================================');
        dbTasks.forEach(task => {
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            const parentInfo = task.parent_id ? ` (child of ${task.parent_id})` : ' (root)';
            console.log(`\n${statusIcon} ID ${task.id}: "${task.title}" [${task.status}]${parentInfo}`);
            console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
            if (task.description) {
                console.log(`   Description: ${task.description.substring(0, 300)}...`);
            }
        });
        
        return { task307, task308, subtasks307, dbTasks, allTasks };
        
    } catch (error) {
        console.error('❌ Error fetching tasks:', error.response?.data || error.message);
        return null;
    }
}

// Run the search
getSpecificTasks();