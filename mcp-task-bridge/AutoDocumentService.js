/**
 * 自动文档创建服务 - AutoDocumentService
 * 实现从任务描述到正式文档的自动转换
 * 
 * @author Claude AI
 * @version 1.0.0
 * @created 2025-08-03
 */

import { TaskContentAnalyzer } from './TaskContentAnalyzer.js';

export class AutoDocumentService {
  constructor(taskMCPServer, config = {}) {
    this.taskMCPServer = taskMCPServer;
    this.contentAnalyzer = new TaskContentAnalyzer(config.analyzer || {});
    
    // 配置管理
    this.config = {
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 30000,
      qualityCheck: config.qualityCheck !== false,
      duplicateAction: config.duplicateAction || 'skip', // skip, merge, overwrite
      ...config
    };

    // 文档模板
    this.templates = {
      technical: this.createTechnicalTemplate(),
      structured: this.createStructuredTemplate(),
      phase: this.createPhaseTemplate(),
      general: this.createGeneralTemplate()
    };
  }

  /**
   * 主流程：从任务创建文档
   * @param {Object} task - 任务对象
   * @param {Object} options - 创建选项
   * @returns {Promise<Object>} 创建结果
   */
  async createDocumentFromTask(task, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 开始为任务${task.id}创建文档...`);

      // 1. 内容分析
      const analysis = await this.analyzeTaskContent(task);
      if (!analysis.shouldCreateDocument && !options.force) {
        return {
          success: false,
          reason: 'content_quality_insufficient',
          message: analysis.reason,
          analysis: analysis
        };
      }

      // 2. 重复检查
      const duplicateCheck = await this.checkDuplicateDocument(task);
      if (duplicateCheck.exists) {
        const duplicateResult = await this.handleDuplicateDocument(task, duplicateCheck, options);
        if (!duplicateResult.shouldProceed) {
          return duplicateResult;
        }
      }

      // 3. 内容格式化
      const formattedContent = await this.formatTaskContent(task, analysis);

      // 4. 质量验证
      if (this.config.qualityCheck) {
        const qualityCheck = await this.validateDocumentQuality(formattedContent);
        if (!qualityCheck.isValid) {
          return {
            success: false,
            reason: 'quality_validation_failed',
            message: qualityCheck.message,
            issues: qualityCheck.issues
          };
        }
      }

      // 5. 文档创建
      const createResult = await this.createDocument(task, formattedContent, options);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ 任务${task.id}文档创建成功，耗时${duration}ms`);

      return {
        success: true,
        documentId: createResult.documentId,
        confidence: analysis.confidence,
        processingTime: duration,
        analysis: analysis,
        message: '文档创建成功'
      };

    } catch (error) {
      console.error(`❌ 任务${task.id}文档创建失败:`, error);
      
      return {
        success: false,
        reason: 'creation_error',
        message: error.message,
        error: error
      };
    }
  }

  /**
   * 分析任务内容
   * @param {Object} task - 任务对象
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeTaskContent(task) {
    const content = task.description || '';
    return this.contentAnalyzer.analyzeSummaryContent(content);
  }

  /**
   * 检查重复文档
   * @param {Object} task - 任务对象
   * @returns {Promise<Object>} 检查结果
   */
  async checkDuplicateDocument(task) {
    try {
      const existingDoc = await this.taskMCPServer.getTaskDocument(task.id);
      return {
        exists: true,
        document: existingDoc,
        lastModified: existingDoc.last_updated || new Date().toISOString()
      };
    } catch (error) {
      // 如果文档不存在，这是正常情况
      return {
        exists: false,
        document: null
      };
    }
  }

  /**
   * 处理重复文档
   * @param {Object} task - 任务对象
   * @param {Object} duplicateCheck - 重复检查结果
   * @param {Object} options - 处理选项
   * @returns {Promise<Object>} 处理结果
   */
  async handleDuplicateDocument(task, duplicateCheck, options) {
    const action = options.duplicateAction || this.config.duplicateAction;

    switch (action) {
      case 'skip':
        return {
          success: true,
          shouldProceed: false,
          reason: 'document_already_exists',
          message: '文档已存在，跳过创建',
          existingDocument: duplicateCheck.document
        };

      case 'overwrite':
        console.log(`🔄 覆盖任务${task.id}的现有文档`);
        return {
          shouldProceed: true,
          action: 'overwrite'
        };

      case 'merge':
        console.log(`🔄 合并任务${task.id}的文档内容`);
        return {
          shouldProceed: true,
          action: 'merge',
          existingContent: duplicateCheck.document.content
        };

      default:
        return {
          success: false,
          shouldProceed: false,
          reason: 'invalid_duplicate_action',
          message: `无效的重复处理动作: ${action}`
        };
    }
  }

  /**
   * 格式化任务内容
   * @param {Object} task - 任务对象
   * @param {Object} analysis - 分析结果
   * @returns {Promise<string>} 格式化后的内容
   */
  async formatTaskContent(task, analysis) {
    // 选择合适的模板
    const template = this.selectTemplate(task, analysis);
    
    // 应用模板
    const formattedContent = this.applyTemplate(template, task, analysis);
    
    return formattedContent;
  }

  /**
   * 选择合适的模板
   * @param {Object} task - 任务对象
   * @param {Object} analysis - 分析结果
   * @returns {string} 模板名称
   */
  selectTemplate(task, analysis) {
    const title = (task.title || '').toLowerCase();
    
    // Phase类任务使用Phase模板
    if (title.includes('phase') || title.includes('阶段')) {
      return 'phase';
    }
    
    // 技术含量高的使用技术模板
    if (analysis.details.technical.score >= 0.6) {
      return 'technical';
    }
    
    // 结构化程度高的使用结构化模板
    if (analysis.details.structure.score >= 0.7) {
      return 'structured';
    }
    
    // 默认使用通用模板
    return 'general';
  }

  /**
   * 应用模板
   * @param {string} templateName - 模板名称
   * @param {Object} task - 任务对象
   * @param {Object} analysis - 分析结果
   * @returns {string} 应用模板后的内容
   */
  applyTemplate(templateName, task, analysis) {
    const template = this.templates[templateName] || this.templates.general;
    
    // 准备变量
    const variables = {
      taskId: task.id,
      title: task.title || '未命名任务',
      description: task.description || '',
      status: task.status || 'unknown',
      projectId: task.project_id,
      createdAt: task.created_at || new Date().toISOString(),
      updatedAt: task.updated_at || new Date().toISOString(),
      confidence: Math.round(analysis.confidence * 100),
      score: Math.round(analysis.score * 100),
      analysisDetails: this.formatAnalysisDetails(analysis),
      metadata: this.generateDocumentMetadata(task, analysis)
    };

    // 替换模板变量
    let content = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, variables[key]);
    });

    return content;
  }

  /**
   * 格式化分析详情
   * @param {Object} analysis - 分析结果
   * @returns {string} 格式化的分析详情
   */
  formatAnalysisDetails(analysis) {
    const details = analysis.details;
    
    return `## 📊 智能分析详情

### 内容质量评估
- **总体评分**: ${Math.round(analysis.score * 100)}分 (满分100分)
- **置信度**: ${Math.round(analysis.confidence * 100)}%
- **创建建议**: ${analysis.reason}

### 维度分析
- **长度分析**: ${details.length.analysis}
- **关键词分析**: ${details.keywords.analysis}
- **结构分析**: ${details.structure.analysis}
- **技术分析**: ${details.technical.analysis}

### 改进建议
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}`;
  }

  /**
   * 生成文档元数据
   * @param {Object} task - 任务对象
   * @param {Object} analysis - 分析结果
   * @returns {string} 元数据字符串
   */
  generateDocumentMetadata(task, analysis) {
    const now = new Date().toISOString();
    
    return `---
task_id: ${task.id}
project_id: ${task.project_id}
title: "${task.title}"
status: "${task.status}"
auto_generated: true
generation_time: "${now}"
confidence: ${analysis.confidence}
quality_score: ${analysis.score}
template_used: "${this.selectTemplate(task, analysis)}"
analyzer_version: "1.0.0"
---`;
  }

  /**
   * 验证文档质量
   * @param {string} content - 文档内容
   * @returns {Promise<Object>} 验证结果
   */
  async validateDocumentQuality(content) {
    const issues = [];
    
    // 基础检查
    if (!content || content.trim().length === 0) {
      issues.push('文档内容为空');
    }
    
    if (content.length < 100) {
      issues.push('文档内容过短');
    }
    
    // Markdown格式检查
    if (!content.includes('#')) {
      issues.push('缺少标题结构');
    }
    
    // 元数据检查
    if (!content.startsWith('---')) {
      issues.push('缺少文档元数据');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues,
      message: issues.length > 0 ? `文档质量问题: ${issues.join(', ')}` : '文档质量验证通过'
    };
  }

  /**
   * 创建文档
   * @param {Object} task - 任务对象
   * @param {string} content - 文档内容
   * @param {Object} options - 创建选项
   * @returns {Promise<Object>} 创建结果
   */
  async createDocument(task, content, options) {
    const maxRetries = this.config.retryAttempts;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📝 尝试创建文档 (第${attempt}次)...`);
        
        const result = await this.taskMCPServer.createOrUpdateTaskDocument(
          task.id,
          content,
          options.message || `自动生成任务文档 - ${new Date().toLocaleString('zh-CN')}`
        );

        return {
          documentId: `task-${task.id}`,
          result: result
        };

      } catch (error) {
        lastError = error;
        console.log(`❌ 创建文档失败 (第${attempt}次): ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // 指数退避
          console.log(`⏳ ${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`创建文档失败，已重试${maxRetries}次: ${lastError.message}`);
  }

  /**
   * 批量创建文档
   * @param {Array} tasks - 任务列表
   * @param {Object} options - 批量选项
   * @returns {Promise<Object>} 批量结果
   */
  async batchCreateDocuments(tasks, options = {}) {
    const startTime = Date.now();
    const results = [];
    const batchSize = options.batchSize || 5;
    const concurrentLimit = options.concurrentLimit || 3;

    console.log(`🚀 开始批量创建文档，共${tasks.length}个任务，批次大小${batchSize}，并发数${concurrentLimit}`);

    // 分批处理
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      console.log(`📦 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)}`);

      // 并发处理当前批次
      const batchPromises = batch.map(task => 
        this.createDocumentFromTask(task, options)
          .catch(error => ({
            success: false,
            taskId: task.id,
            error: error.message
          }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 批次间延迟
      if (i + batchSize < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`✅ 批量创建完成: 成功${successCount}个, 失败${failureCount}个, 耗时${duration}ms`);

    return {
      success: failureCount === 0,
      results: results,
      statistics: {
        total: tasks.length,
        success: successCount,
        failure: failureCount,
        successRate: Math.round((successCount / tasks.length) * 100),
        totalTime: duration,
        averageTime: Math.round(duration / tasks.length)
      }
    };
  }

  // 模板定义方法
  createTechnicalTemplate() {
    return `{{metadata}}

# {{title}}

## 🎯 任务概述

**任务ID**: {{taskId}}  
**项目ID**: {{projectId}}  
**状态**: {{status}}  
**智能分析置信度**: {{confidence}}%

## 📋 技术实现详情

{{description}}

## 🔧 技术要点

### 核心技术
- 主要技术栈分析基于智能内容检测
- 代码实现细节已在描述中详细说明
- API接口设计和数据流程清晰

### 实现架构
- 模块化设计
- 接口规范化
- 错误处理完善

## 🧪 测试验证

### 测试策略
- 单元测试覆盖核心逻辑
- 集成测试验证接口调用
- 性能测试确保响应时间

### 验收标准
- 功能完整性验证
- 性能指标达标
- 代码质量检查通过

{{analysisDetails}}

## 📝 文档信息

- **自动生成时间**: {{updatedAt}}
- **质量评分**: {{score}}/100
- **生成方式**: 智能任务文档自动化系统

---

*此文档由AI智能分析自动生成，如需修改请手动编辑*`;
  }

  createStructuredTemplate() {
    return `{{metadata}}

# {{title}}

## 📊 任务信息

| 属性 | 值 |
|------|-----|
| 任务ID | {{taskId}} |
| 项目ID | {{projectId}} |
| 状态 | {{status}} |
| 创建时间 | {{createdAt}} |
| 更新时间 | {{updatedAt}} |

## 📝 详细内容

{{description}}

## 🎯 关键要点

### 主要成果
- 任务执行的核心成果
- 解决的关键问题
- 达成的重要目标

### 实施过程
- 执行步骤详细记录
- 遇到的挑战和解决方案
- 经验教训总结

## 📈 影响评估

### 直接影响
- 对项目进度的影响
- 对系统功能的改进
- 对用户体验的提升

### 后续规划
- 基于此任务的后续计划
- 需要跟进的事项
- 潜在的优化方向

{{analysisDetails}}

## 📋 文档状态

- **生成时间**: {{updatedAt}}
- **置信度**: {{confidence}}%
- **质量评分**: {{score}}/100

---

*文档由智能分析系统自动生成*`;
  }

  createPhaseTemplate() {
    return `{{metadata}}

# {{title}}

## 🚀 Phase执行概述

**阶段标识**: {{taskId}}  
**所属项目**: {{projectId}}  
**执行状态**: {{status}}  
**完成度评估**: {{confidence}}%

## 📋 阶段详情

{{description}}

## 🎯 阶段目标

### 主要目标
- 明确的阶段性目标
- 可衡量的交付成果
- 质量标准要求

### 执行计划
- 详细的执行步骤
- 时间节点安排
- 资源需求分析

## ✅ 完成情况

### 已完成项目
- [x] 核心功能实现
- [x] 测试验证完成
- [x] 文档更新

### 关键成果
- 技术实现亮点
- 性能优化效果
- 用户体验改进

## 🔄 后续阶段

### 下一阶段准备
- 依赖关系梳理
- 资源准备情况
- 风险预估

### 经验传承
- 技术经验总结
- 最佳实践提炼
- 改进建议

{{analysisDetails}}

## 📊 阶段总结

- **执行时间**: {{createdAt}} ~ {{updatedAt}}
- **质量评分**: {{score}}/100分
- **系统评估**: 基于智能内容分析

---

*Phase文档自动生成于 {{updatedAt}}*`;
  }

  createGeneralTemplate() {
    return `{{metadata}}

# {{title}}

## 📋 任务记录

**任务编号**: {{taskId}}  
**归属项目**: {{projectId}}  
**当前状态**: {{status}}  
**记录时间**: {{updatedAt}}

## 📝 内容详情

{{description}}

## 🎯 核心要点

### 主要内容
基于智能分析，此任务包含以下关键信息：
- 任务执行的详细过程
- 重要的决策和考虑因素
- 取得的成果和效果

### 价值体现
- 对项目目标的贡献
- 解决的具体问题
- 带来的改进效果

## 📊 分析总结

### 内容评估
- **内容质量**: {{score}}/100分
- **完整程度**: {{confidence}}%
- **文档价值**: 适合转化为正式文档

### 后续建议
- 内容已具备文档化价值
- 建议纳入项目知识库
- 可作为经验参考

{{analysisDetails}}

## 📄 文档说明

此文档基于任务描述自动生成，保留了原始内容的完整性和结构性。

生成信息：
- 生成时间: {{updatedAt}}
- 分析引擎: TaskContentAnalyzer v1.0.0
- 模板类型: 通用模板

---

*由智能任务文档自动化系统生成*`;
  }

  /**
   * 获取服务统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    return {
      version: '1.0.0',
      config: this.config,
      templates: Object.keys(this.templates),
      analyzer: this.contentAnalyzer.getConfig()
    };
  }
}

// 工厂函数
export function createAutoDocumentService(taskMCPServer, config = {}) {
  return new AutoDocumentService(taskMCPServer, config);
}

// 默认导出
export default AutoDocumentService;