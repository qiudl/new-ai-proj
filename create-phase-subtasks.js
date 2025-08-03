import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function createPhaseSubtasks() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🔧 为任务206创建4个Phase开发子任务');
    console.log('==================================');
    
    const phases = [
      {
        title: 'Phase 1: 智能内容检测引擎开发',
        description: `# Phase 1: 智能内容检测引擎开发

## 🎯 任务目标
开发TaskContentAnalyzer类，实现对任务描述内容的智能分析，判断是否需要自动创建任务文档。

## 📋 核心功能开发

### 1. TaskContentAnalyzer类架构设计
创建TaskContentAnalyzer类，包含关键词检测、结构分析、技术内容识别等功能：
- 关键词分类：总结类、结构类、技术类、流程类
- 权重配置：长度(0.2)、关键词(0.3)、结构(0.25)、技术(0.25)
- 阈值设置：最小长度300字符、最小评分0.6、高置信度0.8
    
    this.weights = {
      length: 0.2,
      keywords: 0.3,
      structure: 0.25,
      technical: 0.25
    };
    
    this.thresholds = {
      minLength: 300,
      minScore: 0.6,
      highConfidence: 0.8
    };
  }
}
\`\`\`

### 2. 内容分析核心算法
\`\`\`javascript
analyzeSummaryContent(description) {
  if (!description || description.length < this.thresholds.minLength) {
    return { shouldCreateDocument: false, score: 0, confidence: 0 };
  }
  
  const analysis = {
    length: this.analyzeLength(description),
    keywords: this.analyzeKeywords(description),
    structure: this.analyzeStructure(description),
    technical: this.analyzeTechnical(description)
  };
  
  const score = this.calculateWeightedScore(analysis);
  const confidence = this.calculateConfidence(analysis, score);
  const shouldCreateDocument = score > this.thresholds.minScore;
  
  return {
    shouldCreateDocument,
    score,
    confidence,
    analysis,
    recommendations: this.generateRecommendations(analysis)
  };
}
\`\`\`

### 3. 各维度分析方法实现

#### 长度分析
\`\`\`javascript
analyzeLength(description) {
  const length = description.length;
  if (length < 300) return 0;
  if (length < 500) return 0.3;
  if (length < 1000) return 0.6;
  if (length < 2000) return 0.8;
  return 1.0;
}
\`\`\`

#### 关键词分析
\`\`\`javascript
analyzeKeywords(description) {
  const text = description.toLowerCase();
  let score = 0;
  let totalMatches = 0;
  
  Object.entries(this.keywords).forEach(([category, words]) => {
    const matches = words.filter(word => text.includes(word)).length;
    totalMatches += matches;
    
    switch(category) {
      case 'summary': score += matches * 0.4; break;
      case 'structure': score += matches * 0.3; break;
      case 'technical': score += matches * 0.2; break;
      case 'process': score += matches * 0.1; break;
    }
  });
  
  return Math.min(score / 5, 1.0); // 标准化到0-1
}
\`\`\`

#### 结构化内容分析
\`\`\`javascript
analyzeStructure(description) {
  const patterns = {
    headers: /(#{1,6}\\s+.+)/g,
    lists: /(^\\s*[-*+]\\s+.+)|(^\\s*\\d+\\.\\s+.+)/gm,
    checkboxes: /- \\[(x| )\\]/g,
    codeBlocks: /\`\`\`[\\s\\S]*?\`\`\`/g,
    inlineCode: /\`[^\\n\`]+\`/g,
    emojis: /[\\u{1F300}-\\u{1F9FF}]/gu
  };
  
  let structureScore = 0;
  let structureCount = 0;
  
  Object.entries(patterns).forEach(([type, pattern]) => {
    const matches = (description.match(pattern) || []).length;
    if (matches > 0) {
      structureCount++;
      structureScore += Math.min(matches * 0.1, 0.3);
    }
  });
  
  return Math.min(structureScore, 1.0);
}
\`\`\`

#### 技术内容分析
\`\`\`javascript
analyzeTechnical(description) {
  const technicalPatterns = {
    codeSnippets: /\`\`\`[\\s\\S]*?\`\`\`/g,
    apiCalls: /(GET|POST|PUT|DELETE)\\s+\\/api/gi,
    httpStatus: /\\b(200|201|400|404|500)\\b/g,
    functions: /(function|const|let|var)\\s+\\w+/g,
    classes: /class\\s+\\w+/g,
    imports: /(import|require)\\s+/g,
    technologies: /(React|Node|Express|SQL|MongoDB|Docker|Git)/gi
  };
  
  let techScore = 0;
  Object.entries(technicalPatterns).forEach(([type, pattern]) => {
    const matches = (description.match(pattern) || []).length;
    techScore += matches * 0.1;
  });
  
  return Math.min(techScore / 3, 1.0);
}
\`\`\`

### 4. 综合评分和置信度计算
\`\`\`javascript
calculateWeightedScore(analysis) {
  return (
    analysis.length * this.weights.length +
    analysis.keywords * this.weights.keywords +
    analysis.structure * this.weights.structure +
    analysis.technical * this.weights.technical
  );
}

calculateConfidence(analysis, score) {
  const factors = [
    analysis.keywords > 0.5 ? 0.3 : 0,
    analysis.structure > 0.3 ? 0.25 : 0,
    analysis.technical > 0.2 ? 0.2 : 0,
    score > this.thresholds.highConfidence ? 0.25 : score * 0.25
  ];
  
  return factors.reduce((sum, factor) => sum + factor, 0);
}
\`\`\`

### 5. 建议生成系统
\`\`\`javascript
generateRecommendations(analysis) {
  const recommendations = [];
  
  if (analysis.length < 0.5) {
    recommendations.push('内容长度较短，建议增加更多详细信息');
  }
  
  if (analysis.keywords < 0.3) {
    recommendations.push('缺少总结性关键词，建议添加执行结果描述');
  }
  
  if (analysis.structure < 0.2) {
    recommendations.push('建议使用Markdown格式增强内容结构');
  }
  
  if (analysis.technical < 0.1) {
    recommendations.push('建议添加技术实现细节或代码示例');
  }
  
  return recommendations;
}
\`\`\`

## 🧪 测试与验证

### 1. 单元测试用例
\`\`\`javascript
// 测试用例设计
const testCases = [
  {
    name: '高质量技术总结',
    description: '# 任务完成总结\\n\\n## 实现功能\\n- ✅ API开发\\n- ✅ 前端集成\\n\\n\`\`\`javascript\\nfunction test() {}\\n\`\`\`',
    expected: { shouldCreateDocument: true, confidence: > 0.8 }
  },
  {
    name: '简短任务描述',
    description: '修复了一个小bug',
    expected: { shouldCreateDocument: false, confidence: < 0.3 }
  },
  {
    name: '结构化项目总结',
    description: '## 🎯 项目目标\\n实现用户管理功能\\n\\n### 完成情况\\n✅ 用户注册\\n✅ 用户登录\\n\\n### 技术栈\\nReact + Node.js',
    expected: { shouldCreateDocument: true, confidence: > 0.7 }
  }
];
\`\`\`

### 2. 性能基准测试
\`\`\`javascript
// 性能测试
async function performanceTest() {
  const analyzer = new TaskContentAnalyzer();
  const start = Date.now();
  
  // 测试1000个不同长度的文档
  for (let i = 0; i < 1000; i++) {
    analyzer.analyzeSummaryContent(generateTestContent(i));
  }
  
  const duration = Date.now() - start;
  console.log(\`分析1000个文档耗时: \${duration}ms\`);
  // 目标: < 100ms
}
\`\`\`

## ✅ 交付成果

### 1. 核心代码文件
- \`TaskContentAnalyzer.js\` - 主分析引擎
- \`ContentAnalysisUtils.js\` - 工具函数
- \`AnalysisConfig.js\` - 配置管理

### 2. 测试文件
- \`TaskContentAnalyzer.test.js\` - 单元测试
- \`PerformanceTest.js\` - 性能测试
- \`TestCases.js\` - 测试用例集

### 3. 文档
- \`ContentAnalysisAPI.md\` - API文档
- \`AlgorithmGuide.md\` - 算法说明

## 🎯 验收标准

### 功能验收
- [ ] 能够正确识别高质量总结内容 (准确率 > 90%)
- [ ] 能够过滤掉简短无意义描述 (准确率 > 95%)
- [ ] 置信度计算合理，与人工判断一致性 > 85%

### 性能验收
- [ ] 单次分析响应时间 < 50ms
- [ ] 批量分析1000个任务 < 5秒
- [ ] 内存使用稳定，无内存泄漏

### 代码质量
- [ ] 代码覆盖率 > 90%
- [ ] 所有测试用例通过
- [ ] 符合团队代码规范

这个智能内容检测引擎将为整个自动文档创建系统提供强大的决策支持！`,
        estimated_hours: 0.75
      },
      {
        title: 'Phase 2: 自动文档创建服务开发',
        description: `# Phase 2: 自动文档创建服务开发

## 🎯 任务目标
开发AutoDocumentService类，实现从任务描述到正式文档的自动转换，包括内容格式化、文档创建、去重验证等核心功能。

## 📋 核心功能开发

### 1. AutoDocumentService类架构设计
\`\`\`javascript
class AutoDocumentService {
  constructor(taskServer, contentAnalyzer) {
    this.taskServer = taskServer;
    this.analyzer = contentAnalyzer;
    this.formatter = new DocumentFormatter();
    this.validator = new DocumentValidator();
    this.logger = new AutoDocLogger();
    
    this.config = {
      retryAttempts: 3,
      timeoutMs: 5000,
      backupEnabled: true,
      qualityCheck: true
    };
  }
}
\`\`\`

### 2. 文档自动创建主流程
\`\`\`javascript
async createDocumentFromTask(taskId, taskData, options = {}) {
  try {
    this.logger.info(\`开始为任务\${taskId}创建文档\`);
    
    // 1. 内容分析
    const analysis = this.analyzer.analyzeSummaryContent(taskData.description);
    if (!analysis.shouldCreateDocument) {
      return { 
        success: false, 
        reason: 'content_not_suitable',
        analysis 
      };
    }
    
    // 2. 重复检查
    const duplicateCheck = await this.checkDuplicateDocument(taskId);
    if (duplicateCheck.exists && !options.forceOverwrite) {
      return { 
        success: false, 
        reason: 'document_already_exists',
        existingDoc: duplicateCheck.document 
      };
    }
    
    // 3. 内容格式化
    const formattedContent = await this.formatTaskSummary(taskData, analysis);
    
    // 4. 质量验证
    if (this.config.qualityCheck) {
      const qualityCheck = this.validator.validateContent(formattedContent);
      if (!qualityCheck.isValid) {
        return { 
          success: false, 
          reason: 'quality_check_failed',
          issues: qualityCheck.issues 
        };
      }
    }
    
    // 5. 创建文档
    const docResult = await this.createTaskDocument(taskId, formattedContent);
    
    // 6. 记录日志
    this.logger.success(\`任务\${taskId}文档创建成功\`, {
      confidence: analysis.confidence,
      contentLength: formattedContent.length,
      processingTime: Date.now() - startTime
    });
    
    return {
      success: true,
      action: 'document_created',
      confidence: analysis.confidence,
      documentId: docResult.id,
      metadata: {
        originalLength: taskData.description.length,
        formattedLength: formattedContent.length,
        analysisScore: analysis.score
      }
    };
    
  } catch (error) {
    this.logger.error(\`任务\${taskId}文档创建失败\`, error);
    return { success: false, reason: 'creation_error', error: error.message };
  }
}
\`\`\`

### 3. 重复文档检查机制
\`\`\`javascript
async checkDuplicateDocument(taskId) {
  try {
    const existingDoc = await this.taskServer.getTaskDocument(taskId);
    return { 
      exists: true, 
      document: existingDoc,
      message: '任务已存在文档'
    };
  } catch (error) {
    if (error.message.includes('document not found')) {
      return { exists: false };
    }
    throw error; // 其他错误继续抛出
  }
}

async handleDuplicateDocument(taskId, newContent, options) {
  const existing = await this.taskServer.getTaskDocument(taskId);
  
  if (options.mergeMode) {
    // 合并模式：将新内容追加到现有文档
    const mergedContent = this.mergeDocumentContent(existing.content, newContent);
    return await this.updateTaskDocument(taskId, mergedContent);
  } else if (options.versionMode) {
    // 版本模式：创建新版本
    return await this.createDocumentVersion(taskId, newContent);
  } else {
    // 默认：询问用户或跳过
    return { 
      success: false, 
      reason: 'requires_user_decision',
      options: ['overwrite', 'merge', 'skip']
    };
  }
}
\`\`\`

### 4. 内容格式化系统
\`\`\`javascript
class DocumentFormatter {
  formatTaskSummary(taskData, analysis) {
    const template = this.selectTemplate(taskData, analysis);
    const content = this.applyTemplate(template, taskData, analysis);
    return this.enhanceContent(content, analysis);
  }
  
  selectTemplate(taskData, analysis) {
    // 根据任务类型和内容特征选择合适的模板
    if (analysis.technical > 0.6) {
      return this.templates.technical;
    } else if (analysis.structure > 0.7) {
      return this.templates.structured;
    } else if (taskData.description.includes('Phase')) {
      return this.templates.phase;
    } else {
      return this.templates.general;
    }
  }
  
  applyTemplate(template, taskData, analysis) {
    const variables = {
      title: taskData.title,
      description: taskData.description,
      createdAt: new Date().toLocaleString('zh-CN'),
      taskId: taskData.id,
      projectId: taskData.project_id,
      confidence: analysis.confidence,
      analysisScore: analysis.score
    };
    
    return template.replace(/\\{\\{(\\w+)\\}\\}/g, (match, key) => {
      return variables[key] || match;
    });
  }
  
  enhanceContent(content, analysis) {
    let enhanced = content;
    
    // 添加元数据部分
    enhanced = this.addMetadataSection(enhanced, analysis);
    
    // 优化Markdown结构
    enhanced = this.optimizeMarkdownStructure(enhanced);
    
    // 添加导航链接
    enhanced = this.addNavigationLinks(enhanced);
    
    return enhanced;
  }
}
\`\`\`

### 5. 文档模板系统
\`\`\`javascript
const documentTemplates = {
  technical: \`# {{title}} - 技术总结

## 📋 任务概述
{{description}}

## 🔧 技术实现
*自动提取的技术内容*

## 📊 执行统计
- **创建时间**: {{createdAt}}
- **任务ID**: {{taskId}}
- **分析置信度**: {{confidence}}
- **内容评分**: {{analysisScore}}

## 🔗 相关资源
- [返回项目](/projects/{{projectId}})
- [编辑任务](/tasks/{{taskId}}/edit)

---
*此文档由智能系统自动生成*\`,

  structured: \`# {{title}}

{{description}}

## 📈 文档信息
- **生成时间**: {{createdAt}}
- **任务编号**: {{taskId}}
- **自动生成**: 是 (置信度: {{confidence}})

---
*基于任务内容自动生成的结构化文档*\`,

  phase: \`# {{title}}

## 🎯 阶段概述
{{description}}

## 📋 执行记录
*自动从任务描述中提取*

## 🔗 关联信息
- 任务ID: {{taskId}}
- 生成时间: {{createdAt}}
- 分析评分: {{analysisScore}}

---
*Phase任务自动文档化*\`,

  general: \`# {{title}}

{{description}}

---
**文档信息**
- 生成时间: {{createdAt}}
- 任务ID: {{taskId}}
- 项目ID: {{projectId}}

*由智能文档系统自动生成*\`
};
\`\`\`

### 6. 内容质量验证
\`\`\`javascript
class DocumentValidator {
  validateContent(content) {
    const issues = [];
    const checks = {
      minLength: this.checkMinLength(content),
      hasTitle: this.checkHasTitle(content),
      hasContent: this.checkHasContent(content),
      validMarkdown: this.checkValidMarkdown(content),
      noEmpty: this.checkNoEmpty(content)
    };
    
    Object.entries(checks).forEach(([check, result]) => {
      if (!result.passed) {
        issues.push(result.issue);
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues: issues,
      checks: checks,
      recommendation: this.generateRecommendation(issues)
    };
  }
  
  checkMinLength(content) {
    const minLength = 100;
    const passed = content.length >= minLength;
    return {
      passed,
      issue: passed ? null : \`内容长度不足\${minLength}字符\`
    };
  }
  
  checkHasTitle(content) {
    const hasTitle = /^#\\s+.+/m.test(content);
    return {
      passed: hasTitle,
      issue: hasTitle ? null : '缺少文档标题'
    };
  }
  
  checkValidMarkdown(content) {
    try {
      // 简单的Markdown语法检查
      const issues = [];
      
      // 检查标题层级
      const headers = content.match(/^#{1,6}\\s+.+/gm) || [];
      const firstHeader = headers[0];
      if (firstHeader && !firstHeader.startsWith('# ')) {
        issues.push('第一个标题应该是一级标题');
      }
      
      // 检查代码块匹配
      const codeBlocks = content.match(/\`\`\`/g) || [];
      if (codeBlocks.length % 2 !== 0) {
        issues.push('代码块标记不匹配');
      }
      
      return {
        passed: issues.length === 0,
        issue: issues.join('; ')
      };
    } catch (error) {
      return {
        passed: false,
        issue: 'Markdown语法检查失败'
      };
    }
  }
}
\`\`\`

### 7. 错误处理和重试机制
\`\`\`javascript
async createTaskDocumentWithRetry(taskId, content) {
  let lastError;
  
  for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
    try {
      const result = await Promise.race([
        this.taskServer.createOrUpdateTaskDocument(taskId, content),
        this.createTimeout(this.config.timeoutMs)
      ]);
      
      this.logger.info(\`任务\${taskId}文档创建成功 (尝试\${attempt}/\${this.config.retryAttempts})\`);
      return result;
      
    } catch (error) {
      lastError = error;
      this.logger.warn(\`任务\${taskId}文档创建失败 (尝试\${attempt}/\${this.config.retryAttempts}): \${error.message}\`);
      
      if (attempt < this.config.retryAttempts) {
        await this.delay(1000 * attempt); // 指数退避
      }
    }
  }
  
  throw new Error(\`文档创建最终失败: \${lastError.message}\`);
}

createTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('操作超时')), ms);
  });
}

delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
\`\`\`

## 🧪 测试与验证

### 1. 端到端测试
\`\`\`javascript
describe('AutoDocumentService E2E Tests', () => {
  test('完整文档创建流程', async () => {
    const taskData = {
      id: 999,
      title: '测试任务',
      description: '# 任务总结\\n\\n## 完成情况\\n✅ 功能开发\\n✅ 测试验证',
      project_id: 1
    };
    
    const result = await autoDocService.createDocumentFromTask(999, taskData);
    
    expect(result.success).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.documentId).toBeDefined();
  });
});
\`\`\`

### 2. 错误场景测试
\`\`\`javascript
test('处理重复文档场景', async () => {
  // 首次创建
  await autoDocService.createDocumentFromTask(998, taskData);
  
  // 重复创建应该失败
  const result = await autoDocService.createDocumentFromTask(998, taskData);
  expect(result.success).toBe(false);
  expect(result.reason).toBe('document_already_exists');
});
\`\`\`

## ✅ 交付成果

### 1. 核心代码文件
- \`AutoDocumentService.js\` - 主服务类
- \`DocumentFormatter.js\` - 内容格式化
- \`DocumentValidator.js\` - 质量验证
- \`DocumentTemplates.js\` - 模板系统
- \`AutoDocLogger.js\` - 日志记录

### 2. 配置和工具
- \`ServiceConfig.js\` - 服务配置
- \`ErrorHandler.js\` - 错误处理
- \`RetryUtils.js\` - 重试工具

## 🎯 验收标准

### 功能验收
- [ ] 文档创建成功率 > 95%
- [ ] 重复检查机制正常工作
- [ ] 内容格式化符合标准
- [ ] 错误处理完善

### 性能验收
- [ ] 单次文档创建 < 2秒
- [ ] 并发处理能力 > 10个/秒
- [ ] 内存使用合理

### 质量验收
- [ ] 生成文档格式正确
- [ ] 内容完整性保证
- [ ] 异常情况处理得当

这个自动文档创建服务将成为整个系统的核心执行引擎！`,
        estimated_hours: 1.0
      },
      {
        title: 'Phase 3: 历史数据迁移工具开发',
        description: `# Phase 3: 历史数据迁移工具开发

## 🎯 任务目标
开发HistoricalDataMigrator类，实现对所有已完成但无文档任务的批量扫描、智能筛选和批量文档创建，解决历史遗留问题。

## 📋 核心功能开发

### 1. HistoricalDataMigrator类架构设计
\`\`\`javascript
class HistoricalDataMigrator {
  constructor(taskServer, autoDocService, contentAnalyzer) {
    this.taskServer = taskServer;
    this.autoDocService = autoDocService;
    this.analyzer = contentAnalyzer;
    this.progressTracker = new MigrationProgressTracker();
    this.reportGenerator = new MigrationReportGenerator();
    
    this.config = {
      batchSize: 20,           // 批量处理大小
      maxConcurrent: 5,        // 最大并发数
      delayBetweenBatches: 1000, // 批次间延迟(ms)
      dryRun: false,           // 是否为试运行
      backupBeforeMigration: true,
      stopOnError: false       // 遇到错误是否停止
    };
    
    this.filters = {
      minDescriptionLength: 200,
      excludeStatuses: ['deleted'],
      includeProjects: null,   // null表示所有项目
      dateRange: null          // 时间范围过滤
    };
  }
}
\`\`\`

### 2. 批量扫描和筛选机制
\`\`\`javascript
async scanAndFilterTasks(options = {}) {
  this.progressTracker.start('scanning');
  
  try {
    // 1. 获取所有项目
    const projects = await this.getAllProjects();
    let allCandidates = [];
    
    // 2. 逐项目扫描已完成任务
    for (const project of projects) {
      if (this.shouldSkipProject(project, options)) continue;
      
      const projectTasks = await this.getCompletedTasksWithoutDocuments(project.id);
      allCandidates.push(...projectTasks);
      
      this.progressTracker.updateProgress('scanning', {
        currentProject: project.name,
        totalProjects: projects.length,
        candidatesFound: allCandidates.length
      });
    }
    
    // 3. 智能筛选候选任务
    const filteredTasks = await this.intelligentFilter(allCandidates);
    
    // 4. 按优先级排序
    const prioritizedTasks = this.prioritizeTasks(filteredTasks);
    
    this.progressTracker.complete('scanning', {
      totalScanned: allCandidates.length,
      candidatesFound: filteredTasks.length,
      readyForMigration: prioritizedTasks.length
    });
    
    return {
      allTasks: allCandidates,
      filteredTasks: filteredTasks,
      prioritizedTasks: prioritizedTasks,
      statistics: this.generateScanStatistics(allCandidates, filteredTasks)
    };
    
  } catch (error) {
    this.progressTracker.error('scanning', error);
    throw error;
  }
}

async getCompletedTasksWithoutDocuments(projectId) {
  // 获取项目的所有已完成任务
  const allTasks = await this.taskServer.listTasks(projectId, { 
    status: 'completed',
    page_size: 1000 
  });
  
  const candidates = [];
  
  // 检查每个任务是否已有文档
  for (const task of allTasks.tasks) {
    const hasDoc = await this.taskServer.hasTaskDocument(task.id);
    if (!hasDoc.has_document) {
      candidates.push({
        ...task,
        project_id: projectId,
        scanTime: new Date()
      });
    }
  }
  
  return candidates;
}
\`\`\`

### 3. 智能筛选算法
\`\`\`javascript
async intelligentFilter(tasks) {
  const filtered = [];
  const rejectedReasons = {};
  
  for (const task of tasks) {
    const filterResult = await this.evaluateTaskForMigration(task);
    
    if (filterResult.shouldMigrate) {
      filtered.push({
        ...task,
        migrationScore: filterResult.score,
        migrationReasons: filterResult.reasons,
        estimatedQuality: filterResult.quality
      });
    } else {
      rejectedReasons[task.id] = filterResult.rejectionReason;
    }
  }
  
  // 记录筛选结果用于报告
  this.rejectedTasks = rejectedReasons;
  
  return filtered;
}

async evaluateTaskForMigration(task) {
  // 基础过滤条件
  if (task.description.length < this.filters.minDescriptionLength) {
    return { 
      shouldMigrate: false, 
      rejectionReason: 'description_too_short',
      minRequired: this.filters.minDescriptionLength,
      actual: task.description.length
    };
  }
  
  // 排除特定状态
  if (this.filters.excludeStatuses.includes(task.status)) {
    return { 
      shouldMigrate: false, 
      rejectionReason: 'excluded_status',
      status: task.status
    };
  }
  
  // 内容质量分析
  const analysis = this.analyzer.analyzeSummaryContent(task.description);
  
  // 质量阈值检查
  if (analysis.score < 0.4) {
    return { 
      shouldMigrate: false, 
      rejectionReason: 'low_quality_content',
      score: analysis.score,
      minRequired: 0.4
    };
  }
  
  // 通过筛选
  return {
    shouldMigrate: true,
    score: analysis.score,
    quality: this.categorizeQuality(analysis.score),
    reasons: this.generateMigrationReasons(analysis),
    confidence: analysis.confidence
  };
}

categorizeQuality(score) {
  if (score >= 0.8) return 'excellent';
  if (score >= 0.6) return 'good';
  if (score >= 0.4) return 'acceptable';
  return 'poor';
}
\`\`\`

### 4. 优先级排序系统
\`\`\`javascript
prioritizeTasks(tasks) {
  return tasks.sort((a, b) => {
    // 多维度排序优先级
    const scoreA = this.calculateMigrationPriority(a);
    const scoreB = this.calculateMigrationPriority(b);
    return scoreB - scoreA; // 降序排序
  });
}

calculateMigrationPriority(task) {
  let priority = 0;
  
  // 1. 内容质量权重 (40%)
  priority += task.migrationScore * 0.4;
  
  // 2. 任务重要性权重 (30%)
  const importance = this.assessTaskImportance(task);
  priority += importance * 0.3;
  
  // 3. 时效性权重 (20%)
  const recency = this.assessTaskRecency(task);
  priority += recency * 0.2;
  
  // 4. 项目活跃度权重 (10%)
  const projectActivity = this.assessProjectActivity(task.project_id);
  priority += projectActivity * 0.1;
  
  return priority;
}

assessTaskImportance(task) {
  let importance = 0.5; // 基础重要性
  
  // Phase任务通常比较重要
  if (task.title.includes('Phase')) importance += 0.2;
  
  // 包含关键词的任务
  const importantKeywords = ['修复', '优化', '实现', '完成', '总结'];
  const matchedKeywords = importantKeywords.filter(keyword => 
    task.title.includes(keyword) || task.description.includes(keyword)
  ).length;
  importance += matchedKeywords * 0.1;
  
  // 长描述通常表示任务较重要
  if (task.description.length > 1000) importance += 0.2;
  if (task.description.length > 2000) importance += 0.1;
  
  return Math.min(importance, 1.0);
}
\`\`\`

### 5. 批量迁移执行引擎
\`\`\`javascript
async executeMigration(tasks, options = {}) {
  const mergedOptions = { ...this.config, ...options };
  this.progressTracker.start('migration');
  
  const results = {
    total: tasks.length,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    details: []
  };
  
  try {
    // 创建备份（如果启用）
    if (mergedOptions.backupBeforeMigration) {
      await this.createMigrationBackup(tasks);
    }
    
    // 分批处理
    const batches = this.createBatches(tasks, mergedOptions.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = await this.processBatch(batch, mergedOptions);
      
      // 更新总体结果
      this.mergeBatchResults(results, batchResults);
      
      // 进度报告
      this.progressTracker.updateProgress('migration', {
        batchIndex: i + 1,
        totalBatches: batches.length,
        batchSize: batch.length,
        ...results
      });
      
      // 批次间延迟
      if (i < batches.length - 1) {
        await this.delay(mergedOptions.delayBetweenBatches);
      }
    }
    
    // 生成最终报告
    const report = await this.reportGenerator.generateMigrationReport(results, tasks);
    
    this.progressTracker.complete('migration', results);
    return { success: true, results, report };
    
  } catch (error) {
    this.progressTracker.error('migration', error);
    return { success: false, error: error.message, results };
  }
}

async processBatch(tasks, options) {
  const batchResults = {
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  // 并发处理批次内的任务
  const semaphore = new Semaphore(options.maxConcurrent);
  const promises = tasks.map(task => 
    semaphore.acquire().then(async (release) => {
      try {
        const result = await this.migrateTask(task, options);
        batchResults.details.push(result);
        
        if (result.success) {
          batchResults.successful++;
        } else if (result.skipped) {
          batchResults.skipped++;
        } else {
          batchResults.failed++;
        }
        
        batchResults.processed++;
        
      } catch (error) {
        batchResults.failed++;
        batchResults.details.push({
          taskId: task.id,
          success: false,
          error: error.message
        });
        
        if (options.stopOnError) {
          throw error;
        }
      } finally {
        release();
      }
    })
  );
  
  await Promise.all(promises);
  return batchResults;
}
\`\`\`

### 6. 单任务迁移处理
\`\`\`javascript
async migrateTask(task, options) {
  const startTime = Date.now();
  
  try {
    // 试运行模式
    if (options.dryRun) {
      return {
        taskId: task.id,
        success: true,
        action: 'dry_run',
        estimatedSize: task.description.length,
        processingTime: Date.now() - startTime
      };
    }
    
    // 最终质量检查
    const finalCheck = this.analyzer.analyzeSummaryContent(task.description);
    if (!finalCheck.shouldCreateDocument) {
      return {
        taskId: task.id,
        success: false,
        skipped: true,
        reason: 'failed_final_check',
        score: finalCheck.score
      };
    }
    
    // 执行文档创建
    const docResult = await this.autoDocService.createDocumentFromTask(task.id, task, {
      source: 'historical_migration',
      migrationScore: task.migrationScore,
      migrationDate: new Date()
    });
    
    return {
      taskId: task.id,
      success: docResult.success,
      action: 'migrated',
      confidence: docResult.confidence,
      documentId: docResult.documentId,
      originalLength: task.description.length,
      formattedLength: docResult.metadata?.formattedLength,
      processingTime: Date.now() - startTime,
      error: docResult.success ? null : docResult.reason
    };
    
  } catch (error) {
    return {
      taskId: task.id,
      success: false,
      action: 'error',
      error: error.message,
      processingTime: Date.now() - startTime
    };
  }
}
\`\`\`

### 7. 进度跟踪和报告系统
\`\`\`javascript
class MigrationProgressTracker {
  constructor() {
    this.operations = new Map();
    this.listeners = [];
  }
  
  start(operationType) {
    this.operations.set(operationType, {
      status: 'running',
      startTime: new Date(),
      progress: 0,
      details: {}
    });
    this.notify(operationType, 'started');
  }
  
  updateProgress(operationType, details) {
    const operation = this.operations.get(operationType);
    if (operation) {
      operation.details = { ...operation.details, ...details };
      operation.lastUpdate = new Date();
    }
    this.notify(operationType, 'progress', details);
  }
  
  complete(operationType, finalDetails) {
    const operation = this.operations.get(operationType);
    if (operation) {
      operation.status = 'completed';
      operation.endTime = new Date();
      operation.duration = operation.endTime - operation.startTime;
      operation.finalDetails = finalDetails;
    }
    this.notify(operationType, 'completed', finalDetails);
  }
  
  notify(operationType, event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(operationType, event, data);
      } catch (error) {
        console.error('Progress listener error:', error);
      }
    });
  }
}

class MigrationReportGenerator {
  async generateMigrationReport(results, originalTasks) {
    const report = {
      summary: this.generateSummary(results),
      timeline: this.generateTimeline(results),
      taskBreakdown: this.generateTaskBreakdown(results),
      qualityAnalysis: this.generateQualityAnalysis(results, originalTasks),
      recommendations: this.generateRecommendations(results),
      nextSteps: this.generateNextSteps(results)
    };
    
    return report;
  }
  
  generateSummary(results) {
    const successRate = (results.successful / results.total * 100).toFixed(1);
    
    return {
      totalTasks: results.total,
      successful: results.successful,
      failed: results.failed,
      skipped: results.skipped,
      successRate: \`\${successRate}%\`,
      averageProcessingTime: this.calculateAverageTime(results.details),
      totalDocumentsCreated: results.successful
    };
  }
}
\`\`\`

## 🧪 测试与验证

### 1. 大规模测试
\`\`\`javascript
describe('HistoricalDataMigrator Large Scale Tests', () => {
  test('处理1000+任务的性能测试', async () => {
    const largeBatch = generateTestTasks(1000);
    const startTime = Date.now();
    
    const result = await migrator.executeMigration(largeBatch, {
      dryRun: true,
      batchSize: 50,
      maxConcurrent: 10
    });
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000); // 30秒内完成
    expect(result.success).toBe(true);
  });
});
\`\`\`

## ✅ 交付成果

### 1. 核心代码文件
- \`HistoricalDataMigrator.js\` - 主迁移引擎
- \`MigrationProgressTracker.js\` - 进度跟踪
- \`MigrationReportGenerator.js\` - 报告生成
- \`BatchProcessor.js\` - 批量处理器
- \`TaskFilter.js\` - 任务筛选器

### 2. 工具和配置
- \`MigrationConfig.js\` - 配置管理
- \`Semaphore.js\` - 并发控制
- \`BackupManager.js\` - 备份管理

## 🎯 验收标准

### 功能验收
- [ ] 能够扫描和筛选100+历史任务
- [ ] 批量迁移成功率 > 90%
- [ ] 进度跟踪准确可靠
- [ ] 报告生成完整详细

### 性能验收
- [ ] 1000个任务扫描 < 5分钟
- [ ] 100个任务迁移 < 2分钟
- [ ] 内存使用合理稳定

这个历史数据迁移工具将彻底解决遗留问题，让所有重要的历史总结得到妥善保存！`,
        estimated_hours: 0.75
      },
      {
        title: 'Phase 4: MCP接口集成与系统整合',
        description: `# Phase 4: MCP接口集成与系统整合

## 🎯 任务目标
将自动文档创建功能无缝集成到现有的MCP (Model Context Protocol) 接口中，实现任务状态更新时的自动文档创建，并确保向后兼容性。

## 📋 核心功能开发

### 1. MCP接口扩展设计
\`\`\`javascript
// 在现有 TaskMCPServer 类中集成自动文档功能
class TaskMCPServer {
  constructor() {
    // 现有初始化代码...
    
    // 新增自动文档相关组件
    this.contentAnalyzer = new TaskContentAnalyzer();
    this.autoDocService = new AutoDocumentService(this, this.contentAnalyzer);
    this.migrationTool = new HistoricalDataMigrator(this, this.autoDocService, this.contentAnalyzer);
    
    // 自动文档创建配置
    this.autoDocConfig = {
      enabled: true,
      triggerOnComplete: true,
      triggerOnStatusChange: false,
      minConfidenceThreshold: 0.6,
      respectUserPreferences: true,
      logAllOperations: true
    };
  }
}
\`\`\`

### 2. updateTask方法增强
\`\`\`javascript
async updateTask(taskId, updates) {
  try {
    console.log(\`[DEBUG] 更新任务: ID \${taskId}, 更新字段: \${Object.keys(updates).join(', ')}\`);
    
    // 获取现有任务信息（用于变更检测）
    const existingTask = await this.findTaskById(taskId);
    
    // 执行原有的任务更新逻辑
    const updateResult = await this.performTaskUpdate(taskId, updates, existingTask);
    
    if (!updateResult.success) {
      return updateResult;
    }
    
    // 检查是否需要触发自动文档创建
    const shouldTriggerAutoDoc = this.shouldTriggerAutoDocCreation(
      existingTask, 
      updates, 
      updateResult.updated_task
    );
    
    if (shouldTriggerAutoDoc) {
      const autoDocResult = await this.handleAutoDocumentCreation(
        taskId, 
        updateResult.updated_task,
        {
          trigger: shouldTriggerAutoDoc.trigger,
          previousStatus: existingTask.status,
          newStatus: updates.status,
          updateSource: 'task_update'
        }
      );
      
      // 将自动文档创建结果附加到更新结果中
      updateResult.auto_document = autoDocResult;
    }
    
    return updateResult;
    
  } catch (error) {
    console.error(\`[ERROR] 任务更新失败: \${error.message}\`);
    return { success: false, error: error.message };
  }
}

shouldTriggerAutoDocCreation(existingTask, updates, updatedTask) {
  // 检查自动文档功能是否启用
  if (!this.autoDocConfig.enabled) {
    return false;
  }
  
  // 检查是否有状态变更
  const statusChanged = updates.status && updates.status !== existingTask.status;
  
  // 触发条件1: 任务标记为完成
  if (statusChanged && updates.status === 'completed' && this.autoDocConfig.triggerOnComplete) {
    return {
      trigger: 'task_completed',
      reason: '任务状态更新为completed',
      priority: 'high'
    };
  }
  
  // 触发条件2: 描述内容发生重大变化
  if (updates.description && this.hasSignificantDescriptionChange(existingTask.description, updates.description)) {
    return {
      trigger: 'description_updated',
      reason: '任务描述发生重大变化',
      priority: 'medium'
    };
  }
  
  // 触发条件3: 其他状态变更（如果启用）
  if (statusChanged && this.autoDocConfig.triggerOnStatusChange) {
    return {
      trigger: 'status_changed',
      reason: \`任务状态从\${existingTask.status}变更为\${updates.status}\`,
      priority: 'low'
    };
  }
  
  return false;
}
\`\`\`

### 3. 自动文档创建处理器
\`\`\`javascript
async handleAutoDocumentCreation(taskId, taskData, context) {
  try {
    console.log(\`[DEBUG] 尝试为任务\${taskId}自动创建文档 (触发: \${context.trigger})\`);
    
    // 预检查：是否已存在文档
    const existingDocCheck = await this.hasTaskDocument(taskId);
    if (existingDocCheck.has_document && context.trigger !== 'description_updated') {
      return {
        success: false,
        action: 'skipped',
        reason: 'document_already_exists',
        message: '任务已存在文档，跳过自动创建'
      };
    }
    
    // 内容质量分析
    const analysis = this.contentAnalyzer.analyzeSummaryContent(taskData.description);
    
    if (!analysis.shouldCreateDocument) {
      return {
        success: false,
        action: 'skipped',
        reason: 'content_not_suitable',
        analysis: {
          score: analysis.score,
          confidence: analysis.confidence,
          recommendations: analysis.recommendations
        },
        message: \`内容质量不足以创建文档 (评分: \${analysis.score.toFixed(2)})\`
      };
    }
    
    // 置信度阈值检查
    if (analysis.confidence < this.autoDocConfig.minConfidenceThreshold) {
      return {
        success: false,
        action: 'low_confidence',
        reason: 'confidence_below_threshold',
        confidence: analysis.confidence,
        threshold: this.autoDocConfig.minConfidenceThreshold,
        message: \`置信度(\${analysis.confidence.toFixed(2)})低于阈值(\${this.autoDocConfig.minConfidenceThreshold})\`
      };
    }
    
    // 执行自动文档创建
    const docCreationResult = await this.autoDocService.createDocumentFromTask(
      taskId, 
      taskData,
      {
        source: 'auto_trigger',
        trigger: context.trigger,
        confidence: analysis.confidence,
        forceOverwrite: context.trigger === 'description_updated'
      }
    );
    
    // 记录操作日志
    this.logAutoDocOperation(taskId, context, docCreationResult);
    
    return {
      success: docCreationResult.success,
      action: docCreationResult.success ? 'document_created' : 'creation_failed',
      confidence: analysis.confidence,
      documentId: docCreationResult.documentId,
      trigger: context.trigger,
      metadata: {
        analysisScore: analysis.score,
        contentLength: taskData.description.length,
        processingTime: docCreationResult.metadata?.processingTime
      },
      message: docCreationResult.success 
        ? \`自动创建任务文档成功 (置信度: \${analysis.confidence.toFixed(2)})\`
        : \`自动创建任务文档失败: \${docCreationResult.reason}\`
    };
    
  } catch (error) {
    console.error(\`[ERROR] 自动文档创建失败: \${error.message}\`);
    return {
      success: false,
      action: 'error',
      error: error.message,
      message: \`自动文档创建出现异常: \${error.message}\`
    };
  }
}
\`\`\`

### 4. 新增自动文档管理方法
\`\`\`javascript
// 手动触发自动文档创建
async triggerAutoDocumentCreation(taskId, options = {}) {
  try {
    const task = await this.findTaskById(taskId);
    const result = await this.handleAutoDocumentCreation(taskId, task, {
      trigger: 'manual',
      reason: '用户手动触发',
      priority: 'high',
      ...options
    });
    
    return {
      success: true,
      task_id: taskId,
      auto_document_result: result,
      message: '手动触发自动文档创建完成'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: '手动触发自动文档创建失败'
    };
  }
}

// 批量自动文档创建（历史数据迁移）
async batchAutoDocumentCreation(options = {}) {
  try {
    const migrationResult = await this.migrationTool.executeMigration([], {
      dryRun: options.dryRun || false,
      batchSize: options.batchSize || 20,
      maxConcurrent: options.maxConcurrent || 5,
      ...options
    });
    
    return {
      success: migrationResult.success,
      results: migrationResult.results,
      report: migrationResult.report,
      message: \`批量迁移完成: \${migrationResult.results?.successful || 0}个成功, \${migrationResult.results?.failed || 0}个失败\`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: '批量自动文档创建失败'
    };
  }
}

// 获取自动文档创建统计
async getAutoDocumentStatistics(projectId = null) {
  try {
    const stats = await this.calculateAutoDocStats(projectId);
    return {
      success: true,
      statistics: stats,
      message: '统计信息获取成功'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: '获取统计信息失败'
    };
  }
}
\`\`\`

### 5. 配置管理和用户偏好
\`\`\`javascript
// 更新自动文档配置
async updateAutoDocumentConfig(newConfig) {
  try {
    this.autoDocConfig = {
      ...this.autoDocConfig,
      ...newConfig,
      lastUpdated: new Date()
    };
    
    // 可选：持久化配置到数据库或文件
    await this.persistAutoDocConfig(this.autoDocConfig);
    
    return {
      success: true,
      config: this.autoDocConfig,
      message: '自动文档配置更新成功'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: '配置更新失败'
    };
  }
}

// 获取当前配置
getAutoDocumentConfig() {
  return {
    success: true,
    config: this.autoDocConfig,
    message: '配置获取成功'
  };
}

// 检查重大描述变化
hasSignificantDescriptionChange(oldDescription, newDescription) {
  // 长度变化阈值
  const lengthChangeThreshold = 0.3; // 30%
  const minLengthDifference = 200; // 最小200字符差异
  
  if (!oldDescription || !newDescription) return true;
  
  const oldLength = oldDescription.length;
  const newLength = newDescription.length;
  
  // 检查长度变化
  const lengthChangeRatio = Math.abs(newLength - oldLength) / oldLength;
  if (lengthChangeRatio > lengthChangeThreshold && Math.abs(newLength - oldLength) > minLengthDifference) {
    return true;
  }
  
  // 检查内容相似性（简单实现）
  const similarity = this.calculateTextSimilarity(oldDescription, newDescription);
  return similarity < 0.7; // 70%相似度阈值
}
\`\`\`

### 6. 日志记录和监控
\`\`\`javascript
logAutoDocOperation(taskId, context, result) {
  const logEntry = {
    timestamp: new Date(),
    taskId: taskId,
    trigger: context.trigger,
    success: result.success,
    action: result.action,
    confidence: result.confidence,
    reason: result.reason || result.message,
    metadata: {
      previousStatus: context.previousStatus,
      newStatus: context.newStatus,
      updateSource: context.updateSource
    }
  };
  
  // 写入日志文件或数据库
  this.writeAutoDocLog(logEntry);
  
  // 控制台调试输出
  if (this.autoDocConfig.logAllOperations) {
    console.log(\`[AUTO-DOC] \${result.success ? '✅' : '❌'} \${logEntry.trigger} - 任务\${taskId}: \${result.message}\`);
  }
}

async calculateAutoDocStats(projectId = null) {
  // 实现统计计算逻辑
  const stats = {
    totalTasksAnalyzed: 0,
    documentsAutoCreated: 0,
    successRate: 0,
    averageConfidence: 0,
    triggersBreakdown: {
      task_completed: 0,
      description_updated: 0,
      manual: 0,
      status_changed: 0
    },
    qualityDistribution: {
      excellent: 0,
      good: 0,
      acceptable: 0,
      poor: 0
    }
  };
  
  // 从日志或数据库查询统计数据
  // ... 实现查询逻辑
  
  return stats;
}
\`\`\`

### 7. 向后兼容性保证
\`\`\`javascript
// 确保现有方法签名不变
async updateTask(taskId, updates) {
  // 调用增强版本，但保持返回格式兼容
  const result = await this.updateTaskWithAutoDoc(taskId, updates);
  
  // 为了向后兼容，只返回核心字段
  const compatibleResult = {
    success: result.success,
    changed_fields: result.changed_fields,
    updated_task: result.updated_task,
    error: result.error
  };
  
  // 自动文档信息作为可选字段
  if (result.auto_document && result.auto_document.success) {
    compatibleResult.auto_document_created = true;
    compatibleResult.document_confidence = result.auto_document.confidence;
  }
  
  return compatibleResult;
}

// 新方法提供完整信息
async updateTaskWithAutoDoc(taskId, updates) {
  // 这里是完整的实现
  return await this.updateTaskEnhanced(taskId, updates);
}
\`\`\`

## 🧪 集成测试

### 1. 自动触发测试
\`\`\`javascript
describe('MCP Auto Document Integration Tests', () => {
  test('任务完成时自动创建文档', async () => {
    // 创建一个有丰富描述的任务
    const task = await taskServer.createTask('测试任务', 1);
    await taskServer.updateTask(task.id, {
      description: '# 详细总结\\n\\n## 完成情况\\n✅ 功能实现\\n✅ 测试通过'
    });
    
    // 标记为完成，应该触发自动文档创建
    const result = await taskServer.updateTask(task.id, { status: 'completed' });
    
    expect(result.success).toBe(true);
    expect(result.auto_document_created).toBe(true);
    expect(result.document_confidence).toBeGreaterThan(0.6);
  });
});
\`\`\`

## ✅ 交付成果

### 1. 集成代码文件
- \`TaskMCPServer_Enhanced.js\` - 增强的MCP服务器
- \`AutoDocIntegration.js\` - 集成逻辑
- \`ConfigManager.js\` - 配置管理
- \`CompatibilityLayer.js\` - 兼容性保证

### 2. 配置和文档
- \`AutoDocConfig.json\` - 默认配置
- \`IntegrationGuide.md\` - 集成指南
- \`APIChanges.md\` - API变更说明

## 🎯 验收标准

### 功能验收
- [ ] 任务状态更新正常触发自动文档创建
- [ ] 手动触发接口工作正常
- [ ] 批量迁移功能集成正确
- [ ] 配置管理功能完善

### 兼容性验收
- [ ] 现有API调用方式完全兼容
- [ ] 性能影响 < 10%
- [ ] 错误处理不影响原有功能

### 集成验收
- [ ] 与前端界面无缝对接
- [ ] 日志记录完整准确
- [ ] 监控指标正常

这个MCP集成将使自动文档创建功能成为系统的原生能力！`,
        estimated_hours: 0.5
      }
    ];

    console.log('📝 开始创建Phase子任务...\n');

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      console.log(`${i + 1}. 创建子任务: ${phase.title}`);
      
      const result = await taskServer.createTask(phase.title, 1);
      if (result.success) {
        const updateResult = await taskServer.updateTask(result.id, {
          parent_id: 206, // 父任务206
          description: phase.description
        });
        
        if (updateResult.success) {
          console.log(`   ✅ 子任务${result.id}创建成功`);
          console.log(`   📝 预估工时: ${phase.estimated_hours}小时`);
        } else {
          console.log(`   ❌ 子任务${result.id}更新失败: ${updateResult.error}`);
        }
      } else {
        console.log(`   ❌ 子任务创建失败: ${result.error}`);
      }
      
      // 避免过快创建任务
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🎉 所有Phase子任务创建完成！');
    console.log('📋 总预估工时: 3小时 (AI超人类效能)');
    console.log('🎯 父任务: 206 - 智能任务文档自动化管理系统');
    console.log('🔗 父任务的父级: 129 - 31周-04：文档管理功能2.0');
    console.log('\n每个Phase都包含了详细的技术实现prompts，可以立即开始开发！');
    
  } catch (error) {
    console.error('❌ 创建子任务失败:', error.message);
  }
}

createPhaseSubtasks();