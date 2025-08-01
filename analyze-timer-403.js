#!/usr/bin/env node

const jwt = require('jsonwebtoken');

/**
 * 分析个人计时器403错误的调试工具
 */
function analyzeTimer403Error() {
    console.log('🔍 个人计时器403错误分析');
    console.log('=' .repeat(60));

    // 1. 检查localStorage中的token
    console.log('1️⃣ 检查前端token状态');
    console.log('-' .repeat(30));
    
    // 模拟前端获取token的过程
    console.log('需要在浏览器控制台运行以下代码来获取token信息:');
    console.log(`
const token = localStorage.getItem('token');
if (!token) {
    console.log('❌ 未找到token，用户可能未登录');
} else {
    console.log('✅ 找到token:', token.substring(0, 50) + '...');
    
    try {
        // 解码token payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('📋 Token信息:', {
            user_id: payload.user_id,
            username: payload.username,
            role: payload.role,
            user_type: payload.user_type,
            exp: new Date(payload.exp * 1000),
            iat: new Date(payload.iat * 1000)
        });
        
        // 检查token是否过期
        const now = Date.now() / 1000;
        if (payload.exp < now) {
            console.log('❌ Token已过期:', new Date(payload.exp * 1000));
        } else {
            console.log('✅ Token有效，剩余时间:', Math.floor((payload.exp - now) / 60), '分钟');
        }
    } catch (error) {
        console.log('❌ Token解析失败:', error.message);
    }
}
    `);

    // 2. API请求分析
    console.log('\n2️⃣ API请求分析');
    console.log('-' .repeat(30));
    
    console.log('错误信息分析:');
    console.log('- 状态码: 403 (Forbidden)');
    console.log('- 错误来源: personalTimerService.ts:210');
    console.log('- API路径: POST /api/v1/user/timer/start-personal');
    console.log('- 错误类型: AppError: 权限不足');

    // 3. 可能的原因分析
    console.log('\n3️⃣ 可能的原因分析');
    console.log('-' .repeat(30));
    
    const possibleCauses = [
        {
            cause: 'Token过期或无效',
            description: 'JWT token已过期或格式不正确',
            solution: '重新登录获取新token'
        },
        {
            cause: '用户类型权限不足',
            description: '用户类型不允许访问个人计时器功能',
            solution: '检查用户的user_type字段，确保有相应权限'
        },
        {
            cause: '任务ID不存在或无权限',
            description: '传递的task_id不存在或用户无权访问',
            solution: '检查传递的task_id是否正确且用户有权限'
        },
        {
            cause: '中间件权限检查失败',
            description: '认证中间件或权限中间件阻止了请求',
            solution: '检查后端中间件配置'
        },
        {
            cause: '任务所有权验证失败',
            description: 'CheckUserOwnership返回false',
            solution: '确保用户拥有该任务的所有权'
        }
    ];

    possibleCauses.forEach((item, index) => {
        console.log(`${index + 1}. ${item.cause}`);
        console.log(`   描述: ${item.description}`);
        console.log(`   解决方案: ${item.solution}`);
        console.log('');
    });

    // 4. 调试步骤
    console.log('\n4️⃣ 详细调试步骤');
    console.log('-' .repeat(30));
    
    console.log('A. 检查前端token状态');
    console.log('   - 在浏览器开发者工具 → 应用 → 本地存储 中查看token');
    console.log('   - 使用上面的代码片段解析token内容');
    
    console.log('\nB. 检查API请求');
    console.log('   - 打开浏览器开发者工具 → 网络标签');
    console.log('   - 尝试启动计时器，观察请求详情');
    console.log('   - 检查请求头中的Authorization字段');
    
    console.log('\nC. 检查后端日志');
    console.log('   - 查看后端认证中间件日志');
    console.log('   - 检查personal_timer_handlers.go中的权限验证逻辑');
    
    console.log('\nD. 验证数据库状态');
    console.log('   - 检查user_timer_tasks表中是否存在相应记录');
    console.log('   - 验证用户是否为任务的所有者');

    // 5. 快速修复建议
    console.log('\n5️⃣ 快速修复建议');
    console.log('-' .repeat(30));
    
    console.log('1. 立即尝试: 重新登录');
    console.log('2. 如果问题持续: 检查传递给startPersonalTimer的task_id');
    console.log('3. 开发者修复: 在personal_timer_handlers.go中添加更详细的日志');
    console.log('4. 确保任务存在: 先创建个人计时任务再尝试启动');

    // 6. 测试用例
    console.log('\n6️⃣ 建议的测试用例');
    console.log('-' .repeat(30));
    
    console.log(`
// 1. 创建个人计时任务
const createTask = {
    title: "测试任务",
    description: "用于测试计时器的任务", 
    category: "work",
    color: "#1890ff",
    is_favorite: false
};

// 2. 启动个人计时器
const startTimer = {
    task_type: "personal",
    task_id: 1, // 使用创建任务返回的ID
    auto_stop_others: true
};
    `);

    console.log('\n7️⃣ 诊断命令');
    console.log('-' .repeat(30));
    console.log('运行以下命令进行详细诊断:');
    console.log('TOKEN=your_jwt_token node debug-timer-403.js');
}

// 运行分析
analyzeTimer403Error();
