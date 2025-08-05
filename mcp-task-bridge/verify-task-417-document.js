import { TaskMCPServer } from './task-mcp.js';

async function verifyTask417Document() {
    const mcp = new TaskMCPServer();
    
    console.log('验证任务417的文档内容...\n');
    
    try {
        // 获取任务文档内容
        const docResult = await mcp.getTaskDocument(417);
        
        if (docResult.success) {
            console.log('📄 任务417文档验证结果:');
            console.log(`- 任务ID: ${docResult.task_id}`);
            console.log(`- 项目ID: ${docResult.project_id}`);
            console.log(`- 文档标题: ${docResult.title}`);
            console.log(`- 内容长度: ${docResult.content.length} 字符`);
            console.log(`- 更新时间: ${docResult.updated_at}`);
            
            // 显示文档内容的前200个字符作为预览
            console.log('\n📝 文档内容预览:');
            console.log('=' + '='.repeat(50));
            console.log(docResult.content.substring(0, 300) + '...');
            console.log('=' + '='.repeat(50));
            
            // 检查关键内容是否存在
            const keyContent = [
                'Phase 4 - 多设备兼容性测试',
                'test-responsive-layout.html',
                '4个响应式断点',
                '浮层消除效果',
                '交互功能测试',
                '性能和用户体验',
                '100%完成'
            ];
            
            console.log('\n🔍 关键内容检查:');
            keyContent.forEach(key => {
                const found = docResult.content.includes(key);
                console.log(`- ${key}: ${found ? '✅' : '❌'}`);
            });
            
            console.log('\n✅ 文档验证完成！');
        } else {
            console.error('❌ 获取文档失败:', docResult.error);
        }
    } catch (error) {
        console.error('验证过程出错:', error.message);
    }
}

// 执行验证
verifyTask417Document().catch(console.error);