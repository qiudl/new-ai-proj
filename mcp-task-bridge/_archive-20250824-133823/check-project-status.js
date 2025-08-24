import { TaskMCPServer } from './task-mcp.js';

async function checkProjectStatus() {
    const taskServer = new TaskMCPServer();
    
    console.log("=== 检查项目状态 ===\n");
    
    try {
        // 1. 搜索32周相关任务
        console.log("1. 搜索32周相关任务...");
        const searchResult = await taskServer.findTaskByName("32周");
        if (searchResult.success) {
            console.log(`找到 ${searchResult.total} 个32周相关任务:`);
            searchResult.tasks.forEach(task => {
                console.log(`  - 任务 ${task.id}: ${task.title} [状态: ${task.status}]`);
            });
        } else {
            console.log("搜索32周任务失败:", searchResult.error);
        }
        
        console.log("\n" + "=".repeat(50) + "\n");
        
        // 2. 获取项目1的所有任务，重点关注高优先级和进行中的任务
        console.log("2. 获取项目1的任务列表...");
        const listResult = await taskServer.listTasks(1);
        if (listResult.success) {
            console.log(`项目1共有 ${listResult.total} 个任务\n`);
            
            // 分类显示任务
            const todoTasks = listResult.tasks.filter(t => t.status === 'todo');
            const inProgressTasks = listResult.tasks.filter(t => t.status === 'in_progress');
            const completedTasks = listResult.tasks.filter(t => t.status === 'completed');
            
            console.log(`📋 待开始任务 (${todoTasks.length} 个):`);
            todoTasks.slice(0, 10).forEach(task => {
                console.log(`  - 任务 ${task.id}: ${task.title}`);
            });
            if (todoTasks.length > 10) {
                console.log(`  ... 还有 ${todoTasks.length - 10} 个任务`);
            }
            
            console.log(`\n🚀 进行中任务 (${inProgressTasks.length} 个):`);
            inProgressTasks.forEach(task => {
                console.log(`  - 任务 ${task.id}: ${task.title}`);
            });
            
            console.log(`\n✅ 已完成任务 (${completedTasks.length} 个)`);
            
        } else {
            console.log("获取任务列表失败:", listResult.error);
        }
        
        console.log("\n" + "=".repeat(50) + "\n");
        
        // 3. 查找最近的根任务（可能需要创建子任务的）
        console.log("3. 寻找本周的根任务...");
        const weeklyTaskResult = await taskServer.findTaskByName("第32周");
        if (weeklyTaskResult.success && weeklyTaskResult.total > 0) {
            console.log("找到本周相关任务:");
            for (const task of weeklyTaskResult.tasks) {
                console.log(`\n检查任务 ${task.id}: ${task.title}`);
                
                // 获取这个任务的子任务
                const childrenResult = await taskServer.getTaskChildren(task.id);
                if (childrenResult.success) {
                    console.log(`  该任务有 ${childrenResult.total} 个子任务:`);
                    childrenResult.children.forEach(child => {
                        console.log(`    - 子任务 ${child.id}: ${child.title} [状态: ${child.status}, 优先级: ${child.priority}]`);
                    });
                } else {
                    console.log(`  获取子任务失败: ${childrenResult.error}`);
                }
            }
        } else {
            console.log("未找到第32周相关任务");
        }
        
        console.log("\n" + "=".repeat(50) + "\n");
        
        // 4. 推荐下一步操作
        console.log("4. 推荐下一步操作:");
        
        if (listResult.success) {
            const todoTasks = listResult.tasks.filter(t => t.status === 'todo');
            const inProgressTasks = listResult.tasks.filter(t => t.status === 'in_progress');
            
            if (inProgressTasks.length > 0) {
                console.log("💡 建议优先完成以下进行中的任务:");
                inProgressTasks.forEach(task => {
                    console.log(`  - 任务 ${task.id}: ${task.title}`);
                });
            } else if (todoTasks.length > 0) {
                console.log("💡 建议开始以下待办任务:");
                todoTasks.slice(0, 5).forEach(task => {
                    console.log(`  - 任务 ${task.id}: ${task.title}`);
                });
            } else {
                console.log("💡 项目看起来很干净！可以考虑创建新的任务或检查其他项目。");
            }
        }
        
    } catch (error) {
        console.error("检查项目状态时发生错误:", error.message);
    }
}

// 运行检查
checkProjectStatus().then(() => {
    console.log("\n=== 项目状态检查完成 ===");
}).catch(error => {
    console.error("脚本执行失败:", error);
});