/**
 * 历史数据迁移工具 - HistoricalDataMigrator
 * 实现对所有已完成但无文档任务的批量扫描、智能筛选和批量文档创建
 * 
 * @author Claude AI
 * @version 1.0.0
 * @created 2025-08-03
 */

import { TaskContentAnalyzer } from './TaskContentAnalyzer.js';
import { AutoDocumentService } from './AutoDocumentService.js';

export class HistoricalDataMigrator {
  constructor(taskMCPServer, config = {}) {
    this.taskMCPServer = taskMCPServer;
    this.contentAnalyzer = new TaskContentAnalyzer(config.analyzer || {});
    this.autoDocService = new AutoDocumentService(taskMCPServer, config.autoDoc || {});
    
    // 配置参数
    this.config = {
      batchSize: config.batchSize || 10,
      concurrentLimit: config.concurrentLimit || 3,
      minLength: config.minLength || 200,
      minScore: config.minScore || 0.5,
      statusFilter: config.statusFilter || ['completed', 'cancelled'],
      projectFilter: config.projectFilter || null, // null表示所有项目
      dryRun: config.dryRun || false,
      backupEnabled: config.backupEnabled !== false,
      ...config
    };

    // 进度跟踪器
    this.progressTracker = new MigrationProgressTracker();
    
    // 报告生成器
    this.reportGenerator = new MigrationReportGenerator();
  }

  /**
   * 扫描并筛选需要迁移的任务
   * @param {Object} options - 扫描选项
   * @returns {Promise<Object>} 扫描结果
   */
  async scanAndFilterTasks(options = {}) {
    this.progressTracker.start('scanning');
    
    try {
      console.log('🔍 开始扫描历史任务...');
      
      // 1. 获取所有项目
      const projects = await this.getTargetProjects(options.projectIds);
      console.log(`📁 找到${projects.length}个项目需要扫描`);

      // 2. 扫描所有任务
      const allTasks = [];
      for (const project of projects) {
        this.progressTracker.updateStatus(`扫描项目${project.id}: ${project.name}`);
        
        const projectTasks = await this.getProjectTasks(project.id);
        allTasks.push(...projectTasks.map(task => ({ ...task, projectName: project.name })));
        
        console.log(`  📋 项目${project.id}找到${projectTasks.length}个任务`);
      }

      console.log(`📊 总共扫描到${allTasks.length}个任务`);

      // 3. 获取无文档的已完成任务
      this.progressTracker.updateStatus('筛选无文档的已完成任务');
      const tasksWithoutDocs = await this.getCompletedTasksWithoutDocuments(allTasks);
      
      console.log(`📝 找到${tasksWithoutDocs.length}个无文档的已完成任务`);

      // 4. 智能筛选
      this.progressTracker.updateStatus('执行智能筛选');
      const filteredTasks = await this.intelligentFilter(tasksWithoutDocs);
      
      console.log(`✅ 智能筛选后剩余${filteredTasks.qualified.length}个适合迁移的任务`);

      // 5. 优先级排序
      this.progressTracker.updateStatus('计算优先级排序');
      const prioritizedTasks = await this.prioritizeTasks(filteredTasks.qualified);

      this.progressTracker.complete('scanning', {
        totalScanned: allTasks.length,
        withoutDocs: tasksWithoutDocs.length,
        qualified: filteredTasks.qualified.length,
        rejected: filteredTasks.rejected.length
      });

      return {
        success: true,
        summary: {
          totalTasks: allTasks.length,
          tasksWithoutDocs: tasksWithoutDocs.length,
          qualifiedTasks: filteredTasks.qualified.length,
          rejectedTasks: filteredTasks.rejected.length,
          projects: projects.length
        },
        tasks: {
          all: allTasks,
          withoutDocs: tasksWithoutDocs,
          qualified: prioritizedTasks,
          rejected: filteredTasks.rejected
        },
        projects: projects
      };

    } catch (error) {
      this.progressTracker.error('scanning', error);
      throw error;
    }
  }

  /**
   * 获取目标项目列表
   * @param {Array} projectIds - 项目ID列表
   * @returns {Promise<Array>} 项目列表
   */
  async getTargetProjects(projectIds = null) {
    if (projectIds && projectIds.length > 0) {
      // 获取指定项目
      const projects = [];
      for (const id of projectIds) {
        try {
          const projectTasks = await this.taskMCPServer.listTasks(id);
          if (projectTasks.success) {
            projects.push({ id, name: `项目${id}` });
          }
        } catch (error) {
          console.warn(`⚠️ 项目${id}访问失败:`, error.message);
        }
      }
      return projects;
    } else {
      // 获取所有可访问的项目 (简化版本，使用已知项目)
      return [
        { id: 1, name: 'AI项目管理平台' }
      ];
    }
  }

  /**
   * 获取项目的所有任务
   * @param {number} projectId - 项目ID
   * @returns {Promise<Array>} 任务列表
   */
  async getProjectTasks(projectId) {
    try {
      const result = await this.taskMCPServer.listTasks(projectId);
      if (result.success) {
        return result.tasks || [];
      } else {
        console.warn(`⚠️ 获取项目${projectId}任务失败:`, result.error);
        return [];
      }
    } catch (error) {
      console.warn(`⚠️ 项目${projectId}任务获取异常:`, error.message);
      return [];
    }
  }

  /**
   * 获取无文档的已完成任务
   * @param {Array} allTasks - 所有任务
   * @returns {Promise<Array>} 无文档的已完成任务
   */
  async getCompletedTasksWithoutDocuments(allTasks) {
    const tasksWithoutDocs = [];
    
    // 筛选已完成的任务
    const completedTasks = allTasks.filter(task => 
      this.config.statusFilter.includes(task.status)
    );

    console.log(`🔍 在${completedTasks.length}个已完成任务中检查文档状态...`);

    // 批量检查文档状态
    const batchSize = 10;
    for (let i = 0; i < completedTasks.length; i += batchSize) {
      const batch = completedTasks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (task) => {
        try {
          const hasDoc = await this.taskMCPServer.hasTaskDocument(task.id);
          return { task, hasDoc };
        } catch (error) {
          // 如果检查失败，假设没有文档
          return { task, hasDoc: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const batchWithoutDocs = batchResults
        .filter(result => !result.hasDoc)
        .map(result => result.task);
        
      tasksWithoutDocs.push(...batchWithoutDocs);
      
      // 进度更新
      const progress = Math.round(((i + batch.length) / completedTasks.length) * 100);
      this.progressTracker.updateProgress(progress);
    }

    return tasksWithoutDocs;
  }

  /**
   * 智能筛选算法
   * @param {Array} tasks - 任务列表
   * @returns {Promise<Object>} 筛选结果
   */
  async intelligentFilter(tasks) {
    const qualified = [];
    const rejected = [];

    console.log(`🧠 开始智能筛选${tasks.length}个任务...`);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      // 进度更新
      if (i % 10 === 0) {
        const progress = Math.round((i / tasks.length) * 100);
        this.progressTracker.updateProgress(progress);
        this.progressTracker.updateStatus(`智能筛选进度: ${i}/${tasks.length}`);
      }

      const evaluation = await this.evaluateTaskForMigration(task);
      
      if (evaluation.shouldMigrate) {
        qualified.push({
          ...task,
          migrationScore: evaluation.score,
          migrationReason: evaluation.reason,
          recommendations: evaluation.recommendations
        });
      } else {
        rejected.push({
          ...task,
          rejectionReason: evaluation.reason,
          rejectionScore: evaluation.score
        });
      }
    }

    console.log(`✅ 智能筛选完成: 合格${qualified.length}个, 拒绝${rejected.length}个`);

    return { qualified, rejected };
  }

  /**
   * 单任务迁移价值评估
   * @param {Object} task - 任务对象
   * @returns {Promise<Object>} 评估结果
   */
  async evaluateTaskForMigration(task) {
    // 基础检查
    if (!task.description || task.description.trim().length === 0) {
      return {
        shouldMigrate: false,
        score: 0,
        reason: '任务描述为空',
        recommendations: ['添加任务描述内容']
      };
    }

    // 长度检查
    if (task.description.length < this.config.minLength) {
      return {
        shouldMigrate: false,
        score: 0.1,
        reason: `内容过短(${task.description.length}字符, 最少需要${this.config.minLength}字符)`,
        recommendations: ['增加任务描述的详细程度']
      };
    }

    // 智能内容分析
    const analysis = this.contentAnalyzer.analyzeSummaryContent(task.description);
    
    // 评分检查
    if (analysis.score < this.config.minScore) {
      return {
        shouldMigrate: false,
        score: analysis.score,
        reason: `内容质量评分过低(${analysis.score}, 最少需要${this.config.minScore})`,
        recommendations: analysis.recommendations
      };
    }

    // 特殊情况排除
    const excludePatterns = [
      /^测试/, /^test/i, /^demo/i, /^临时/, /^temp/i,
      /删除$/, /^删除/, /清理$/, /^清理/
    ];
    
    const shouldExclude = excludePatterns.some(pattern => 
      pattern.test(task.title || '') || pattern.test(task.description)
    );

    if (shouldExclude) {
      return {
        shouldMigrate: false,
        score: analysis.score,
        reason: '任务标题或内容表明这是测试、临时或清理任务',
        recommendations: ['确认任务是否有保留价值']
      };
    }

    // 通过所有检查
    return {
      shouldMigrate: true,
      score: analysis.score,
      reason: '任务符合迁移条件',
      recommendations: ['建议创建任务文档'],
      analysis: analysis
    };
  }

  /**
   * 优先级排序系统
   * @param {Array} tasks - 合格任务列表
   * @returns {Promise<Array>} 排序后的任务列表
   */
  async prioritizeTasks(tasks) {
    console.log(`📊 为${tasks.length}个任务计算优先级...`);

    const tasksWithPriority = tasks.map(task => {
      const priority = this.calculateMigrationPriority(task);
      return {
        ...task,
        migrationPriority: priority.score,
        priorityBreakdown: priority.breakdown,
        priorityReason: priority.reason
      };
    });

    // 按优先级排序 (高优先级在前)
    tasksWithPriority.sort((a, b) => b.migrationPriority - a.migrationPriority);

    console.log(`🎯 优先级排序完成，最高优先级: ${tasksWithPriority[0]?.migrationPriority || 0}`);

    return tasksWithPriority;
  }

  /**
   * 综合优先级计算
   * @param {Object} task - 任务对象
   * @returns {Object} 优先级结果
   */
  calculateMigrationPriority(task) {
    const weights = {
      contentQuality: 0.4,    // 内容质量 40%
      taskImportance: 0.3,    // 任务重要性 30%
      timeliness: 0.2,        // 时效性 20%
      projectActivity: 0.1    // 项目活跃度 10%
    };

    // 1. 内容质量评分 (已有)
    const contentQuality = task.migrationScore || 0;

    // 2. 任务重要性评估
    const taskImportance = this.assessTaskImportance(task);

    // 3. 时效性评估 (越新的任务优先级越高)
    const timeliness = this.assessTimeliness(task);

    // 4. 项目活跃度 (简化处理，项目1活跃度高)
    const projectActivity = task.project_id === 1 ? 1.0 : 0.5;

    // 计算加权总分
    const score = 
      contentQuality * weights.contentQuality +
      taskImportance * weights.taskImportance +
      timeliness * weights.timeliness +
      projectActivity * weights.projectActivity;

    return {
      score: Math.round(score * 1000) / 1000,
      breakdown: {
        contentQuality: Math.round(contentQuality * 100) / 100,
        taskImportance: Math.round(taskImportance * 100) / 100,
        timeliness: Math.round(timeliness * 100) / 100,
        projectActivity: Math.round(projectActivity * 100) / 100
      },
      reason: this.generatePriorityReason(score, {
        contentQuality,
        taskImportance,
        timeliness,
        projectActivity
      })
    };
  }

  /**
   * 任务重要性评估算法
   * @param {Object} task - 任务对象
   * @returns {number} 重要性评分 (0-1)
   */
  assessTaskImportance(task) {
    let score = 0.5; // 基础分

    const title = (task.title || '').toLowerCase();
    const description = (task.description || '').toLowerCase();
    const content = title + ' ' + description;

    // 关键词加分
    const importantKeywords = {
      high: ['系统', '架构', '核心', '关键', '重要', '主要', '完成', '实现', '优化'],
      medium: ['功能', '模块', '组件', '接口', 'api', '数据库', '前端', '后端'],
      low: ['修复', 'bug', '调试', '测试', '文档', '更新']
    };

    // 高重要性关键词
    const highMatches = importantKeywords.high.filter(kw => content.includes(kw)).length;
    score += highMatches * 0.1;

    // 中等重要性关键词
    const mediumMatches = importantKeywords.medium.filter(kw => content.includes(kw)).length;
    score += mediumMatches * 0.05;

    // 低重要性关键词 (轻微减分)
    const lowMatches = importantKeywords.low.filter(kw => content.includes(kw)).length;
    score -= lowMatches * 0.02;

    // 长度加分 (内容越详细可能越重要)
    if (task.description && task.description.length > 1000) {
      score += 0.2;
    } else if (task.description && task.description.length > 500) {
      score += 0.1;
    }

    // 确保在0-1范围内
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 时效性评估
   * @param {Object} task - 任务对象
   * @returns {number} 时效性评分 (0-1)
   */
  assessTimeliness(task) {
    const now = new Date();
    const taskDate = new Date(task.updated_at || task.created_at || now);
    const daysDiff = (now - taskDate) / (1000 * 60 * 60 * 24);

    // 时效性评分 (越新的分数越高)
    if (daysDiff <= 7) return 1.0;      // 一周内
    if (daysDiff <= 30) return 0.8;     // 一月内
    if (daysDiff <= 90) return 0.6;     // 三月内
    if (daysDiff <= 180) return 0.4;    // 半年内
    if (daysDiff <= 365) return 0.2;    // 一年内
    return 0.1;                         // 一年以上
  }

  /**
   * 生成优先级原因
   * @param {number} score - 总分
   * @param {Object} breakdown - 分解评分
   * @returns {string} 优先级原因
   */
  generatePriorityReason(score, breakdown) {
    if (score >= 0.8) {
      return '高优先级: 内容质量优秀且任务重要';
    } else if (score >= 0.6) {
      return '中高优先级: 内容质量良好';
    } else if (score >= 0.4) {
      return '中等优先级: 符合基本迁移条件';
    } else {
      return '低优先级: 建议后续处理';
    }
  }

  /**
   * 执行迁移主流程
   * @param {Array} tasks - 要迁移的任务列表
   * @param {Object} options - 迁移选项
   * @returns {Promise<Object>} 迁移结果
   */
  async executeMigration(tasks, options = {}) {
    if (this.config.dryRun) {
      console.log('🔍 DRY RUN模式，不会实际创建文档');
      return this.simulateMigration(tasks);
    }

    this.progressTracker.start('migration');
    
    try {
      console.log(`🚀 开始执行迁移，共${tasks.length}个任务`);

      // 创建备份
      if (this.config.backupEnabled) {
        await this.createMigrationBackup(tasks);
      }

      // 批量处理
      const results = await this.processBatch(tasks, options);

      // 生成报告
      const report = this.reportGenerator.generateReport(tasks, results);

      this.progressTracker.complete('migration', {
        total: tasks.length,
        success: results.filter(r => r.success).length,
        failure: results.filter(r => !r.success).length
      });

      return {
        success: true,
        results: results,
        report: report,
        summary: {
          total: tasks.length,
          success: results.filter(r => r.success).length,
          failure: results.filter(r => !r.success).length,
          successRate: Math.round((results.filter(r => r.success).length / tasks.length) * 100)
        }
      };

    } catch (error) {
      this.progressTracker.error('migration', error);
      throw error;
    }
  }

  /**
   * 批次处理逻辑
   * @param {Array} tasks - 任务列表
   * @param {Object} options - 处理选项
   * @returns {Promise<Array>} 处理结果
   */
  async processBatch(tasks, options) {
    const results = [];
    const batchSize = this.config.batchSize;
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(tasks.length / batchSize);
      
      console.log(`📦 处理批次 ${batchIndex}/${totalBatches} (${batch.length}个任务)`);
      this.progressTracker.updateStatus(`处理批次 ${batchIndex}/${totalBatches}`);

      // 并发处理当前批次
      const batchPromises = batch.map(task => 
        this.processSingleTask(task, options)
          .catch(error => ({
            success: false,
            taskId: task.id,
            error: error.message
          }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 更新进度
      const overallProgress = Math.round(((i + batch.length) / tasks.length) * 100);
      this.progressTracker.updateProgress(overallProgress);

      // 批次间延迟
      if (i + batchSize < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * 处理单个任务
   * @param {Object} task - 任务对象
   * @param {Object} options - 处理选项
   * @returns {Promise<Object>} 处理结果
   */
  async processSingleTask(task, options) {
    try {
      console.log(`📝 处理任务${task.id}: ${task.title}`);
      
      const result = await this.autoDocService.createDocumentFromTask(task, {
        force: true, // 强制创建，跳过质量检查
        duplicateAction: 'skip', // 跳过已存在的文档
        message: `历史任务迁移 - ${new Date().toLocaleString('zh-CN')}`
      });

      return {
        success: result.success,
        taskId: task.id,
        taskTitle: task.title,
        confidence: result.confidence,
        processingTime: result.processingTime,
        message: result.message
      };

    } catch (error) {
      console.error(`❌ 任务${task.id}处理失败:`, error.message);
      
      return {
        success: false,
        taskId: task.id,
        taskTitle: task.title,
        error: error.message
      };
    }
  }

  /**
   * 创建迁移备份
   * @param {Array} tasks - 任务列表
   * @returns {Promise<string>} 备份文件路径
   */
  async createMigrationBackup(tasks) {
    console.log('💾 创建迁移备份...');
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      totalTasks: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        project_id: task.project_id
      }))
    };

    // 这里可以实现实际的备份逻辑
    console.log(`✅ 备份创建完成，包含${tasks.length}个任务`);
    
    return `migration_backup_${Date.now()}.json`;
  }

  /**
   * 模拟迁移 (DRY RUN)
   * @param {Array} tasks - 任务列表
   * @returns {Object} 模拟结果
   */
  simulateMigration(tasks) {
    console.log('🎭 模拟迁移执行...');
    
    const results = tasks.map(task => ({
      success: true,
      taskId: task.id,
      taskTitle: task.title,
      confidence: task.migrationScore || 0.7,
      processingTime: Math.random() * 2000 + 500,
      message: 'DRY RUN - 模拟创建成功'
    }));

    return {
      success: true,
      results: results,
      summary: {
        total: tasks.length,
        success: tasks.length,
        failure: 0,
        successRate: 100
      },
      note: '这是DRY RUN模式的模拟结果'
    };
  }

  /**
   * 获取迁移统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    return {
      version: '1.0.0',
      config: this.config,
      progressTracker: this.progressTracker.getStatus(),
      analyzer: this.contentAnalyzer.getConfig()
    };
  }
}

/**
 * 迁移进度跟踪器
 */
class MigrationProgressTracker {
  constructor() {
    this.status = {
      currentOperation: null,
      progress: 0,
      message: '',
      startTime: null,
      endTime: null,
      error: null,
      data: {}
    };
  }

  start(operation) {
    this.status = {
      currentOperation: operation,
      progress: 0,
      message: `开始${operation}`,
      startTime: new Date(),
      endTime: null,
      error: null,
      data: {}
    };
    console.log(`🚀 ${operation}开始...`);
  }

  updateProgress(progress) {
    this.status.progress = Math.max(0, Math.min(100, progress));
  }

  updateStatus(message) {
    this.status.message = message;
    console.log(`📊 ${message}`);
  }

  complete(operation, data = {}) {
    this.status.endTime = new Date();
    this.status.progress = 100;
    this.status.message = `${operation}完成`;
    this.status.data = data;
    
    const duration = this.status.endTime - this.status.startTime;
    console.log(`✅ ${operation}完成，耗时${duration}ms`);
  }

  error(operation, error) {
    this.status.endTime = new Date();
    this.status.error = error.message;
    this.status.message = `${operation}失败: ${error.message}`;
    console.error(`❌ ${operation}失败:`, error);
  }

  getStatus() {
    return { ...this.status };
  }
}

/**
 * 迁移报告生成器
 */
class MigrationReportGenerator {
  generateReport(tasks, results) {
    const now = new Date();
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    return {
      timestamp: now.toISOString(),
      summary: {
        totalTasks: tasks.length,
        successCount: successCount,
        failureCount: failureCount,
        successRate: Math.round((successCount / tasks.length) * 100)
      },
      qualityAnalysis: this.analyzeQuality(tasks, results),
      recommendations: this.generateRecommendations(tasks, results),
      details: results
    };
  }

  analyzeQuality(tasks, results) {
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        averageConfidence: 0,
        qualityDistribution: {},
        message: '没有成功创建的文档'
      };
    }

    const confidences = successfulResults.map(r => r.confidence || 0);
    const averageConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    const qualityDistribution = {
      high: confidences.filter(c => c >= 0.8).length,
      medium: confidences.filter(c => c >= 0.6 && c < 0.8).length,
      low: confidences.filter(c => c < 0.6).length
    };

    return {
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      qualityDistribution,
      message: `平均置信度${Math.round(averageConfidence * 100)}%`
    };
  }

  generateRecommendations(tasks, results) {
    const recommendations = [];
    
    const failureCount = results.filter(r => !r.success).length;
    if (failureCount > 0) {
      recommendations.push(`建议检查${failureCount}个失败任务的具体错误原因`);
    }

    const lowQualityCount = results.filter(r => r.success && (r.confidence || 0) < 0.6).length;
    if (lowQualityCount > 0) {
      recommendations.push(`${lowQualityCount}个任务的文档质量较低，建议人工审核`);
    }

    if (recommendations.length === 0) {
      recommendations.push('迁移质量良好，所有文档创建成功');
    }

    return recommendations;
  }
}

// 工厂函数
export function createHistoricalDataMigrator(taskMCPServer, config = {}) {
  return new HistoricalDataMigrator(taskMCPServer, config);
}

// 默认导出
export default HistoricalDataMigrator;