import { TaskMCPServer } from './task-mcp.js';
import axios from 'axios';

const mcp = new TaskMCPServer();

async function findTask588() {
    try {
        // 获取所有项目
        const projectsResponse = await axios.get('http://localhost:8080/api/v1/projects', {
            headers: mcp.getHeaders(),
            proxy: false
        });
        
        const projects = projectsResponse.data.data?.data || [];
        console.log('所有项目列表:');
        projects.forEach(project => {
            console.log(`- 项目ID: ${project.id}, 名称: ${project.name}`);
        });
        
        // 在所有项目中查找任务588
        let found = false;
        for (const project of projects) {
            try {
                const tasksResponse = await axios.get(`http://localhost:8080/api/v1/projects/${project.id}/tasks`, {
                    headers: mcp.getHeaders(),
                    proxy: false
                });
                
                const tasks = tasksResponse.data.data?.data || [];
                const task588 = tasks.find(t => t.id === 588);
                
                if (task588) {
                    console.log(`\n在项目${project.id}中找到任务588:`);
                    console.log(`- 标题: ${task588.title}`);
                    console.log(`- 状态: ${task588.status}`);
                    console.log(`- 描述: ${task588.description}`);
                    console.log(`- 父任务ID: ${task588.parent_id}`);
                    console.log(`- 层级: ${task588.task_level}`);
                    found = true;
                    break;
                }
            } catch (projectError) {
                console.error(`无法获取项目${project.id}的任务: ${projectError.message}`);
            }
        }
        
        if (!found) {
            console.log('\n在所有项目中都未找到任务588');
            
            // 查找最近的任务ID
            console.log('\n查找项目1中最高的任务ID:');
            const tasksResponse = await axios.get('http://localhost:8080/api/v1/projects/1/tasks', {
                headers: mcp.getHeaders(),
                proxy: false
            });
            
            const tasks = tasksResponse.data.data?.data || [];
            const maxId = Math.max(...tasks.map(t => t.id));
            console.log(`项目1中最高的任务ID: ${maxId}`);
            
            // 查找580-600范围内的任务
            const tasksInRange = tasks.filter(t => t.id >= 580 && t.id <= 600);
            if (tasksInRange.length > 0) {
                console.log('\n580-600范围内的任务:');
                tasksInRange.sort((a, b) => a.id - b.id).forEach(task => {
                    console.log(`- ID: ${task.id}, 标题: ${task.title}, 状态: ${task.status}`);
                });
            }
        }
        
    } catch (error) {
        console.error('查找任务588失败:', error.message);
    }
}

findTask588();