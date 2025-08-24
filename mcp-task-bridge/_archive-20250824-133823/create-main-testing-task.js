import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function createMainTestingTask() {
  try {
    console.log('🚀 Creating main testing task under task 200...');
    
    const title = "测试验收与质量保证";
    const projectId = 1;
    const options = {
      parent_id: 200,
      status: "todo",
      priority: "high",
      description: `# 测试验收与质量保证

## 任务概述
对任务文档重构项目（任务200）的各个子模块进行全面的测试验收与质量保证工作，确保所有功能模块的稳定性、性能和用户体验达到预期标准。

## 验收标准
### 1. 功能完整性验收
- 所有已实现功能均能正常运行
- 业务流程完整且逻辑正确
- 异常情况处理得当

### 2. 性能验收标准
- API响应时间 < 500ms (95%请求)
- 数据库查询优化达标
- 前端页面加载时间 < 2秒
- 大数据量处理能力验证

### 3. 质量保证标准
- 代码覆盖率 ≥ 80%
- 无严重和高危安全漏洞
- 用户体验流畅度评分 ≥ 8/10
- 文档完整性和准确性验证

## 测试范围
### 包含以下子模块的全面测试：
1. **数据库迁移与表创建 (任务201)** - 已完成，需验收
2. **后端API重构 (任务202)** - 已完成，需验收  
3. **前端服务整合 (任务203)** - 进行中，需持续测试
4. **功能增强与测试 (任务204)** - 待开始，需制定测试计划

## 测试方法论
### 测试类型覆盖：
- **单元测试**: 核心功能模块测试
- **集成测试**: 模块间接口和数据流测试
- **系统测试**: 端到端业务流程测试
- **性能测试**: 压力测试和负载测试
- **安全测试**: 权限控制和数据安全测试
- **用户验收测试**: 实际使用场景验证

## 交付标准
### 每个子模块测试完成后需提供：
1. **测试报告**: 详细的测试执行结果
2. **问题清单**: 发现的bug和改进建议
3. **性能报告**: 关键指标的测试数据
4. **验收确认**: 功能是否达到预期标准
5. **文档更新**: 用户手册和技术文档更新

## 时间计划
- **预估总工时**: 16小时
- **并行测试**: 多模块可同步进行测试
- **迭代优化**: 基于测试结果进行优化迭代

## 风险评估
### 潜在风险：
- 数据迁移可能存在数据完整性风险
- API重构可能影响现有功能稳定性
- 前端整合可能引入用户体验问题
- 新功能开发可能存在兼容性问题

### 缓解措施：
- 详细的测试用例设计
- 完备的回归测试
- 分阶段验收和部署
- 充分的备份和回滚机制`,
      custom_fields: {
        estimated_hours: 16
      }
    };
    
    const result = await taskServer.createTask(title, projectId, options);
    
    if (result.success) {
      console.log('✅ Successfully created main testing task:');
      console.log(`   任务ID: ${result.id}`);
      console.log(`   标题: ${result.title}`);
      console.log(`   状态: ${result.status}`);
      console.log(`   优先级: ${result.priority}`);
      console.log(`   消息: ${result.message}`);
      
      return result.id;
    } else {
      throw new Error('Task creation failed');
    }
    
  } catch (error) {
    console.error('❌ Failed to create main testing task:', error.message);
    throw error;
  }
}

createMainTestingTask();