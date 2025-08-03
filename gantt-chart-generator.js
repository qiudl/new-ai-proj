import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

class IntelligentGanttGenerator {
  constructor() {
    this.taskServer = new TaskMCPServer();
  }

  // 🧠 AI智能工时估算算法
  estimateWorkHours(task) {
    let baseHours = 2; // 基础工时
    
    // 基于任务标题复杂度分析
    const title = task.title.toLowerCase();
    const complexityFactors = {
      'phase1': 1.2,    // 基础阶段
      'phase2': 1.5,    // 进阶阶段  
      'phase3': 2.0,    // 复杂阶段
      'phase4': 1.8,    // 验证阶段
      'bug修复': 1.5,   // Bug修复
      'api': 1.3,       // API相关
      '深度': 2.2,      // 深度分析
      '核心功能': 2.5,  // 核心功能
      '完整性': 1.8,    // 完整性检查
      '交互': 1.6,      // 交互功能
      '统计': 1.4,      // 统计功能
      '验证': 1.2       // 验证测试
    };
    
    // 扫描标题中的复杂度因子
    for (const [keyword, factor] of Object.entries(complexityFactors)) {
      if (title.includes(keyword)) {
        baseHours *= factor;
        break;
      }
    }
    
    // 基于优先级调整
    const priority = task.custom_fields?.priority || 'medium';
    const priorityMultiplier = {
      'high': 1.5,
      'medium': 1.0, 
      'low': 0.8
    };
    baseHours *= priorityMultiplier[priority];
    
    // 基于描述复杂度（描述越长越复杂）
    if (task.description) {
      const descLength = task.description.length;
      if (descLength > 1000) baseHours *= 1.3;
      else if (descLength > 500) baseHours *= 1.1;
    }
    
    // 基于任务ID（后创建的任务往往更复杂）
    if (task.id > 170) baseHours *= 1.2;
    
    return Math.round(baseHours * 10) / 10; // 保留1位小数
  }

  // 🔗 AI智能依赖关系分析
  analyzeDependencies(tasks) {
    const dependencies = {};
    
    // 基于Phase命名规律自动推断依赖
    const phaseOrder = ['phase1', 'phase2', 'phase3', 'phase4'];
    const phaseTasks = {};
    
    // 分类任务
    tasks.forEach(task => {
      const title = task.title.toLowerCase();
      
      // 识别Phase任务
      for (const phase of phaseOrder) {
        if (title.includes(phase)) {
          if (!phaseTasks[phase]) phaseTasks[phase] = [];
          phaseTasks[phase].push(task);
          break;
        }
      }
      
      // Bug修复任务之间的依赖（Bug#1 -> Bug#2 -> Bug#3）
      if (title.includes('bug修复#1')) {
        dependencies[task.id] = [];
      } else if (title.includes('bug修复#2')) {
        const bug1 = tasks.find(t => t.title.toLowerCase().includes('bug修复#1'));
        if (bug1) dependencies[task.id] = [bug1.id];
      } else if (title.includes('bug修复#3')) {
        const bug2 = tasks.find(t => t.title.toLowerCase().includes('bug修复#2'));
        if (bug2) dependencies[task.id] = [bug2.id];
      } else if (title.includes('bug修复执行计划')) {
        // 执行计划依赖所有Bug修复
        const bugTasks = tasks.filter(t => 
          t.title.toLowerCase().includes('bug修复#')
        );
        dependencies[task.id] = bugTasks.map(t => t.id);
      }
    });
    
    // Phase任务之间的依赖
    let previousPhaseTasks = [];
    for (const phase of phaseOrder) {
      if (phaseTasks[phase]) {
        phaseTasks[phase].forEach(task => {
          if (previousPhaseTasks.length > 0) {
            dependencies[task.id] = previousPhaseTasks.map(t => t.id);
          } else {
            dependencies[task.id] = [];
          }
        });
        previousPhaseTasks = phaseTasks[phase];
      }
    }
    
    return dependencies;
  }

  // ⏰ 智能时间安排算法
  calculateTimeline(tasks, dependencies) {
    const timeline = {};
    const baseStartDate = new Date('2025-08-03T09:00:00'); // 从今天开始
    
    // 拓扑排序确定执行顺序
    const calculateStartTime = (taskId, visited = new Set()) => {
      if (timeline[taskId]) return timeline[taskId];
      if (visited.has(taskId)) return baseStartDate; // 避免循环依赖
      
      visited.add(taskId);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return baseStartDate;
      
      const deps = dependencies[taskId] || [];
      let latestEnd = baseStartDate;
      
      // 找到所有依赖任务的最晚结束时间
      for (const depId of deps) {
        const depEndTime = calculateStartTime(depId, new Set(visited));
        if (depEndTime > latestEnd) {
          latestEnd = depEndTime;
        }
      }
      
      // 计算当前任务的开始和结束时间
      const startTime = new Date(latestEnd);
      const workHours = this.estimateWorkHours(task);
      const endTime = new Date(startTime.getTime() + workHours * 60 * 60 * 1000);
      
      timeline[taskId] = {
        start: startTime,
        end: endTime,
        duration: workHours,
        task: task
      };
      
      return endTime;
    };
    
    // 为所有任务计算时间线
    tasks.forEach(task => {
      calculateStartTime(task.id);
    });
    
    return timeline;
  }

  // 🎨 生成甘特图HTML
  generateGanttHTML(tasks, dependencies, timeline) {
    const startDate = Math.min(...Object.values(timeline).map(t => t.start));
    const endDate = Math.max(...Object.values(timeline).map(t => t.end));
    const totalHours = (endDate - startDate) / (1000 * 60 * 60);
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>🤖 AI智能甘特图 - 任务165计时器Bug修复</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            margin: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 { 
            text-align: center; 
            color: #2c3e50; 
            margin-bottom: 30px;
            font-size: 2.2em;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 30px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        .stat-item {
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }
        .stat-label {
            color: #7f8c8d;
            margin-top: 5px;
        }
        .gantt-container { 
            overflow-x: auto; 
            border: 1px solid #ddd; 
            border-radius: 8px;
            background: white;
        }
        .gantt-header {
            background: #34495e;
            color: white;
            padding: 15px;
            font-weight: bold;
            display: flex;
        }
        .task-name-col { width: 300px; }
        .timeline-col { flex: 1; min-width: 800px; }
        .gantt-row { 
            display: flex; 
            border-bottom: 1px solid #eee; 
            min-height: 50px;
            align-items: center;
        }
        .gantt-row:nth-child(even) { background: #f9f9f9; }
        .gantt-row:hover { background: #e3f2fd; }
        .task-name { 
            width: 300px; 
            padding: 10px; 
            font-weight: 500;
            display: flex;
            align-items: center;
        }
        .timeline { 
            flex: 1; 
            position: relative; 
            height: 40px; 
            margin: 5px;
        }
        .task-bar { 
            position: absolute; 
            height: 30px; 
            border-radius: 15px; 
            color: white; 
            font-size: 12px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: transform 0.2s;
        }
        .task-bar:hover {
            transform: scale(1.05);
        }
        .status-completed { background: linear-gradient(45deg, #27ae60, #2ecc71); }
        .status-todo { background: linear-gradient(45deg, #3498db, #5dade2); }
        .status-in_progress { background: linear-gradient(45deg, #f39c12, #f1c40f); }
        .priority-high { border-left: 5px solid #e74c3c; }
        .priority-medium { border-left: 5px solid #f39c12; }
        .priority-low { border-left: 5px solid #95a5a6; }
        .time-axis {
            display: flex;
            background: #ecf0f1;
            padding: 10px 0;
            border-top: 1px solid #bdc3c7;
        }
        .time-marker {
            flex: 1;
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
            border-left: 1px dashed #bdc3c7;
        }
        .legend {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .legend-color {
            width: 20px;
            height: 12px;
            border-radius: 6px;
        }
        .task-info {
            font-size: 11px;
            color: #666;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 AI智能甘特图：任务165计时器Bug修复进度</h1>
        
        <div class="stats">
            <div class="stat-item">
                <div class="stat-value">${tasks.length}</div>
                <div class="stat-label">子任务总数</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${tasks.filter(t => t.status === 'completed').length}</div>
                <div class="stat-label">已完成</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${Math.round(totalHours * 10) / 10}h</div>
                <div class="stat-label">预估总工时</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)}%</div>
                <div class="stat-label">完成进度</div>
            </div>
        </div>
        
        <div class="gantt-container">
            <div class="gantt-header">
                <div class="task-name-col">📋 任务名称</div>
                <div class="timeline-col">⏰ 时间线 (AI智能排程)</div>
            </div>
    `;
    
    // 按开始时间排序任务
    const sortedTasks = tasks.sort((a, b) => 
      timeline[a.id].start - timeline[b.id].start
    );
    
    sortedTasks.forEach(task => {
      const tl = timeline[task.id];
      const startPercent = ((tl.start - startDate) / (endDate - startDate)) * 100;
      const durationPercent = (tl.duration / totalHours) * 100;
      
      const statusIcon = task.status === 'completed' ? '✅' : 
                        task.status === 'in_progress' ? '🔄' : '📋';
      const priorityIcon = task.custom_fields?.priority === 'high' ? '🔥' : 
                          task.custom_fields?.priority === 'medium' ? '⚡' : '💡';
      
      const deps = dependencies[task.id] || [];
      const depInfo = deps.length > 0 ? `依赖: ${deps.join(',')}` : '无依赖';
      
      html += `
            <div class="gantt-row">
                <div class="task-name priority-${task.custom_fields?.priority || 'medium'}">
                    <span>${statusIcon} ${priorityIcon} ${task.title}</span>
                    <div class="task-info">${depInfo} | ${tl.duration}h</div>
                </div>
                <div class="timeline">
                    <div class="task-bar status-${task.status}" 
                         style="left: ${startPercent}%; width: ${durationPercent}%;"
                         title="开始: ${tl.start.toLocaleString()} | 结束: ${tl.end.toLocaleString()} | 工时: ${tl.duration}h">
                        ${tl.duration}h
                    </div>
                </div>
            </div>
      `;
    });
    
    // 时间轴
    html += `
            <div class="time-axis">
    `;
    
    for (let i = 0; i <= 10; i++) {
      const timePoint = new Date(startDate + (endDate - startDate) * i / 10);
      html += `<div class="time-marker">${timePoint.toLocaleDateString()} ${timePoint.toLocaleTimeString().slice(0,5)}</div>`;
    }
    
    html += `
            </div>
        </div>
        
        <div class="legend">
            <div class="legend-item">
                <div class="legend-color status-completed"></div>
                <span>✅ 已完成</span>
            </div>
            <div class="legend-item">
                <div class="legend-color status-in_progress"></div>
                <span>🔄 进行中</span>
            </div>
            <div class="legend-item">
                <div class="legend-color status-todo"></div>
                <span>📋 待办</span>
            </div>
            <div class="legend-item">
                <span>🔥 高优先级 | ⚡ 中优先级 | 💡 低优先级</span>
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #7f8c8d; font-size: 14px;">
            🤖 由Claude AI智能分析生成 | 基于任务复杂度、依赖关系、优先级的智能排程
        </div>
    </div>
</body>
</html>
    `;
    
    return html;
  }

  // 🚀 主要生成方法
  async generateGanttChart(parentTaskId = 165) {
    try {
      console.log(`🤖 AI甘特图生成器启动 - 分析任务${parentTaskId}...`);
      
      // 1. 获取所有任务
      const allTasksResult = await this.taskServer.listTasks(1);
      const allTasks = allTasksResult.tasks || [];
      
      // 2. 筛选子任务
      const childTasks = allTasks.filter(task => task.parent_id === parentTaskId);
      console.log(`📊 找到 ${childTasks.length} 个子任务`);
      
      if (childTasks.length === 0) {
        throw new Error(`任务${parentTaskId}没有子任务`);
      }
      
      // 3. AI智能分析
      console.log('🧠 AI智能工时估算中...');
      childTasks.forEach(task => {
        const estimatedHours = this.estimateWorkHours(task);
        console.log(`   任务${task.id}: ${estimatedHours}小时 (${task.title.substring(0, 30)}...)`);
      });
      
      console.log('🔗 AI智能依赖关系分析中...');
      const dependencies = this.analyzeDependencies(childTasks);
      console.log('   依赖关系:', JSON.stringify(dependencies, null, 2));
      
      console.log('⏰ AI智能时间排程中...');
      const timeline = this.calculateTimeline(childTasks, dependencies);
      
      // 4. 生成甘特图
      console.log('🎨 生成甘特图可视化...');
      const ganttHTML = this.generateGanttHTML(childTasks, dependencies, timeline);
      
      return {
        success: true,
        tasksCount: childTasks.length,
        totalHours: Object.values(timeline).reduce((sum, t) => sum + t.duration, 0),
        html: ganttHTML
      };
      
    } catch (error) {
      console.error('❌ 甘特图生成失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 🚀 执行生成
const generator = new IntelligentGanttGenerator();
generator.generateGanttChart(165).then(result => {
  if (result.success) {
    console.log('🎉 AI甘特图生成成功!');
    console.log(`📊 处理了 ${result.tasksCount} 个任务`);
    console.log(`⏰ 预估总工时: ${result.totalHours} 小时`);
    console.log('💾 正在保存HTML文件...');
    
    // 保存到文件
    import('fs').then(fs => {
      fs.writeFileSync('/Users/johnqiu/coding/www/projects/new-ai-proj/gantt-chart-task165.html', result.html);
      console.log('✅ 甘特图已保存到: gantt-chart-task165.html');
      console.log('🌐 请用浏览器打开查看漂亮的甘特图!');
    });
  } else {
    console.error('❌ 生成失败:', result.error);
  }
});