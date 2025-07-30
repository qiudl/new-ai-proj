// 使用新的 GenerateCompletion API 的示例

// 1. 基础使用示例 - 任务生成
const generateTasksExample = async () => {
    const request = {
        provider: "deepseek",
        prompt: `请为以下项目需求生成具体的任务列表，返回JSON格式：
        
        项目：开发一个在线教育平台
        需求：
        - 用户注册和登录功能
        - 课程管理系统
        - 视频播放功能
        - 作业提交和批改
        
        返回格式要求：
        {
            "tasks": [
                {
                    "title": "任务标题",
                    "description": "任务描述",
                    "priority": "high/medium/low",
                    "estimated_hours": 数字,
                    "tags": ["标签1", "标签2"]
                }
            ]
        }`,
        temperature: 0.3,
        max_tokens: 2000
    };

    try {
        const response = await fetch('/api/ai-config/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(request)
        });

        const result = await response.json();
        if (result.success) {
            console.log('Generated content:', result.data.content);
            console.log('Token usage:', result.data.usage);
            console.log('Response time:', result.data.response_time, 'ms');
            
            // 解析生成的任务
            const tasks = JSON.parse(result.data.content);
            return tasks;
        }
    } catch (error) {
        console.error('Error generating tasks:', error);
    }
};

// 2. 高级使用示例 - 带上下文的生成
const generateWithContextExample = async () => {
    const request = {
        provider: "openai",
        prompt: "基于项目上下文，生成下一阶段的任务计划",
        model: "gpt-4",  // 覆盖默认模型
        temperature: 0.5,
        max_tokens: 1500,
        system_prompt: "你是一个专业的项目管理助手，擅长制定详细的任务计划。",
        context: {
            project_name: "电商平台优化",
            current_phase: "前端重构",
            completed_tasks: ["UI设计", "组件库搭建"],
            team_size: 5,
            deadline: "2024-03-01"
        }
    };

    const response = await fetch('/api/ai-config/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(request)
    });

    return await response.json();
};

// 3. 批量处理示例
const batchGenerateExample = async (items) => {
    const results = [];
    
    for (const item of items) {
        const request = {
            provider: "claude",
            prompt: `为以下功能生成测试用例：${item.feature}`,
            temperature: 0.2,
            max_tokens: 1000
        };

        try {
            const response = await fetch('/api/ai-config/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(request)
            });

            const result = await response.json();
            if (result.success) {
                results.push({
                    feature: item.feature,
                    testCases: result.data.content,
                    usage: result.data.usage
                });
            }
        } catch (error) {
            console.error(`Error processing ${item.feature}:`, error);
        }
    }
    
    return results;
};

// 4. 错误处理示例
const generateWithErrorHandling = async () => {
    try {
        const response = await fetch('/api/ai-config/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                provider: "deepseek",
                prompt: "生成任务列表..."
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            // 处理不同类型的错误
            switch (result.code) {
                case 'ERR_NOT_FOUND':
                    console.error('AI配置未找到，请先配置AI服务');
                    break;
                case 'ERR_UNAUTHORIZED':
                    console.error('未授权，请重新登录');
                    break;
                case 'ERR_BAD_REQUEST':
                    console.error('请求参数错误:', result.message);
                    break;
                default:
                    console.error('生成失败:', result.message);
            }
            return null;
        }

        return result.data;
    } catch (error) {
        console.error('网络错误:', error);
        return null;
    }
};
