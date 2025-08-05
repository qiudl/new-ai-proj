import { TaskMCPServer } from './task-mcp.js';

async function findRootTasks() {
    const taskServer = new TaskMCPServer();
    
    console.log("=== 寻找根任务和重要任务 ===\n");
    
    try {
        // 1. 获取所有任务详情
        console.log("1. 获取项目1的详细任务信息...");
        const listResult = await taskServer.listTasks(1);
        if (!listResult.success) {
            console.log("获取任务列表失败:", listResult.error);
            return;
        }
        
        // 获取每个任务的详细信息
        const tasksWithDetails = [];
        for (const task of listResult.tasks) {
            try {
                const taskDetail = await taskServer.findTaskById(task.id);
                tasksWithDetails.push(taskDetail);
            } catch (error) {
                console.log(`获取任务 ${task.id} 详情失败:`, error.message);
            }
        }
        
        // 2. 分析任务结构
        console.log("2. 分析任务结构...");
        const rootTasks = tasksWithDetails.filter(task => !task.parent_id);
        const childTasks = tasksWithDetails.filter(task => task.parent_id);
        
        console.log(`根任务数量: ${rootTasks.length}`);
        console.log(`子任务数量: ${childTasks.length}\n`);
        
        // 3. 显示根任务及其子任务
        console.log("3. 根任务及其子任务结构:");
        for (const rootTask of rootTasks) {
            console.log(`\n🌟 根任务 ${rootTask.id}: ${rootTask.title}`);
            console.log(`   状态: ${rootTask.status}`);
            console.log(`   优先级: ${rootTask.custom_fields?.priority || 'low'}`);
            console.log(`   创建时间: ${rootTask.created_at}`);
            console.log(`   描述: ${rootTask.description?.substring(0, 100)}...`);
            
            // 获取子任务
            const children = childTasks.filter(child => child.parent_id === rootTask.id);
            if (children.length > 0) {
                console.log(`   📝 子任务 (${children.length} 个):`);
                children.forEach(child => {
                    console.log(`     - ${child.id}: ${child.title} [${child.status}]`);
                });
            } else {
                console.log(`   📝 无子任务`);
            }
        }
        
        // 4. 寻找优先级高的任务
        console.log("\n4. 高优先级任务:");
        const highPriorityTasks = tasksWithDetails.filter(task => 
            task.custom_fields?.priority === 'high' || 
            task.custom_fields?.priority === 'medium'
        );
        
        if (highPriorityTasks.length > 0) {
            highPriorityTasks.forEach(task => {
                console.log(`🔥 任务 ${task.id}: ${task.title}`);
                console.log(`   优先级: ${task.custom_fields?.priority}, 状态: ${task.status}`);
            });
        } else {
            console.log("未找到高优先级任务");
        }
        
        // 5. 寻找周任务相关
        console.log("\n5. 搜索周任务相关内容:");
        const weekPatterns = ["周", "week", "Week", "第", "32"];
        for (const pattern of weekPatterns) {
            const searchResult = await taskServer.findTaskByName(pattern);
            if (searchResult.success && searchResult.total > 0) {
                console.log(`关键词 "${pattern}" 找到 ${searchResult.total} 个任务:`);
                searchResult.tasks.forEach(task => {
                    console.log(`  - 任务 ${task.id}: ${task.title} [${task.status}]`);
                });
            }
        }
        
        // 6. 建议下一步行动
        console.log("\n6. 建议下一步行动:");
        
        const todoRootTasks = rootTasks.filter(task => task.status === 'todo');
        const inProgressRootTasks = rootTasks.filter(task => task.status === 'in_progress');
        
        if (inProgressRootTasks.length > 0) {
            console.log("💡 优先完成进行中的根任务:");
            inProgressRootTasks.forEach(task => {
                console.log(`  - 任务 ${task.id}: ${task.title}`);
            });
        } else if (todoRootTasks.length > 0) {
            console.log("💡 建议开始以下根任务:");
            todoRootTasks.slice(0, 3).forEach(task => {
                console.log(`  - 任务 ${task.id}: ${task.title}`);
                console.log(`    优先级: ${task.custom_fields?.priority || 'low'}`);
            });
        } else {
            console.log("💡 所有根任务都已完成。建议:");
            console.log("  1. 创建新的32周根任务");
            console.log("  2. 或为现有根任务创建子任务");
        }
        
        // 7. 查看是否需要创建32周任务
        const hasWeeklyTask = tasksWithDetails.some(task => 
            task.title.includes("32周") || 
            task.title.includes("第32周") ||
            task.title.includes("week 32") ||
            task.title.includes("Week 32")
        );
        
        if (!hasWeeklyTask) {
            console.log("\n💡 建议创建32周根任务:");
            console.log("  可以创建一个名为 '第32周开发任务' 的根任务");
            console.log("  然后在其下创建具体的子任务");
        }
        
    } catch (error) {
        console.error("寻找根任务时发生错误:", error.message);
    }
}

// 运行查找
findRootTasks().then(() => {
    console.log("\n=== 根任务分析完成 ===");
}).catch(error => {
    console.error("脚本执行失败:", error);
});