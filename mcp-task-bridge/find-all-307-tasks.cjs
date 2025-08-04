const axios = require('axios');

// System JWT token from the task-mcp.js file
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function findAllTasks307() {
    try {
        console.log('🔍 Searching for all tasks related to 307...');
        
        const response = await axios.get(`${apiBase}/projects/1/tasks`, {
            headers,
            proxy: false
        });
        
        const tasks = response.data.data?.data || [];
        console.log(`📋 Total tasks found: ${tasks.length}`);
        
        // Search for tasks containing "307" in title or ID
        const tasks307 = tasks.filter(task => 
            task.title.includes('307') || 
            task.id.toString().includes('307') ||
            (task.description && task.description.includes('307')) ||
            task.parent_id === 307 ||
            task.id === 307 ||
            task.id === 308
        );
        
        // Also look for document upload related tasks
        const documentTasks = tasks.filter(task =>
            task.title.includes('文档') ||
            task.title.includes('上传') ||
            task.title.includes('数据库表结构') ||
            task.title.includes('document') ||
            task.title.includes('upload') ||
            task.title.includes('database')
        );
        
        console.log(`\n🎯 Tasks related to 307: ${tasks307.length}`);
        console.log('===========================================');
        
        tasks307.sort((a, b) => a.id - b.id).forEach(task => {
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            const parentInfo = task.parent_id ? ` (child of ${task.parent_id})` : ' (root)';
            console.log(`\n${statusIcon} ID ${task.id}: "${task.title}" [${task.status}]${parentInfo}`);
            console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
            if (task.description) {
                console.log(`   Description: ${task.description.substring(0, 200)}...`);
            }
        });
        
        if (tasks307.length === 0) {
            console.log('\n❌ No tasks found with ID 307 or related to 307');
            
            console.log(`\n📋 Document/Upload related tasks: ${documentTasks.length}`);
            console.log('================================================');
            
            documentTasks.sort((a, b) => b.id - a.id).slice(0, 10).forEach(task => {
                const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
                const parentInfo = task.parent_id ? ` (child of ${task.parent_id})` : ' (root)';
                console.log(`\n${statusIcon} ID ${task.id}: "${task.title}" [${task.status}]${parentInfo}`);
                console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
            });
        }
        
        // Show recent tasks (highest IDs) to see what exists
        console.log('\n📊 Recent Tasks (Latest 20):');
        console.log('=============================');
        const recentTasks = tasks.sort((a, b) => b.id - a.id).slice(0, 20);
        recentTasks.forEach(task => {
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            const parentInfo = task.parent_id ? ` (child of ${task.parent_id})` : ' (root)';
            console.log(`   ${statusIcon} ID ${task.id}: "${task.title}" [${task.status}]${parentInfo}`);
        });
        
        return { tasks307, documentTasks, allTasks: tasks };
        
    } catch (error) {
        console.error('❌ Error fetching tasks:', error.response?.data || error.message);
        return null;
    }
}

// Run the search
findAllTasks307();