// AI任务生成前端测试用例
import aiTaskGeneratorService from '../services/aiTaskGeneratorService';

// 测试AI任务生成
async function testAITaskGeneration() {
    console.log('开始测试AI任务生成...');
    
    try {
        const request = {
            project_id: 39, // 替换为实际项目ID
            provider: "deepseek",
            input_text: "开发一个用户管理模块，包括增删改查功能",
            options: {
                max_tasks: 5,
                enable_duplicate_check: true,
                enable_dependency_analysis: true,
                enable_skill_tagging: true
            }
        };
        
        console.log('发送请求:', request);
        
        const response = await aiTaskGeneratorService.generateTasks(request);
        
        if (response.success) {
            console.log('✅ 任务生成成功!');
            console.log('生成的任务数量:', response.data.generation_result.total_tasks);
            console.log('生成的任务:', response.data.generation_result.generated_tasks);
        } else {
            console.error('❌ 任务生成失败:', response.error);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

// 在浏览器控制台中运行
// testAITaskGeneration();

export { testAITaskGeneration };