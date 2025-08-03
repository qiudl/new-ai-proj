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

## 📋 核心开发任务

### 1. TaskContentAnalyzer类设计
- 实现关键词检测算法：总结类、结构类、技术类、流程类关键词识别
- 配置权重系统：长度(0.2)、关键词(0.3)、结构(0.25)、技术(0.25)
- 设定阈值：最小长度300字符、最小评分0.6、高置信度0.8

### 2. 内容分析核心算法
- analyzeSummaryContent方法：综合评估任务描述质量
- calculateWeightedScore方法：多维度加权评分计算
- calculateConfidence方法：置信度评估算法
- generateRecommendations方法：改进建议生成

### 3. 各维度分析实现
- 长度分析：基于字符数的质量评估
- 关键词分析：多类别关键词匹配和加权
- 结构化分析：Markdown格式、列表、代码块识别
- 技术内容分析：代码片段、API调用、技术术语检测

### 4. 性能优化
- 单次分析响应时间 < 50ms
- 批量分析1000个任务 < 5秒
- 内存使用稳定，无泄漏

## 🧪 测试要求
- 单元测试覆盖率 > 90%
- 性能基准测试
- 多种内容类型测试用例

## ✅ 交付标准
- 准确识别高质量总结内容 (准确率 > 90%)
- 过滤简短无意义描述 (准确率 > 95%)
- 置信度计算与人工判断一致性 > 85%

预估工时: 45分钟 (AI超人类效能)`,
        estimated_hours: 0.75
      },
      {
        title: 'Phase 2: 自动文档创建服务开发',
        description: `# Phase 2: 自动文档创建服务开发

## 🎯 任务目标
开发AutoDocumentService类，实现从任务描述到正式文档的自动转换，包括内容格式化、文档创建、去重验证等核心功能。

## 📋 核心开发任务

### 1. AutoDocumentService类架构
- 主流程：createDocumentFromTask方法实现
- 依赖注入：TaskMCPServer、ContentAnalyzer、DocumentFormatter
- 配置管理：重试机制、超时控制、质量检查开关

### 2. 文档创建主流程
- 内容分析：调用智能检测引擎评估内容质量
- 重复检查：避免重复创建已存在的文档
- 内容格式化：应用模板系统生成标准文档
- 质量验证：确保生成的文档符合质量标准
- 文档创建：调用MCP接口实际创建文档

### 3. 重复文档处理
- checkDuplicateDocument：检测已存在文档
- handleDuplicateDocument：支持合并、版本、覆盖模式
- 用户决策支持：提供操作选项让用户选择

### 4. 内容格式化系统
- 模板选择：根据任务类型选择合适模板
- 变量替换：动态填充任务信息到模板
- 内容增强：添加元数据、优化结构、生成导航

### 5. 文档模板系统
- 技术总结模板：适用于包含代码的技术任务
- 结构化模板：适用于有清晰结构的任务
- Phase模板：专用于阶段性任务
- 通用模板：兜底方案

### 6. 错误处理机制
- 重试机制：指数退避算法
- 超时控制：防止长时间阻塞
- 异常恢复：优雅处理各种错误情况

## 🧪 测试要求
- 端到端测试：完整创建流程验证
- 错误场景测试：各种异常情况处理
- 性能测试：并发处理能力验证

## ✅ 交付标准
- 文档创建成功率 > 95%
- 单次创建响应时间 < 2秒
- 并发处理能力 > 10个/秒
- 生成文档格式规范正确

预估工时: 60分钟 (AI超人类效能)`,
        estimated_hours: 1.0
      },
      {
        title: 'Phase 3: 历史数据迁移工具开发',
        description: `# Phase 3: 历史数据迁移工具开发

## 🎯 任务目标
开发HistoricalDataMigrator类，实现对所有已完成但无文档任务的批量扫描、智能筛选和批量文档创建，解决历史遗留问题。

## 📋 核心开发任务

### 1. 批量扫描系统
- scanAndFilterTasks：扫描所有项目的已完成任务
- getCompletedTasksWithoutDocuments：获取无文档的完成任务
- 进度跟踪：实时显示扫描进度
- 项目过滤：支持选择性扫描特定项目

### 2. 智能筛选算法
- intelligentFilter：基于多维度评估筛选任务
- evaluateTaskForMigration：单任务迁移价值评估
- 筛选条件：长度阈值、状态排除、质量评分
- 拒绝原因记录：详细记录不适合迁移的原因

### 3. 优先级排序系统
- prioritizeTasks：多维度优先级排序
- calculateMigrationPriority：综合优先级计算
- 评估维度：内容质量(40%)、任务重要性(30%)、时效性(20%)、项目活跃度(10%)
- assessTaskImportance：任务重要性评估算法

### 4. 批量迁移执行引擎
- executeMigration：主执行流程
- processBatch：批次处理逻辑
- 并发控制：信号量机制限制并发数
- 错误隔离：单个失败不影响整体进度

### 5. 进度跟踪系统
- MigrationProgressTracker：实时进度监控
- 操作状态：scanning、migration、completed、error
- 进度通知：支持监听器模式
- 详细反馈：当前处理项目、批次、成功失败统计

### 6. 报告生成系统
- MigrationReportGenerator：详细报告生成
- 统计摘要：总任务数、成功率、处理时间
- 质量分析：迁移任务质量分布
- 改进建议：基于结果的优化建议

### 7. 备份和回滚
- createMigrationBackup：迁移前数据备份
- 操作日志：详细记录所有操作
- 回滚支持：出错时的恢复机制

## 🧪 测试要求
- 大规模测试：1000+任务处理验证
- 性能测试：批量操作响应时间
- 并发测试：多任务并发处理能力
- 错误恢复测试：异常情况处理

## ✅ 交付标准
- 扫描1000个任务 < 5分钟
- 迁移100个任务 < 2分钟
- 批量迁移成功率 > 90%
- 内存使用稳定合理

预估工时: 45分钟 (AI超人类效能)`,
        estimated_hours: 0.75
      },
      {
        title: 'Phase 4: MCP接口集成与系统整合',
        description: `# Phase 4: MCP接口集成与系统整合

## 🎯 任务目标
将自动文档创建功能无缝集成到现有的MCP接口中，实现任务状态更新时的自动文档创建，并确保向后兼容性。

## 📋 核心开发任务

### 1. MCP接口扩展
- TaskMCPServer类增强：集成自动文档组件
- 配置系统：autoDocConfig配置管理
- 组件初始化：ContentAnalyzer、AutoDocService、MigrationTool集成

### 2. updateTask方法增强
- shouldTriggerAutoDocCreation：触发条件判断
- handleAutoDocumentCreation：自动文档创建处理
- 变更检测：识别状态变更和重大描述变化
- 结果集成：将自动文档结果附加到更新响应

### 3. 触发机制设计
- 任务完成触发：status更新为completed时自动创建
- 描述更新触发：重大内容变化时触发创建
- 状态变更触发：可配置的其他状态变更
- 手动触发：提供手动触发接口

### 4. 新增管理接口
- triggerAutoDocumentCreation：手动触发接口
- batchAutoDocumentCreation：批量迁移接口
- getAutoDocumentStatistics：统计信息接口
- updateAutoDocumentConfig：配置管理接口

### 5. 向后兼容保证
- API签名保持不变
- 返回格式兼容
- 可选字段扩展：auto_document_created、document_confidence
- 性能影响控制：< 10%性能开销

### 6. 配置和偏好管理
- 用户偏好支持：个性化配置
- 动态配置：运行时配置更新
- 阈值调优：置信度、质量阈值可调
- 功能开关：启用/禁用控制

### 7. 监控和日志
- 操作日志：详细记录所有自动创建操作
- 性能监控：响应时间、成功率统计
- 错误跟踪：异常情况记录和分析
- 统计报告：定期生成使用统计

### 8. 重大变化检测
- hasSignificantDescriptionChange：内容变化检测
- 长度变化阈值：30%变化或200字符差异
- 内容相似性：70%相似度阈值
- calculateTextSimilarity：文本相似度计算

## 🧪 集成测试要求
- 自动触发测试：状态变更触发验证
- 兼容性测试：现有API调用方式验证
- 性能测试：集成后性能影响评估
- 错误处理测试：异常情况下的系统稳定性

## ✅ 交付标准
- 任务状态更新正常触发自动文档创建
- 现有API调用方式完全兼容
- 性能影响 < 10%
- 错误处理不影响原有功能
- 日志记录完整准确

预估工时: 30分钟 (AI超人类效能)`,
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