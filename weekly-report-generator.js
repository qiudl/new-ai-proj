#!/usr/bin/env node

/**
 * 智能周报生成器
 * 基于任务数据生成详细的项目周报
 */

import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';
import fs from 'fs/promises';
import path from 'path';

class WeeklyReportGenerator {
  constructor() {
    this.taskServer = new TaskMCPServer();
  }

  /**
   * 生成指定周期的周报
   */
  async generateWeeklyReport(startDate, endDate) {
    console.log(`📊 生成周报: ${startDate} - ${endDate}`);
    
    try {
      // 收集数据
      const data = await this.collectWeeklyData(startDate, endDate);
      
      // 生成报告
      const report = {
        executiveSummary: this.generateExecutiveSummary(data),
        detailedAnalysis: this.generateDetailedAnalysis(data),
        insights: this.generateInsights(data),
        recommendations: this.generateRecommendations(data)
      };
      
      // 输出报告
      return this.formatReport(report, startDate, endDate);
      
    } catch (error) {
      console.error('❌ 生成周报失败:', error.message);
      throw error;
    }
  }

  /**
   * 收集周报数据
   */
  async collectWeeklyData(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 获取所有任务
    const result = await this.taskServer.listTasks(1);
    if (!result.success) {
      throw new Error('获取任务列表失败: ' + result.error);
    }
    const allTasks = result.tasks;
    
    // 过滤出本周相关的任务
    const weeklyTasks = {
      completed: [],
      started: [],
      updated: [],
      blocked: []
    };
    
    const metrics = {
      totalTasks: allTasks.length,
      completedThisWeek: 0,
      startedThisWeek: 0,
      updatedThisWeek: 0,
      blockedTasks: 0
    };
    
    const tagDistribution = {};
    const complexityDistribution = { simple: 0, medium: 0, complex: 0 };
    const technicalDistribution = {};
    const businessDistribution = {};
    
    // 分析每个任务
    for (const task of allTasks) {
      const createdAt = new Date(task.created_at);
      const updatedAt = new Date(task.updated_at);
      
      // 任务分类
      if (task.status === 'completed' && updatedAt >= start && updatedAt <= end) {
        weeklyTasks.completed.push(task);
        metrics.completedThisWeek++;
      }
      
      if (createdAt >= start && createdAt <= end) {
        weeklyTasks.started.push(task);
        metrics.startedThisWeek++;
      }
      
      if (updatedAt >= start && updatedAt <= end && task.status !== 'completed') {
        weeklyTasks.updated.push(task);
        metrics.updatedThisWeek++;
      }
      
      if (task.status === 'blocked' || this.isTaskBlocked(task)) {
        weeklyTasks.blocked.push(task);
        metrics.blockedTasks++;
      }
      
      // 标签统计
      const tags = task.custom_fields?.tags || [];
      for (const tag of tags) {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
        
        // 分类统计
        this.categorizeTag(tag, technicalDistribution, businessDistribution);
      }
      
      // 复杂度统计
      const complexity = this.getTaskComplexity(task);
      complexityDistribution[complexity]++;
    }
    
    return {
      period: { start: startDate, end: endDate },
      tasks: weeklyTasks,
      metrics,
      distributions: {
        tags: tagDistribution,
        complexity: complexityDistribution,
        technical: technicalDistribution,
        business: businessDistribution
      },
      allTasks
    };
  }

  /**
   * 生成执行摘要
   */
  generateExecutiveSummary(data) {
    const { metrics, tasks, distributions } = data;
    
    // 计算关键指标
    const completionRate = ((metrics.completedThisWeek / metrics.totalTasks) * 100).toFixed(1);
    const velocity = metrics.completedThisWeek;
    const blockageRate = ((metrics.blockedTasks / metrics.totalTasks) * 100).toFixed(1);
    
    // 技术栈分析
    const topTechnicalAreas = Object.entries(distributions.technical)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([area, count]) => ({ area, count, percentage: ((count / metrics.totalTasks) * 100).toFixed(1) }));
    
    // 重要成就
    const majorAchievements = tasks.completed
      .filter(task => this.isHighImpactTask(task))
      .map(task => ({
        title: task.title,
        impact: this.getTaskImpact(task),
        complexity: this.getTaskComplexity(task)
      }));
    
    // 风险识别
    const risks = this.identifyRisks(data);
    
    return {
      keyMetrics: {
        completedTasks: metrics.completedThisWeek,
        completionRate: parseFloat(completionRate),
        newTasks: metrics.startedThisWeek,
        velocity,
        blockageRate: parseFloat(blockageRate)
      },
      technicalDistribution: topTechnicalAreas,
      majorAchievements,
      risks,
      trend: this.analyzeTrends(data)
    };
  }

  /**
   * 生成详细分析
   */
  generateDetailedAnalysis(data) {
    const { tasks, distributions } = data;
    
    return {
      taskBreakdown: {
        completed: this.analyzeTaskGroup(tasks.completed, '已完成任务'),
        started: this.analyzeTaskGroup(tasks.started, '新开始任务'),
        updated: this.analyzeTaskGroup(tasks.updated, '更新任务'),
        blocked: this.analyzeTaskGroup(tasks.blocked, '阻塞任务')
      },
      distributionAnalysis: {
        complexity: this.analyzeComplexityDistribution(distributions.complexity),
        technical: this.analyzeTechnicalDistribution(distributions.technical),
        business: this.analyzeBusinessDistribution(distributions.business)
      },
      qualityMetrics: this.calculateQualityMetrics(data),
      efficiencyMetrics: this.calculateEfficiencyMetrics(data)
    };
  }

  /**
   * 生成智能洞察
   */
  generateInsights(data) {
    const insights = [];
    
    // 生产力洞察
    if (data.metrics.completedThisWeek > 15) {
      insights.push({
        type: 'productivity',
        level: 'positive',
        message: '团队生产力表现出色，本周完成任务数量超出平均水平',
        details: `完成了 ${data.metrics.completedThisWeek} 个任务，建议继续保持当前节奏`
      });
    }
    
    // 技术债务洞察
    const technicalDebtTasks = data.allTasks.filter(task => 
      task.custom_fields?.tags?.includes('technical-debt'));
    if (technicalDebtTasks.length > 10) {
      insights.push({
        type: 'technical-debt',
        level: 'warning',
        message: '技术债务任务数量较多，需要关注',
        details: `当前有 ${technicalDebtTasks.length} 个技术债务任务，建议制定清理计划`
      });
    }
    
    // 阻塞分析洞察
    if (data.metrics.blockedTasks > 5) {
      insights.push({
        type: 'blockage',
        level: 'critical',
        message: '存在较多阻塞任务，可能影响项目进度',
        details: `${data.metrics.blockedTasks} 个任务被阻塞，需要优先解决依赖问题`
      });
    }
    
    // 复杂度分析洞察
    const complexTasks = data.distributions.complexity.complex;
    const totalTasks = Object.values(data.distributions.complexity).reduce((a, b) => a + b, 0);
    if (complexTasks / totalTasks > 0.3) {
      insights.push({
        type: 'complexity',
        level: 'info',
        message: '项目复杂度较高，建议加强技术规划',
        details: `${((complexTasks / totalTasks) * 100).toFixed(1)}% 的任务为高复杂度任务`
      });
    }
    
    return insights;
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(data) {
    const recommendations = [];
    
    // 基于阻塞任务的建议
    if (data.metrics.blockedTasks > 3) {
      recommendations.push({
        category: 'process',
        priority: 'high',
        title: '优化依赖管理流程',
        description: '建立更好的任务依赖识别和解决机制',
        actions: [
          '每日站会时专门讨论阻塞问题',
          '建立依赖任务优先级机制',
          '指定专人负责跨团队协调'
        ]
      });
    }
    
    // 基于技术分布的建议
    const frontendTasks = data.distributions.technical.frontend || 0;
    const backendTasks = data.distributions.technical.backend || 0;
    if (frontendTasks > backendTasks * 2) {
      recommendations.push({
        category: 'resource',
        priority: 'medium',
        title: '平衡前后端开发资源',
        description: '前端任务明显多于后端，考虑调整资源分配',
        actions: [
          '评估前端团队工作负载',
          '考虑将部分后端开发人员支持前端工作',
          '优化前端开发流程和工具'
        ]
      });
    }
    
    // 基于质量指标的建议
    const bugfixTasks = data.allTasks.filter(task => 
      task.custom_fields?.tags?.includes('bugfix')).length;
    if (bugfixTasks > data.metrics.totalTasks * 0.15) {
      recommendations.push({
        category: 'quality',
        priority: 'high',
        title: '加强代码质量控制',
        description: 'Bug修复任务比例较高，需要改进质量保证流程',
        actions: [
          '增加代码评审覆盖率',
          '完善自动化测试',
          '建立更严格的发布流程',
          '定期进行技术债务清理'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * 格式化报告输出
   */
  formatReport(report, startDate, endDate) {
    const { executiveSummary, detailedAnalysis, insights, recommendations } = report;
    
    let output = '';
    
    // 标题
    output += `# 📊 项目周报 (${startDate} - ${endDate})\\n\\n`;
    
    // 执行摘要
    output += `## 🎯 执行摘要\\n\\n`;
    output += `### 关键指标\\n`;
    output += `- **完成任务**: ${executiveSummary.keyMetrics.completedTasks} 个\\n`;
    output += `- **完成率**: ${executiveSummary.keyMetrics.completionRate}%\\n`;
    output += `- **新增任务**: ${executiveSummary.keyMetrics.newTasks} 个\\n`;
    output += `- **团队速度**: ${executiveSummary.keyMetrics.velocity} tasks/week\\n`;
    output += `- **阻塞率**: ${executiveSummary.keyMetrics.blockageRate}%\\n\\n`;
    
    // 技术栈分布
    output += `### 🔧 技术栈分布\\n`;
    executiveSummary.technicalDistribution.forEach(tech => {
      output += `- **${tech.area}**: ${tech.count} 个任务 (${tech.percentage}%)\\n`;
    });
    output += '\\n';
    
    // 重要成就
    if (executiveSummary.majorAchievements.length > 0) {
      output += `### 🏆 重要成就\\n`;
      executiveSummary.majorAchievements.forEach(achievement => {
        output += `- **${achievement.title}** - ${achievement.impact} (复杂度: ${achievement.complexity})\\n`;
      });
      output += '\\n';
    }
    
    // 风险和阻塞
    if (executiveSummary.risks.length > 0) {
      output += `### ⚠️ 风险和阻塞\\n`;
      executiveSummary.risks.forEach(risk => {
        output += `- **${risk.type}**: ${risk.description}\\n`;
      });
      output += '\\n';
    }
    
    // 智能洞察
    if (insights.length > 0) {
      output += `## 🧠 智能洞察\\n\\n`;
      insights.forEach(insight => {
        const emoji = insight.level === 'positive' ? '✅' : 
                     insight.level === 'warning' ? '⚠️' : 
                     insight.level === 'critical' ? '🚨' : 'ℹ️';
        output += `### ${emoji} ${insight.message}\\n`;
        output += `${insight.details}\\n\\n`;
      });
    }
    
    // 改进建议
    if (recommendations.length > 0) {
      output += `## 💡 改进建议\\n\\n`;
      recommendations.forEach(rec => {
        const priorityEmoji = rec.priority === 'high' ? '🔴' : 
                             rec.priority === 'medium' ? '🟡' : '🟢';
        output += `### ${priorityEmoji} ${rec.title}\\n`;
        output += `**类别**: ${rec.category} | **优先级**: ${rec.priority}\\n\\n`;
        output += `${rec.description}\\n\\n`;
        output += `**行动计划**:\\n`;
        rec.actions.forEach(action => {
          output += `- ${action}\\n`;
        });
        output += '\\n';
      });
    }
    
    // 详细分析
    output += `## 📈 详细分析\\n\\n`;
    
    // 任务分解
    output += `### 任务完成情况\\n`;
    Object.entries(detailedAnalysis.taskBreakdown).forEach(([category, analysis]) => {
      output += `\\n#### ${analysis.title}\\n`;
      output += `**数量**: ${analysis.count} 个\\n`;
      if (analysis.tasks.length > 0) {
        output += `**详情**:\\n`;
        analysis.tasks.slice(0, 5).forEach(task => {
          const tags = task.tags ? ` (${task.tags.slice(0, 3).join(', ')})` : '';
          output += `- ${task.title}${tags}\\n`;
        });
        if (analysis.tasks.length > 5) {
          output += `- ... 以及其他 ${analysis.tasks.length - 5} 个任务\\n`;
        }
      }
    });
    
    // 质量指标
    output += `\\n### 📊 质量指标\\n`;
    output += `- **技术债务任务**: ${detailedAnalysis.qualityMetrics.technicalDebt} 个\\n`;
    output += `- **Bug修复任务**: ${detailedAnalysis.qualityMetrics.bugFixes} 个\\n`;
    output += `- **测试相关任务**: ${detailedAnalysis.qualityMetrics.testingTasks} 个\\n`;
    
    // 生成时间戳
    output += `\\n---\\n*报告生成时间: ${new Date().toLocaleString('zh-CN')}*\\n`;
    
    return output;
  }

  // 辅助方法
  isTaskBlocked(task) {
    const blockedKeywords = ['阻塞', '等待', '依赖', '暂停'];
    const text = (task.title + ' ' + (task.description || '')).toLowerCase();
    return blockedKeywords.some(keyword => text.includes(keyword));
  }

  getTaskComplexity(task) {
    const tags = task.custom_fields?.tags || [];
    if (tags.includes('complex') || tags.includes('architectural')) return 'complex';
    if (tags.includes('simple')) return 'simple';
    return 'medium';
  }

  isHighImpactTask(task) {
    const highImpactTags = ['critical', 'high-priority', 'core', 'foundation'];
    const tags = task.custom_fields?.tags || [];
    return highImpactTags.some(tag => tags.includes(tag));
  }

  getTaskImpact(task) {
    const tags = task.custom_fields?.tags || [];
    if (tags.includes('critical')) return '关键影响';
    if (tags.includes('high-priority')) return '高影响';
    return '中等影响';
  }

  categorizeTag(tag, technicalDist, businessDist) {
    const technicalTags = ['frontend', 'backend', 'database', 'api', 'ui-ux', 'infrastructure'];
    const businessTags = ['task-management', 'user-management', 'document-management', 'time-tracking'];
    
    if (technicalTags.includes(tag)) {
      technicalDist[tag] = (technicalDist[tag] || 0) + 1;
    }
    if (businessTags.includes(tag)) {
      businessDist[tag] = (businessDist[tag] || 0) + 1;
    }
  }

  identifyRisks(data) {
    const risks = [];
    
    if (data.metrics.blockedTasks > 5) {
      risks.push({
        type: '阻塞风险',
        description: `${data.metrics.blockedTasks} 个任务被阻塞，可能影响交付进度`
      });
    }
    
    const technicalDebtCount = data.allTasks.filter(task => 
      task.custom_fields?.tags?.includes('technical-debt')).length;
    if (technicalDebtCount > 10) {
      risks.push({
        type: '技术债务',
        description: `${technicalDebtCount} 个技术债务任务，需要制定清理计划`
      });
    }
    
    return risks;
  }

  analyzeTrends(data) {
    // 这里可以添加更复杂的趋势分析逻辑
    return {
      velocity: data.metrics.completedThisWeek > 10 ? '上升' : '稳定',
      quality: data.allTasks.filter(t => t.custom_fields?.tags?.includes('bugfix')).length < 5 ? '良好' : '需关注',
      complexity: data.distributions.complexity.complex > 15 ? '增加' : '稳定'
    };
  }

  analyzeTaskGroup(tasks, title) {
    return {
      title,
      count: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        tags: task.custom_fields?.tags || [],
        complexity: this.getTaskComplexity(task)
      }))
    };
  }

  analyzeComplexityDistribution(dist) {
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    return {
      simple: { count: dist.simple, percentage: ((dist.simple / total) * 100).toFixed(1) },
      medium: { count: dist.medium, percentage: ((dist.medium / total) * 100).toFixed(1) },
      complex: { count: dist.complex, percentage: ((dist.complex / total) * 100).toFixed(1) }
    };
  }

  analyzeTechnicalDistribution(dist) {
    return Object.entries(dist)
      .map(([tech, count]) => ({ technology: tech, count }))
      .sort((a, b) => b.count - a.count);
  }

  analyzeBusinessDistribution(dist) {
    return Object.entries(dist)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);
  }

  calculateQualityMetrics(data) {
    return {
      technicalDebt: data.allTasks.filter(t => t.custom_fields?.tags?.includes('technical-debt')).length,
      bugFixes: data.allTasks.filter(t => t.custom_fields?.tags?.includes('bugfix')).length,
      testingTasks: data.allTasks.filter(t => t.custom_fields?.tags?.includes('testing')).length
    };
  }

  calculateEfficiencyMetrics(data) {
    const avgComplexity = Object.entries(data.distributions.complexity)
      .reduce((acc, [level, count]) => {
        const weight = level === 'simple' ? 1 : level === 'medium' ? 2 : 3;
        return acc + (weight * count);
      }, 0) / data.metrics.totalTasks;
    
    return {
      averageComplexity: avgComplexity.toFixed(2),
      velocityScore: data.metrics.completedThisWeek,
      blockageRate: ((data.metrics.blockedTasks / data.metrics.totalTasks) * 100).toFixed(1)
    };
  }

  /**
   * 保存报告到文件
   */
  async saveReport(content, startDate, endDate) {
    const fileName = `weekly-report-${startDate}-to-${endDate}.md`;
    const filePath = path.join(process.cwd(), 'reports', fileName);
    
    // 确保reports目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`📄 报告已保存到: ${filePath}`);
    
    return filePath;
  }
}

// 命令行接口
async function main() {
  const generator = new WeeklyReportGenerator();
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('📊 智能周报生成器');
    console.log('\\n使用方法:');
    console.log('  node weekly-report-generator.js <开始日期> <结束日期>');
    console.log('\\n示例:');
    console.log('  node weekly-report-generator.js 2024-01-01 2024-01-07');
    return;
  }
  
  const [startDate, endDate] = args;
  
  try {
    console.log('🚀 开始生成周报...');
    
    const reportContent = await generator.generateWeeklyReport(startDate, endDate);
    
    // 输出到控制台
    console.log('\\n' + '='.repeat(80));
    console.log(reportContent);
    console.log('='.repeat(80));
    
    // 保存到文件
    await generator.saveReport(reportContent, startDate, endDate);
    
    console.log('\\n✅ 周报生成完成!');
    
  } catch (error) {
    console.error('❌ 生成周报失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WeeklyReportGenerator };