const axios = require('axios');

// Use the existing auth token from the scripts
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function createTask(title, description, status = 'todo', parentId = null) {
    try {
        const taskData = {
            title,
            description,
            status,
            assignee_id: 1
        };
        
        if (parentId) {
            taskData.parent_id = parentId;
        }
        
        const response = await axios.post(`${apiBase}/projects/1/tasks`, taskData, {
            headers,
            proxy: false
        });
        
        if (response.data?.success) {
            console.log(`✅ Created task: ${title} (ID: ${response.data.data.id})`);
            return response.data.data.id;
        } else {
            console.error(`❌ Failed to create task: ${title}`, response.data);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error creating task: ${title}`, error.response?.data || error.message);
        return null;
    }
}

async function createBatchTestData() {
    console.log('🚀 Creating comprehensive test data for batch parent task change testing...\n');
    
    try {
        // 1. Create main test container
        const testContainerId = await createTask(
            '批量父任务更改测试 - 测试容器',
            '# 批量父任务更改功能测试\n\n此任务作为批量父任务更改功能的测试容器，包含多个子任务用于测试各种批量操作场景。\n\n## 测试场景\n1. 基本批量移动\n2. 循环依赖检测\n3. 层级深度限制\n4. 不同状态任务处理\n5. 验证和预览功能',
            'todo'
        );

        if (!testContainerId) {
            console.error('❌ Failed to create test container, aborting...');
            return;
        }

        // 2. Create target parent tasks (destinations for batch moves)
        const targetParent1Id = await createTask(
            '目标父任务A - 批量移动测试目标',
            '# 目标父任务A\n\n这是批量父任务更改功能的测试目标父任务。测试中会将多个任务批量移动到此任务下。',
            'todo'
        );

        const targetParent2Id = await createTask(
            '目标父任务B - 批量移动测试目标',
            '# 目标父任务B\n\n这是批量父任务更改功能的另一个测试目标父任务。用于测试多个目标父任务的场景。',
            'todo'
        );

        // 3. Create source tasks under test container
        console.log('\n📋 Creating source tasks for batch testing...');
        
        const sourceTask1Id = await createTask(
            '源任务1 - 待批量移动 (Todo状态)',
            '# 源任务1\n\n状态：Todo\n用途：测试todo状态任务的批量移动',
            'todo',
            testContainerId
        );

        const sourceTask2Id = await createTask(
            '源任务2 - 待批量移动 (In Progress状态)',
            '# 源任务2\n\n状态：In Progress\n用途：测试in_progress状态任务的批量移动',
            'in_progress',
            testContainerId
        );

        const sourceTask3Id = await createTask(
            '源任务3 - 待批量移动 (Todo状态)',
            '# 源任务3\n\n状态：Todo\n用途：测试多个todo状态任务的批量移动',
            'todo',
            testContainerId
        );

        const sourceTask4Id = await createTask(
            '源任务4 - 有子任务的源任务',
            '# 源任务4\n\n特殊用途：此任务有子任务，用于测试包含子任务的任务批量移动',
            'todo',
            testContainerId
        );

        // 4. Create child tasks under sourceTask4 to test hierarchy
        console.log('\n👶 Creating child tasks for hierarchy testing...');
        
        if (sourceTask4Id) {
            await createTask(
                '源任务4的子任务1',
                '这是源任务4的子任务，用于测试层级结构',
                'todo',
                sourceTask4Id
            );

            await createTask(
                '源任务4的子任务2',
                '这是源任务4的另一个子任务，用于测试层级结构',
                'todo',
                sourceTask4Id
            );
        }

        // 5. Create some existing child tasks under target parents
        console.log('\n🎯 Creating existing child tasks under target parents...');
        
        if (targetParent1Id) {
            await createTask(
                '目标父任务A的现有子任务1',
                '这是目标父任务A的现有子任务，用于测试合并场景',
                'completed',
                targetParent1Id
            );

            await createTask(
                '目标父任务A的现有子任务2',
                '这是目标父任务A的另一个现有子任务',
                'in_progress',
                targetParent1Id
            );
        }

        if (targetParent2Id) {
            await createTask(
                '目标父任务B的现有子任务1',
                '这是目标父任务B的现有子任务',
                'todo',
                targetParent2Id
            );
        }

        // 6. Create edge case scenarios
        console.log('\n🔍 Creating edge case test scenarios...');
        
        const deepParentId = await createTask(
            '深层级测试父任务',
            '# 深层级测试\n\n用于测试层级深度限制的父任务',
            'todo'
        );

        if (deepParentId) {
            const deepChild1Id = await createTask(
                '深层级子任务L2',
                '第二层子任务',
                'todo',
                deepParentId
            );

            if (deepChild1Id) {
                const deepChild2Id = await createTask(
                    '深层级子任务L3',
                    '第三层子任务',
                    'todo',
                    deepChild1Id
                );

                if (deepChild2Id) {
                    await createTask(
                        '深层级子任务L4 - 即将到达深度限制',
                        '第四层子任务，用于测试深度限制',
                        'todo',
                        deepChild2Id
                    );
                }
            }
        }

        console.log('\n🎉 Batch test data creation completed!');
        console.log('\n📊 Test Data Summary:');
        console.log('=====================================');
        console.log('✅ 1 x Test Container (with 4 source tasks)');
        console.log('✅ 2 x Target Parent Tasks (with existing children)');
        console.log('✅ 4 x Source Tasks (various statuses)');
        console.log('✅ 2 x Child Tasks (under source task 4)');
        console.log('✅ 3 x Existing Child Tasks (under target parents)');
        console.log('✅ 1 x Deep Hierarchy Test (4 levels deep)');
        console.log('');
        console.log('🧪 Test Scenarios Available:');
        console.log('- Basic batch move (select 2-3 source tasks, move to target parent)');
        console.log('- Mixed status batch move (todo + in_progress tasks)');
        console.log('- Tasks with children batch move (test hierarchy handling)');
        console.log('- Deep hierarchy validation (test depth limits)');
        console.log('- Merge with existing children (test target parent scenarios)');
        console.log('');
        console.log('📱 Ready for UI Testing! Open: http://localhost/projects/1');

    } catch (error) {
        console.error('❌ Error during test data creation:', error.response?.data || error.message);
    }
}

// Execute the test data creation
createBatchTestData();