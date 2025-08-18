const axios = require('axios');

const API_BASE = 'http://localhost:8081/api/v1';
const PROJECT_ID = 1; // Default project ID

async function findAndShowTask200() {
    try {
        console.log('🔍 Searching for task 200...');
        
        // First, get all tasks to see if task 200 exists
        const tasksResponse = await axios.get(`${API_BASE}/projects/${PROJECT_ID}/tasks`);
        const tasks = tasksResponse.data;
        
        // Find task 200
        const task200 = tasks.find(task => task.id === 200);
        
        if (task200) {
            console.log('✅ Found task 200:');
            console.log(JSON.stringify(task200, null, 2));
            
            // Get children of task 200
            try {
                const childrenResponse = await axios.get(`${API_BASE}/projects/${PROJECT_ID}/tasks/200/children`);
                console.log('\n📋 Children of task 200:');
                console.log(JSON.stringify(childrenResponse.data, null, 2));
            } catch (error) {
                console.log('\n❌ Failed to get children:', error.response?.data || error.message);
            }
        } else {
            console.log('❌ Task 200 not found');
            console.log(`Total tasks found: ${tasks.length}`);
            
            // Show tasks around ID 200
            const nearby = tasks.filter(task => task.id >= 198 && task.id <= 202);
            if (nearby.length > 0) {
                console.log('\n📋 Tasks near ID 200:');
                nearby.forEach(task => {
                    console.log(`- ID: ${task.id}, Title: "${task.title}", Status: ${task.status}`);
                });
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

findAndShowTask200();