const axios = require('axios');

// System JWT token from the task-mcp.js file
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function searchDocumentTasks() {
    try {
        console.log('🔍 Searching for document-related tasks...');
        
        let allTasks = [];
        let currentPage = 1;
        let totalPages = 1;
        
        // Get all tasks with pagination
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
            
            console.log(`📋 Page ${currentPage}/${totalPages}: ${tasks.length} tasks`);
            currentPage++;
            
        } while (currentPage <= totalPages);
        
        console.log(`📋 Total tasks found: ${allTasks.length}`);
        
        // Search for document-related tasks
        const documentKeywords = ['文档', '上传', 'document', 'upload', 'file', '307'];
        const documentTasks = allTasks.filter(task => {
            const titleLower = task.title.toLowerCase();
            const descLower = (task.description || '').toLowerCase();
            return documentKeywords.some(keyword => 
                titleLower.includes(keyword.toLowerCase()) || 
                descLower.includes(keyword.toLowerCase())
            );
        });
        
        console.log(`\n🎯 Document-related Tasks Found: ${documentTasks.length}`);
        console.log('===============================================');
        
        documentTasks.sort((a, b) => a.id - b.id).forEach(task => {
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            const parentInfo = task.parent_id ? ` (child of ${task.parent_id})` : ' (root)';
            console.log(`\n${statusIcon} ID ${task.id}: "${task.title}" [${task.status}]${parentInfo}`);
            console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
            if (task.description) {
                console.log(`   Description: ${task.description}`);
            }
            if (task.custom_fields && Object.keys(task.custom_fields).length > 0) {
                console.log(`   Custom Fields: ${JSON.stringify(task.custom_fields, null, 2)}`);
            }
        });
        
        // Show recent tasks (last 50)
        console.log('\n📊 Recent Tasks (Last 50):');
        console.log('===========================');
        const recentTasks = allTasks.sort((a, b) => b.id - a.id).slice(0, 50);
        recentTasks.forEach(task => {
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            const parentInfo = task.parent_id ? ` (child of ${task.parent_id})` : ' (root)';
            console.log(`   ${statusIcon} ID ${task.id}: "${task.title}" [${task.status}]${parentInfo}`);
        });
        
        return { documentTasks, allTasks };
        
    } catch (error) {
        console.error('❌ Error fetching tasks:', error.response?.data || error.message);
        return null;
    }
}

// Run the search
searchDocumentTasks();