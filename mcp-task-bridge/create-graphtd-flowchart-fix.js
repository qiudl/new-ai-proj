import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function createGraphTDFlowchartFix() {
  console.log('🚀 创建子任务：修复TaskDocumentEditor中GraphTD流程图预览问题');
  
  const parentId = 442; // 第32周工作安排
  const title = "修复TaskDocumentEditor中GraphTD流程图预览问题";
  
  const description = `# 修复TaskDocumentEditor中GraphTD流程图预览问题

## 问题描述
当前TaskDocumentEditor中的GraphTD流程图无法正常预览，只能显示代码而不能渲染图形。用户无法直观地查看流程图，影响了任务文档的可视化效果。

## 任务目标
为TaskDocumentEditor添加流程图渲染支持，使用户能够在编辑器中预览和查看各种类型的流程图。

## 技术要求

### 1. 流程图类型支持
- **Mermaid图表**：支持流程图、时序图、甘特图等
- **GraphTD语法**：确保现有GraphTD语法兼容
- **通用图表**：支持其他常见的图表库

### 2. 实现方案
- 集成Mermaid.js库到TaskDocumentEditor组件
- 添加图表预览模式切换功能
- 实现代码编辑和图形预览的双视图模式
- 添加图表渲染错误处理机制

### 3. 用户体验
- 提供编辑/预览模式切换按钮
- 支持实时预览功能
- 添加图表加载状态指示
- 优化渲染性能，避免频繁重渲染

### 4. 技术实现细节
- 安装和配置mermaid依赖包
- 修改TaskDocumentEditor组件结构
- 添加图表解析和渲染逻辑
- 实现GraphTD到Mermaid语法的转换（如需要）
- 添加CSS样式支持图表显示

## 验收标准
1. ✅ 用户可以在TaskDocumentEditor中正常预览Mermaid流程图
2. ✅ GraphTD语法能够正确解析和渲染
3. ✅ 提供编辑/预览模式切换功能
4. ✅ 图表渲染错误时显示友好的错误信息
5. ✅ 渲染性能良好，不影响编辑器响应速度

## 相关文件
- frontend/src/components/TaskDocumentEditor.tsx
- frontend/package.json (添加mermaid依赖)
- frontend/src/styles/TaskDocumentEditor.css

## 预估工时
2-3小时

## 优先级
Medium - 提升用户体验的重要功能

## 标签
- frontend
- ui-enhancement
- documentation
- flowchart`;

  try {
    // 创建子任务
    const result = await taskServer.createSubTask(parentId, {
      title: title,
      description: description,
      priority: 'medium',
      estimated_hours: 3,
      status: 'todo',
      tags: ['frontend', 'ui-enhancement', 'documentation', 'flowchart']
    });
    
    if (result.success) {
      console.log(`✅ 子任务创建成功: ID ${result.id}`);
      console.log(`🎯 任务 "${title}" 创建完成！`);
      console.log(`📋 任务详情:`);
      console.log(`   - ID: ${result.id}`);
      console.log(`   - 父任务: ${parentId} (第32周工作安排)`);
      console.log(`   - 优先级: ${result.priority}`);
      console.log(`   - 预估工时: ${result.estimated_hours}小时`);
      console.log(`   - 状态: ${result.status}`);
      
      return {
        success: true,
        taskId: result.id,
        title: title,
        parentId: parentId
      };
    } else {
      console.log(`❌ 子任务创建失败: ${result.error}`);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.log(`❌ 执行失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

createGraphTDFlowchartFix()
  .then(result => {
    console.log('\n📋 创建结果:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });