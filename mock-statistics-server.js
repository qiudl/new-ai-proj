const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8888; // 改为8888端口

// 中间件
app.use(cors());
app.use(express.json());

// 模拟数据生成器
function generateMockTaskStats() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 生成模拟统计数据
  const totalTasks = Math.floor(Math.random() * 20) + 10; // 10-30个任务
  const completedTasks = Math.floor(totalTasks * (0.4 + Math.random() * 0.4)); // 40-80%完成率
  const inProgressTasks = Math.floor((totalTasks - completedTasks) * 0.6);
  const todoTasks = totalTasks - completedTasks - inProgressTasks;
  const overdueTasks = Math.floor(Math.random() * 3); // 0-2个逾期任务

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const onTimeCompletionRate = 75 + Math.random() * 20; // 75-95%
  
  // 时间统计（分钟）
  const totalPlannedTime = totalTasks * (45 + Math.random() * 30); // 45-75分钟每任务
  const totalActualTime = completedTasks * (40 + Math.random() * 40); // 40-80分钟每任务
  const totalRemainingTime = (totalTasks - completedTasks) * (50 + Math.random() * 20);
  const timeEfficiency = totalPlannedTime > 0 ? (totalActualTime / totalPlannedTime) * 100 : 100;
  
  // 优先级分布
  const priorityDistribution = {
    urgent: Math.floor(totalTasks * 0.1),
    high: Math.floor(totalTasks * 0.2),
    medium: Math.floor(totalTasks * 0.4),
    low: Math.floor(totalTasks * 0.2),
    unset: Math.floor(totalTasks * 0.1)
  };

  // 生成模拟任务列表
  const urgentTasks = [];
  const upcomingDeadlines = [];
  
  for (let i = 0; i < priorityDistribution.urgent && i < 5; i++) {
    urgentTasks.push({
      id: 1000 + i,
      title: `紧急任务 ${i + 1}`,
      status: Math.random() > 0.5 ? 'in_progress' : 'todo',
      project_id: 1,
      project_name: '重要项目',
      assignee_id: 1,
      assignee_name: '张三',
      due_date: tomorrow.toISOString().split('T')[0],
      created_at: today.toISOString(),
      updated_at: today.toISOString(),
      custom_fields: {
        priority: 'urgent'
      }
    });
  }

  for (let i = 0; i < 3; i++) {
    upcomingDeadlines.push({
      id: 2000 + i,
      title: `明日截止任务 ${i + 1}`,
      status: 'todo',
      project_id: 2,
      project_name: '日常项目',
      assignee_id: 2,
      assignee_name: '李四',
      due_date: tomorrow.toISOString().split('T')[0],
      created_at: yesterday.toISOString(),
      updated_at: today.toISOString(),
      custom_fields: {
        priority: 'medium'
      }
    });
  }

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    overdueTasks,
    completionRate: Math.round(completionRate),
    onTimeCompletionRate: Math.round(onTimeCompletionRate),
    totalPlannedTime: Math.round(totalPlannedTime),
    totalActualTime: Math.round(totalActualTime),
    totalRemainingTime: Math.round(totalRemainingTime),
    timeEfficiency: Math.round(timeEfficiency),
    priorityDistribution,
    estimatedWorkload: Math.round(totalRemainingTime / 60 * 10) / 10,
    avgTaskDuration: completedTasks > 0 ? Math.round(totalActualTime / completedTasks) : 0,
    yesterdayCompletion: Math.floor(Math.random() * 8) + 2,
    weeklyTrend: Math.round(completionRate + (Math.random() - 0.5) * 20),
    urgentTasks,
    upcomingDeadlines
  };
}

// API路由
app.get('/api/statistics/today-stats', (req, res) => {
  console.log(`${new Date().toISOString()} - 收到今日统计请求`);
  
  try {
    const stats = generateMockTaskStats();
    console.log('生成的统计数据:', {
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      completionRate: stats.completionRate,
      timeEfficiency: stats.timeEfficiency
    });
    
    res.json(stats);
  } catch (error) {
    console.error('生成统计数据失败:', error);
    res.status(500).json({
      error: '生成统计数据失败',
      message: error.message
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '时间段任务统计API服务器',
    version: '1.0.0',
    endpoints: {
      'GET /api/statistics/today-stats': '获取今日任务统计',
      'GET /health': '健康检查'
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 时间段任务统计API服务器启动成功!');
  console.log(`📊 服务器地址: http://localhost:${PORT}`);
  console.log(`📈 统计API: http://localhost:${PORT}/api/statistics/today-stats`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  console.log('==================================================');
  console.log('💡 提示: 这是一个模拟API服务器，生成随机的统计数据用于测试');
  console.log('🔄 每次请求都会生成新的随机数据');
  console.log('==================================================');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});
