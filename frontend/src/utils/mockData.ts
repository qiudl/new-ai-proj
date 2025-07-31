// 历史任务演示数据
export const mockHistoryTasks = [
  {
    task_id: 1,
    task_title: "优化Dashboard页面性能",
    project_name: "AI项目管理系统",
    last_timed_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分钟前
    total_seconds: 7200, // 2小时
    formatted_time: "2h 0m",
    status: "in_progress"
  },
  {
    task_id: 2,
    task_title: "修复任务计时器BUG",
    project_name: "AI项目管理系统",
    last_timed_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2小时前
    total_seconds: 3600, // 1小时
    formatted_time: "1h 0m",
    status: "completed"
  },
  {
    task_id: 3,
    task_title: "设计历史任务UI界面",
    project_name: "AI项目管理系统",
    last_timed_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4小时前
    total_seconds: 5400, // 1.5小时
    formatted_time: "1h 30m",
    status: "completed"
  },
  {
    task_id: 4,
    task_title: "编写API文档",
    project_name: "后端开发",
    last_timed_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1天前
    total_seconds: 2700, // 45分钟
    formatted_time: "45m",
    status: "todo"
  },
  {
    task_id: 5,
    task_title: "代码审查和重构",
    project_name: "质量控制",
    last_timed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2天前
    total_seconds: 9000, // 2.5小时
    formatted_time: "2h 30m",
    status: "completed"
  }
];

// 检查是否为开发环境
export const isDevelopment = process.env.NODE_ENV === 'development';