import { TaskMCPServer } from './task-mcp.js';
import axios from 'axios';

const mcp = new TaskMCPServer();

async function findRootTasks() {
    try {
        console.log('任务588不存在，根据CLAUDE.md的指示，我需要找到本周的根任务并在其下创建子任务');
        console.log('查找项目1中的根任务...\n');

        // 查找项目1中可能的根任务
        const response = await axios.get('http://localhost:8080/api/v1/projects/1/tasks', {
            headers: mcp.getHeaders(),
            proxy: false
        });

        const tasks = response.data.data?.data || [];
        const rootTasks = tasks.filter(t => !t.parent_id && t.task_level === 1);

        console.log('项目1中的根任务（无父任务，级别为1）:');
        rootTasks.sort((a, b) => b.id - a.id).slice(0, 10).forEach(task => {
            const createdDate = new Date(task.created_at).toLocaleDateString('zh-CN');
            console.log(`- ID: ${task.id}, 标题: ${task.title}, 状态: ${task.status}, 创建时间: ${createdDate}`);
        });

        console.log('\n近期高级别任务（level 1-2）:');
        const recentTasks = tasks
            .filter(t => t.task_level <= 2 && t.id >= 550)
            .sort((a, b) => b.id - a.id)
            .slice(0, 15);
            
        recentTasks.forEach(task => {
            const createdDate = new Date(task.created_at).toLocaleDateString('zh-CN');
            console.log(`- ID: ${task.id}, 标题: ${task.title}, 层级: ${task.task_level}, 父任务: ${task.parent_id || '无'}, 状态: ${task.status}, 创建: ${createdDate}`);
        });

        // 检查当前日期范围内的任务
        const currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // 本周周日
        
        console.log('\n本周创建的任务:');
        const thisWeekTasks = tasks.filter(t => {
            const taskDate = new Date(t.created_at);
            return taskDate >= currentWeekStart;
        }).sort((a, b) => b.id - a.id);

        if (thisWeekTasks.length > 0) {
            thisWeekTasks.slice(0, 10).forEach(task => {
                const createdDate = new Date(task.created_at).toLocaleDateString('zh-CN');
                console.log(`- ID: ${task.id}, 标题: ${task.title}, 层级: ${task.task_level}, 父任务: ${task.parent_id || '无'}, 创建: ${createdDate}`);
            });
        } else {
            console.log('本周没有创建新任务');
        }

    } catch (error) {
        console.error('查找根任务失败:', error.message);
    }
}

findRootTasks();