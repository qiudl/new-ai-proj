// prisma/seed.ts - 种子数据生成脚本
import { PrismaClient, TaskStatus, Priority, DocumentType } from '@prisma/client';
import { faker } from '@faker-js/faker';
const prisma = new PrismaClient();
async function createUsers(count = 5) {
    console.log(`🧑‍💼 创建 ${count} 个用户...`);
    const users = [];
    for (let i = 0; i < count; i++) {
        const user = await prisma.user.create({
            data: {
                email: faker.internet.email(),
                name: faker.person.fullName(),
                avatar: faker.image.avatar(),
                isActive: faker.datatype.boolean(0.9) // 90% 用户是活跃的
            }
        });
        users.push(user);
    }
    console.log(`✅ 已创建 ${users.length} 个用户`);
    return users;
}
async function createProject() {
    const projectName = faker.company.name() + ' Project';
    const project = await prisma.project.create({
        data: {
            name: projectName,
            description: faker.lorem.paragraphs(2)
        }
    });
    console.log(`📁 创建项目: ${project.name}`);
    return project;
}
async function createTaskHierarchy(projectId, userIds, depth = 3, tasksPerLevel = 3, parentId) {
    const tasks = [];
    for (let i = 0; i < tasksPerLevel; i++) {
        const taskData = {
            title: faker.hacker.phrase(),
            description: faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 })),
            status: faker.helpers.enumValue(TaskStatus),
            priority: faker.helpers.enumValue(Priority),
            projectId,
            parentId,
            assigneeId: faker.helpers.arrayElement([...userIds, null]), // 可能没有分配给任何人
            dueDate: faker.date.future({ days: 30 })
        };
        const task = await prisma.task.create({
            data: taskData
        });
        tasks.push(task);
        // 递归创建子任务
        if (depth > 1) {
            const childTasks = await createTaskHierarchy(projectId, userIds, depth - 1, Math.max(1, Math.floor(tasksPerLevel / 2)), // 每层减少任务数
            task.id);
            tasks.push(...childTasks);
        }
    }
    return tasks;
}
async function createDocuments(taskIds, projectId, count = 2) {
    const documents = [];
    for (let i = 0; i < count; i++) {
        const taskId = faker.helpers.arrayElement([...taskIds, null]);
        const document = await prisma.document.create({
            data: {
                title: faker.lorem.words(3),
                content: generateMarkdownContent(),
                type: faker.helpers.enumValue(DocumentType),
                taskId,
                projectId,
                tags: faker.helpers.arrayElements([
                    'documentation', 'spec', 'requirements', 'design',
                    'api', 'testing', 'deployment', 'maintenance'
                ], { min: 1, max: 4 })
            }
        });
        documents.push(document);
    }
    return documents;
}
async function createTimeLogs(taskIds, count = 15) {
    const timeLogs = [];
    for (let i = 0; i < count; i++) {
        const taskId = faker.helpers.arrayElement(taskIds);
        const startTime = faker.date.past({ days: 30 });
        const duration = faker.number.int({ min: 900, max: 14400 }); // 15分钟到4小时
        const endTime = new Date(startTime.getTime() + duration * 1000);
        const timeLog = await prisma.timeLog.create({
            data: {
                taskId,
                description: faker.lorem.sentence(),
                startTime,
                endTime: faker.datatype.boolean(0.8) ? endTime : null, // 80% 有结束时间
                duration
            }
        });
        timeLogs.push(timeLog);
    }
    return timeLogs;
}
function generateMarkdownContent() {
    const sections = [
        `# ${faker.lorem.words(3)}`,
        `## 概述`,
        faker.lorem.paragraphs(2),
        `## 技术要求`,
        `- ${faker.lorem.sentence()}`,
        `- ${faker.lorem.sentence()}`,
        `- ${faker.lorem.sentence()}`,
        `## 实现方案`,
        faker.lorem.paragraphs(1),
        '```javascript',
        `const ${faker.hacker.noun()} = {`,
        `  ${faker.hacker.noun()}: '${faker.lorem.word()}',`,
        `  ${faker.hacker.noun()}: ${faker.number.int({ min: 1, max: 100 })},`,
        `  ${faker.hacker.noun()}: ${faker.datatype.boolean()}`,
        `};`,
        '```',
        `## 验收标准`,
        `- [ ] ${faker.lorem.sentence()}`,
        `- [ ] ${faker.lorem.sentence()}`,
        `- [ ] ${faker.lorem.sentence()}`
    ];
    return sections.join('\n\n');
}
async function seedDatabase(options = {}) {
    const { projectCount = 3, tasksPerProject = 10, maxTaskDepth = 3, documentsPerTask = 2, timeLogsPerTask = 3 } = options;
    try {
        console.log('🌱 开始种子数据生成...');
        // 清理现有数据（仅在开发环境）
        if (process.env.NODE_ENV === 'development') {
            console.log('🗑️  清理现有数据...');
            await prisma.timeLog.deleteMany();
            await prisma.document.deleteMany();
            await prisma.task.deleteMany();
            await prisma.project.deleteMany();
            await prisma.user.deleteMany();
            console.log('✅ 数据清理完成');
        }
        // 创建用户
        const users = await createUsers(8);
        const userIds = users.map(u => u.id);
        // 创建项目和相关数据
        for (let i = 0; i < projectCount; i++) {
            console.log(`\n📁 创建项目 ${i + 1}/${projectCount}...`);
            const project = await createProject();
            // 创建任务层级
            console.log(`📝 创建任务层级 (深度: ${maxTaskDepth})...`);
            const tasks = await createTaskHierarchy(project.id, userIds, maxTaskDepth, Math.ceil(tasksPerProject / maxTaskDepth));
            const taskIds = tasks.map(t => t.id);
            console.log(`✅ 已创建 ${tasks.length} 个任务`);
            // 创建文档
            console.log(`📄 创建文档...`);
            const documents = await createDocuments(taskIds, project.id, Math.floor(tasks.length * documentsPerTask / 2));
            console.log(`✅ 已创建 ${documents.length} 个文档`);
            // 创建时间记录
            console.log(`⏱️  创建时间记录...`);
            const timeLogs = await createTimeLogs(taskIds, Math.floor(tasks.length * timeLogsPerTask));
            console.log(`✅ 已创建 ${timeLogs.length} 条时间记录`);
        }
        // 创建特殊的演示项目
        console.log('\n🎯 创建演示项目...');
        await createDemoProject(userIds);
        console.log('\n🎉 种子数据生成完成！');
        // 输出统计信息
        const stats = await getDatabaseStats();
        console.log('\n📊 数据库统计：');
        console.table(stats);
    }
    catch (error) {
        console.error('❌ 种子数据生成失败:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
async function createDemoProject(userIds) {
    const project = await prisma.project.create({
        data: {
            name: 'MCP Task Bridge 演示项目',
            description: '这是一个用于演示多AI并行开发的项目，展示了完整的任务管理流程。'
        }
    });
    // 创建M1里程碑任务
    const m1Task = await prisma.task.create({
        data: {
            title: 'M1：数据模型与迁移脚本',
            description: 'Prisma 初始化与对现有表的对齐',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            projectId: project.id,
            assigneeId: faker.helpers.arrayElement(userIds),
            dueDate: new Date('2025-08-30')
        }
    });
    // 创建子任务
    const subTasks = [
        {
            title: 'M1-1：现状盘点与对齐准则',
            status: 'COMPLETED',
            assignee: 'AI-架构师'
        },
        {
            title: 'M1-3：Prisma 初始化与基线迁移',
            status: 'COMPLETED',
            assignee: 'AI-数据库专家'
        },
        {
            title: 'M1-4：差异对齐与增量迁移',
            status: 'IN_PROGRESS',
            assignee: 'AI-数据库专家'
        },
        {
            title: 'M1-5：种子数据与生成脚本',
            status: 'TODO',
            assignee: 'AI-数据库专家'
        },
        {
            title: 'M1-6：测试与验收',
            status: 'TODO',
            assignee: 'AI-测试工程师'
        },
        {
            title: 'M1-7：CI/CD 集成',
            status: 'TODO',
            assignee: 'AI-DevOps工程师'
        }
    ];
    for (const subTaskData of subTasks) {
        const subTask = await prisma.task.create({
            data: {
                title: subTaskData.title,
                description: `由${subTaskData.assignee}负责的子任务`,
                status: subTaskData.status,
                priority: 'MEDIUM',
                projectId: project.id,
                parentId: m1Task.id,
                assigneeId: faker.helpers.arrayElement(userIds)
            }
        });
        // 为已完成的任务创建文档
        if (subTaskData.status === 'COMPLETED') {
            await prisma.document.create({
                data: {
                    title: `${subTaskData.title} - 完成文档`,
                    content: generateTaskCompletionDoc(subTaskData.title, subTaskData.assignee),
                    type: 'MARKDOWN',
                    taskId: subTask.id,
                    projectId: project.id,
                    tags: ['完成报告', '技术文档']
                }
            });
        }
    }
    console.log(`✅ 演示项目创建完成: ${project.name}`);
}
function generateTaskCompletionDoc(title, assignee) {
    return `# ${title} - 完成报告

## 任务概述
本任务由 **${assignee}** 负责完成。

## 完成情况
- ✅ 所有预期功能已实现
- ✅ 代码质量检查通过
- ✅ 测试覆盖率达标
- ✅ 文档更新完成

## 技术细节
${faker.lorem.paragraphs(2)}

## 交付物
- ${faker.lorem.sentence()}
- ${faker.lorem.sentence()}
- ${faker.lorem.sentence()}

## 后续建议
${faker.lorem.paragraph()}

---
*由 ${assignee} 于 ${new Date().toLocaleDateString()} 完成*
`;
}
async function getDatabaseStats() {
    const [projects, tasks, documents, timeLogs, users] = await Promise.all([
        prisma.project.count(),
        prisma.task.count(),
        prisma.document.count(),
        prisma.timeLog.count(),
        prisma.user.count()
    ]);
    return {
        '项目数': projects,
        '任务数': tasks,
        '文档数': documents,
        '时间记录数': timeLogs,
        '用户数': users
    };
}
// 如果直接运行此脚本
if (require.main === module) {
    const options = {
        projectCount: parseInt(process.env.SEED_PROJECT_COUNT || '3'),
        tasksPerProject: parseInt(process.env.SEED_TASKS_PER_PROJECT || '10'),
        maxTaskDepth: parseInt(process.env.SEED_MAX_DEPTH || '3'),
        documentsPerTask: parseInt(process.env.SEED_DOCS_PER_TASK || '2'),
        timeLogsPerTask: parseInt(process.env.SEED_LOGS_PER_TASK || '3')
    };
    seedDatabase(options)
        .then(() => {
        console.log('🎉 种子数据生成完成');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ 种子数据生成失败:', error);
        process.exit(1);
    });
}
export { seedDatabase, createDemoProject, getDatabaseStats };
