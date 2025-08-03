#!/usr/bin/env node

/**
 * 任务标签批量更新脚本
 * 基于任务内容智能生成和更新标签
 */

import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

class TaskTagger {
  constructor() {
    this.taskServer = new TaskMCPServer();
    
    // 标签映射规则
    this.tagRules = {
      // 技术栈标签
      technical: {
        'frontend': ['前端', 'React', 'UI', '界面', '组件', 'TypeScript', '样式'],
        'backend': ['后端', 'API', '接口', 'Go', '服务', 'handler', 'service'],
        'database': ['数据库', 'SQL', 'PostgreSQL', '表', '字段', 'migration'],
        'api': ['API', '接口', 'endpoint', 'handler', 'controller'],
        'ui-ux': ['UI', 'UX', '界面', '交互', '体验', '设计', '布局'],
        'infrastructure': ['Docker', '部署', 'CI/CD', '基础设施', '环境'],
        'ai-intelligence': ['AI', '智能', '算法', '分析', '自动', '机器学习'],
        'integration': ['集成', '对接', '连接', '桥接', 'MCP'],
        'timer-system': ['计时', '时间', 'timer', '统计', '报表']
      },
      
      // 任务类型标签
      type: {
        'feature': ['功能', '实现', '开发', '新增', '添加', '创建'],
        'bugfix': ['修复', 'bug', '错误', '问题', '异常', '故障'],
        'optimization': ['优化', '性能', '改进', '提升', '效率'],
        'testing': ['测试', '验证', '检查', 'test', 'QA'],
        'refactor': ['重构', '重写', '清理', '整理', '规范'],
        'enhancement': ['增强', '完善', '改善', '扩展'],
        'documentation': ['文档', '说明', '指南', '教程'],
        'maintenance': ['维护', '清理', '更新', '升级']
      },
      
      // 复杂度标签
      complexity: {
        'simple': ['简单', '小', '修改', '调整', '配置', '样式'],
        'medium': ['功能', '模块', '组件', '接口', '集成'],
        'complex': ['系统', '架构', '重构', '算法', '复杂', '核心'],
        'architectural': ['架构', '设计', '框架', '重大', '核心系统']
      },
      
      // 业务域标签
      business: {
        'task-management': ['任务', '项目', 'task', 'project', '管理'],
        'user-interface': ['界面', 'UI', '前端', '页面', '组件', '交互'],
        'document-management': ['文档', 'document', '文件', '内容'],
        'time-tracking': ['计时', '时间', 'timer', '统计', '报表'],
        'system-integration': ['集成', '接口', 'API', 'MCP', '对接'],
        'user-management': ['用户', '权限', '认证', '登录'],
        'reporting': ['报表', '统计', '分析', '图表', 'dashboard'],
        'dashboard': ['仪表板', 'dashboard', '概览', '总览']
      },
      
      // 优先级/状态标签
      priority: {
        'urgent': ['紧急', '急', '立即', '马上'],
        'high-priority': ['重要', '高优先级', '关键', '核心'],
        'critical': ['关键', '核心', '重大', '严重'],
        'blocked': ['阻塞', '等待', '依赖', '暂停'],
        'technical-debt': ['技术债', '遗留', '临时', 'hack']
      },
      
      // 阶段标签
      phase: {
        'mvp': ['MVP', '最小', '基础版本'],
        'phase-1': ['Phase 1', '第一阶段', '阶段1'],
        'phase-2': ['Phase 2', '第二阶段', '阶段2'],
        'foundation': ['基础', '基本', '核心功能'],
        'enhancement': ['增强', '完善', '优化'],
        'polish': ['细节', '完善', '美化', '抛光']
      }
    };
  }

  /**
   * 分析任务并生成标签
   */
  analyzeTask(task) {
    const text = `${task.title} ${task.description || ''}`.toLowerCase();
    const tags = new Set();
    
    // 应用所有规则
    for (const [category, rules] of Object.entries(this.tagRules)) {
      for (const [tag, keywords] of Object.entries(rules)) {
        if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
          tags.add(tag);
        }
      }
    }
    
    // 特殊规则处理
    this.applySpecialRules(task, tags, text);
    
    return Array.from(tags);
  }

  /**
   * 应用特殊标签规则
   */
  applySpecialRules(task, tags, text) {
    // 根据任务状态添加标签
    if (task.status === 'in_progress') {
      tags.add('in-progress');
    } else if (task.status === 'completed') {
      tags.add('completed');
    }
    
    // 根据优先级添加标签
    if (task.custom_fields?.priority === 'high') {
      tags.add('high-priority');
    }
    
    // 根据任务层级添加标签
    if (task.parent_id) {
      tags.add('subtask');
    } else {
      tags.add('parent-task');
    }
    
    // 根据创建时间添加标签
    const createDate = new Date(task.created_at);
    const now = new Date();
    const daysOld = (now - createDate) / (1000 * 60 * 60 * 24);
    
    if (daysOld > 30) {
      tags.add('old-task');
    } else if (daysOld < 7) {
      tags.add('recent');
    }
  }

  /**
   * 批量更新所有任务的标签
   */
  async tagAllTasks() {
    console.log('🏷️ 开始批量标签更新...');
    
    try {
      // 获取所有任务
      const result = await this.taskServer.listTasks(1);
      if (!result.success) {
        throw new Error('获取任务列表失败: ' + result.error);
      }
      const tasks = result.tasks;
      console.log(`📋 找到 ${tasks.length} 个任务`);
      
      let updated = 0;
      let errors = 0;
      
      for (const task of tasks) {
        try {
          // 分析并生成标签
          const suggestedTags = this.analyzeTask(task);
          
          // 合并现有标签
          const existingTags = task.custom_fields?.tags || [];
          const allTags = [...new Set([...existingTags, ...suggestedTags])];
          
          // 更新任务
          if (allTags.length > existingTags.length) {
            const updateData = {
              custom_fields: {
                ...task.custom_fields,
                tags: allTags
              }
            };
            
            await this.taskServer.updateTask(task.id, updateData);
            console.log(`✅ 更新任务 ${task.id}: "${task.title}" - 添加标签: ${suggestedTags.join(', ')}`);
            updated++;
          } else {
            console.log(`⏭️ 跳过任务 ${task.id}: "${task.title}" - 无新标签`);
          }
          
          // 延迟以避免API限制
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ 更新任务 ${task.id} 失败:`, error.message);
          errors++;
        }
      }
      
      console.log('\\n📊 批量更新完成!');
      console.log(`✅ 成功更新: ${updated} 个任务`);
      console.log(`❌ 失败: ${errors} 个任务`);
      
    } catch (error) {
      console.error('❌ 批量更新失败:', error.message);
    }
  }

  /**
   * 分析单个任务并显示建议标签
   */
  async analyzeTaskById(taskId) {
    try {
      const task = await this.taskServer.findTaskById(taskId);
      
      console.log(`\\n📋 任务分析: ${task.title}`);
      console.log(`📝 描述: ${task.description?.substring(0, 100) || '无描述'}...`);
      console.log(`📊 状态: ${task.status}`);
      
      const suggestedTags = this.analyzeTask(task);
      const existingTags = task.custom_fields?.tags || [];
      
      console.log(`\\n🏷️ 现有标签: [${existingTags.join(', ')}]`);
      console.log(`💡 建议标签: [${suggestedTags.join(', ')}]`);
      
      const newTags = suggestedTags.filter(tag => !existingTags.includes(tag));
      if (newTags.length > 0) {
        console.log(`🆕 新增标签: [${newTags.join(', ')}]`);
      }
      
    } catch (error) {
      console.error('❌ 任务分析失败:', error.message);
    }
  }

  /**
   * 生成标签统计报告
   */
  async generateTagReport() {
    try {
      const result = await this.taskServer.listTasks(1);
      if (!result.success) {
        throw new Error('获取任务列表失败: ' + result.error);
      }
      const tasks = result.tasks;
      const tagStats = {};
      const categoryStats = {};
      
      // 统计标签使用情况
      for (const task of tasks) {
        const tags = task.custom_fields?.tags || [];
        
        for (const tag of tags) {
          tagStats[tag] = (tagStats[tag] || 0) + 1;
          
          // 分类统计
          const category = this.getTagCategory(tag);
          if (!categoryStats[category]) {
            categoryStats[category] = {};
          }
          categoryStats[category][tag] = (categoryStats[category][tag] || 0) + 1;
        }
      }
      
      console.log('\\n📊 标签使用统计报告');
      console.log('=' .repeat(50));
      
      // 按分类显示
      for (const [category, tags] of Object.entries(categoryStats)) {
        console.log(`\\n📂 ${category.toUpperCase()}`);
        const sortedTags = Object.entries(tags)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10); // 显示前10个
          
        for (const [tag, count] of sortedTags) {
          console.log(`  ${tag}: ${count} 个任务`);
        }
      }
      
      // 显示最常用的标签
      console.log('\\n🏆 最常用标签 (TOP 20)');
      console.log('-'.repeat(30));
      Object.entries(tagStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .forEach(([tag, count]) => {
          console.log(`${tag}: ${count} 个任务`);
        });
        
    } catch (error) {
      console.error('❌ 生成报告失败:', error.message);
    }
  }

  /**
   * 获取标签所属分类
   */
  getTagCategory(tag) {
    for (const [category, rules] of Object.entries(this.tagRules)) {
      if (Object.keys(rules).includes(tag)) {
        return category;
      }
    }
    return 'other';
  }
}

// 命令行接口
async function main() {
  const tagger = new TaskTagger();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 任务标签管理工具');
    console.log('\\n使用方法:');
    console.log('  node task-tagging-script.js all           # 批量更新所有任务标签');
    console.log('  node task-tagging-script.js analyze <id>  # 分析指定任务');
    console.log('  node task-tagging-script.js report        # 生成标签统计报告');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'all':
      await tagger.tagAllTasks();
      break;
      
    case 'analyze':
      const taskId = parseInt(args[1]);
      if (!taskId) {
        console.error('❌ 请提供有效的任务ID');
        return;
      }
      await tagger.analyzeTaskById(taskId);
      break;
      
    case 'report':
      await tagger.generateTagReport();
      break;
      
    default:
      console.error('❌ 未知命令:', command);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TaskTagger };