// 测试新增的工作笔记MCP功能
import { TaskMCPServer } from '../task-mcp.js';

async function testWorkNotes() {
  const apiBaseUrl = process.env.TASK_API_BASE || 'http://localhost:8080/api/v1';
  const taskServer = new TaskMCPServer(apiBaseUrl);

  console.log('🧪 测试工作笔记MCP功能...\n');

  try {
    // 测试1: 创建工作笔记
    console.log('1️⃣ 测试创建工作笔记...');
    const createResult = await taskServer.createWorkNote(
      'MCP增强完成报告',
      '# 测试内容\n这是通过MCP创建的工作笔记测试',
      {
        type: 'markdown',
        tags: ['MCP', '测试', '技术报告'],
        visibility: 'team',
        status: 'published'
      }
    );
    console.log('创建结果:', createResult);

    if (createResult.success) {
      const noteId = createResult.id;
      
      // 测试2: 获取工作笔记详情
      console.log('\n2️⃣ 测试获取工作笔记详情...');
      const getResult = await taskServer.getWorkNote(noteId);
      console.log('获取结果:', getResult);

      // 测试3: 更新工作笔记
      console.log('\n3️⃣ 测试更新工作笔记...');
      const updateResult = await taskServer.updateWorkNote(noteId, {
        content: '# 更新后的内容\n这是更新后的工作笔记内容',
        tags: ['MCP', '测试', '技术报告', '已更新']
      });
      console.log('更新结果:', updateResult);
    }

    // 测试4: 列出工作笔记
    console.log('\n4️⃣ 测试列出工作笔记...');
    const listResult = await taskServer.listWorkNotes({
      page: 1,
      limit: 5,
      status: 'published'
    });
    console.log('列出结果:', listResult);

    // 测试5: 搜索工作笔记
    console.log('\n5️⃣ 测试搜索工作笔记...');
    const searchResult = await taskServer.searchWorkNotes('MCP增强', {
      tags: ['MCP'],
      limit: 10
    });
    console.log('搜索结果:', searchResult);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testWorkNotes().then(() => {
  console.log('\n✅ 工作笔记功能测试完成！');
}).catch((error) => {
  console.error('\n❌ 测试过程中出现错误:', error);
});
