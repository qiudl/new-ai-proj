import { TaskMCPServer } from './task-mcp.js';

async function createTaskDocumentRefactorProject() {
    const taskServer = new TaskMCPServer();
    
    try {
        console.log('开始创建任务文档重构项目...\n');
        
        // 1. 创建主任务
        console.log('🔨 创建主任务：任务文档重构');
        const mainTask = await taskServer.createTask(
            '任务文档重构', 
            1, // 项目ID为1
            {
                description: '重构任务文档存储系统，从内存存储迁移到数据库持久化存储，统一文档管理API，提升数据安全性和系统可靠性',
                priority: 'high',
                status: 'todo',
                custom_fields: {
                    priority: 'high',
                    estimated_hours: 11,
                    tags: ['架构重构', '数据库迁移', 'API统一']
                }
            }
        );
        
        if (!mainTask.success) {
            throw new Error(`创建主任务失败: ${mainTask.error}`);
        }
        
        console.log(`✅ 主任务创建成功: ID ${mainTask.id} - "${mainTask.title}"`);
        console.log(`   优先级: ${mainTask.priority}, 状态: ${mainTask.status}\n`);
        
        const mainTaskId = mainTask.id;
        
        // 2. 创建子任务
        const subtasks = [
            {
                title: '数据库迁移与表创建',
                description: '执行documents表迁移，创建task_documents关联表，添加索引和约束',
                estimated_hours: 2,
                priority: 'high'
            },
            {
                title: '后端API重构',
                description: '移除内存存储SimpleDocumentHandler，实现基于数据库的DocumentHandler，创建任务文档关联API',
                estimated_hours: 4,
                priority: 'high'
            },
            {
                title: '前端服务整合',
                description: '合并多个文档服务为统一API，更新TaskDocumentWidget，优化文档管理界面',
                estimated_hours: 3,
                priority: 'medium'
            },
            {
                title: '功能增强与测试',
                description: '实现文档版本控制，添加搜索功能，完善权限管理，系统测试',
                estimated_hours: 2,
                priority: 'medium'
            }
        ];
        
        console.log('📋 创建子任务...');
        const createdSubtasks = [];
        
        for (let i = 0; i < subtasks.length; i++) {
            const subtask = subtasks[i];
            console.log(`   ${i + 1}. 创建子任务: ${subtask.title}`);
            
            const result = await taskServer.createTask(
                subtask.title,
                1, // 项目ID为1
                {
                    description: subtask.description,
                    priority: subtask.priority,
                    status: 'todo',
                    parent_id: mainTaskId,
                    custom_fields: {
                        priority: subtask.priority,
                        estimated_hours: subtask.estimated_hours
                    }
                }
            );
            
            if (result.success) {
                createdSubtasks.push(result);
                console.log(`      ✅ 子任务创建成功: ID ${result.id}`);
                console.log(`         预估工时: ${subtask.estimated_hours}小时, 优先级: ${result.priority}`);
            } else {
                console.error(`      ❌ 子任务创建失败: ${result.error}`);
            }
        }
        
        // 3. 生成报告
        console.log('\n📊 任务创建报告');
        console.log('==========================================');
        console.log(`主任务: ${mainTask.title} (ID: ${mainTask.id})`);
        console.log(`描述: 重构任务文档存储系统，从内存存储迁移到数据库持久化存储`);
        console.log(`优先级: ${mainTask.priority}`);
        console.log(`总预估工时: 11小时`);
        console.log(`标签: 架构重构、数据库迁移、API统一\n`);
        
        console.log('子任务列表:');
        createdSubtasks.forEach((subtask, index) => {
            const originalSubtask = subtasks[index];
            console.log(`  ${index + 1}. ${subtask.title} (ID: ${subtask.id})`);
            console.log(`     描述: ${originalSubtask.description}`);
            console.log(`     预估工时: ${originalSubtask.estimated_hours}小时`);
            console.log(`     优先级: ${subtask.priority}`);
            console.log(`     状态: ${subtask.status}\n`);
        });
        
        console.log('==========================================');
        console.log(`🎉 任务文档重构项目创建完成！`);
        console.log(`主任务ID: ${mainTask.id}`);
        console.log(`子任务数量: ${createdSubtasks.length}`);
        console.log(`总预估工时: 11小时 (${subtasks.reduce((sum, task) => sum + task.estimated_hours, 0)}小时)`);
        
        // 返回创建的任务信息供后续跟踪
        return {
            mainTask: {
                id: mainTask.id,
                title: mainTask.title,
                priority: mainTask.priority,
                status: mainTask.status
            },
            subtasks: createdSubtasks.map((subtask, index) => ({
                id: subtask.id,
                title: subtask.title,
                priority: subtask.priority,
                status: subtask.status,
                estimated_hours: subtasks[index].estimated_hours
            }))
        };
        
    } catch (error) {
        console.error('❌ 创建任务文档重构项目失败:', error.message);
        throw error;
    }
}

// 执行创建任务
if (import.meta.url === `file://${process.argv[1]}`) {
    createTaskDocumentRefactorProject()
        .then((result) => {
            console.log('\n✅ 任务创建脚本执行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ 任务创建脚本执行失败:', error.message);
            process.exit(1);
        });
}

export { createTaskDocumentRefactorProject };