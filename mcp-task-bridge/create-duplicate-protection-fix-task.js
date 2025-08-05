import { TaskMCPServer } from './task-mcp.js';

async function createDuplicateProtectionFixTask() {
    const mcp = new TaskMCPServer();
    
    try {
        console.log('🔧 创建任务标题重复防护修复任务...');
        
        // 创建在第32周根任务下的子任务
        const rootTaskId = 442; // 从之前的测试中获得的第32周根任务ID
        
        const taskTitle = '修复任务标题重复防护机制失效问题';
        const taskDescription = `
## 问题描述
通过测试发现，AI项目管理平台的任务标题重复创建防护功能完全失效。

## 测试结果
- ✅ 发现后端main.go中有重复检查代码（第129-142行）
- ❌ 但实际测试中，相同标题的任务可以重复创建
- ❌ MCP接口创建重复任务成功
- ❌ 直接API调用创建重复任务成功
- ❌ 批量导入也没有重复检查

## 测试证据
测试中成功创建了3个相同标题的任务：
- 任务ID: 446 (子任务)
- 任务ID: 447 (子任务重复)
- 任务ID: 448 (直接API重复)

## 需要修复的内容
1. **后端API重复检查逻辑**：虽然代码存在，但没有正常工作
2. **子任务创建防护**：createSubTask应该也要检查重复
3. **批量导入防护**：bulk-import应该检查并拒绝重复标题
4. **前端错误处理**：确保409错误有友好的用户提示

## 修复优先级
- P0: 修复基本的任务创建重复检查
- P1: 修复子任务创建重复检查
- P2: 修复批量导入重复检查
- P3: 改进前端错误提示

## 验证方法
1. 创建任务A
2. 尝试创建相同标题任务B，应该收到409冲突错误
3. 尝试创建子任务C，相同标题应该被拒绝
4. 批量导入包含重复标题的任务，应该有适当的错误处理
        `;
        
        const result = await mcp.createSubTask(rootTaskId, {
            title: taskTitle,
            description: taskDescription,
            priority: 'high',
            status: 'todo',
            tags: ['bug', 'backend', 'api', 'duplicate-protection']
        });
        
        if (result.success) {
            console.log('✅ 修复任务创建成功！');
            console.log(`任务ID: ${result.id}`);
            console.log(`任务标题: ${result.title}`);
            console.log(`状态: ${result.status}`);
            console.log(`优先级: ${result.priority}`);
            
            // 创建子任务分解具体修复步骤
            const subTasks = [
                {
                    title: '分析后端重复检查代码失效原因',
                    description: '检查main.go中第129-142行的重复检查逻辑，分析为什么没有正常工作。可能的原因包括：数据库查询语法错误、字段名不匹配、SQL占位符问题等。',
                    priority: 'high'
                },
                {
                    title: '修复基本任务创建的重复检查',
                    description: '确保/api/v1/projects/{id}/tasks POST接口正确检查并阻止重复标题的任务。返回409 Conflict状态码和清晰的错误信息。',
                    priority: 'high'
                },
                {
                    title: '实现子任务创建重复检查',
                    description: '子任务创建时也应该检查同一项目内是否存在相同标题的任务，无论是根任务还是其他子任务。',
                    priority: 'medium'
                },
                {
                    title: '增强批量导入重复检查',
                    description: '批量导入API应该在导入前检查所有任务标题，发现重复时提供详细的错误报告，告知哪些任务因重复被跳过。',
                    priority: 'medium'
                },
                {
                    title: '改进前端错误提示UI',
                    description: '确保前端正确处理409冲突错误，显示用户友好的错误消息，如"该任务标题已存在，请使用不同的标题"。',
                    priority: 'low'
                },
                {
                    title: '编写重复防护功能的单元测试',
                    description: '创建完整的测试用例，覆盖各种重复创建场景：基本任务、子任务、批量导入、不同项目间的任务等。',
                    priority: 'low'
                }
            ];
            
            console.log('\\n📝 创建子任务分解修复步骤...');
            for (let i = 0; i < subTasks.length; i++) {
                const subTask = subTasks[i];
                const subResult = await mcp.createSubTask(result.id, subTask);
                
                if (subResult.success) {
                    console.log(`✅ 子任务 ${i + 1} 创建成功: ${subTask.title}`);
                } else {
                    console.log(`❌ 子任务 ${i + 1} 创建失败: ${subResult.error}`);
                }
                
                // 等待一下避免过于频繁的请求
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            console.log('\\n🎯 任务创建完成！');
            console.log('现在可以开始修复任务标题重复防护机制了。');
            
        } else {
            console.log('❌ 修复任务创建失败:', result.error);
        }
        
    } catch (error) {
        console.error('❌ 创建修复任务时发生错误:', error);
    }
}

// 运行脚本
createDuplicateProtectionFixTask().catch(console.error);