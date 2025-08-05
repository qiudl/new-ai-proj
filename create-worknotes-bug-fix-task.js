import('./mcp-task-bridge/task-mcp.js').then(async ({ TaskMCPServer }) => {
  const taskServer = new TaskMCPServer();
  try {
    const result = await taskServer.createSubTask(397, {
      title: '修复工作笔记页面webpack模块加载错误',
      description: `# 修复工作笔记页面webpack模块加载错误

## 🐛 问题描述
工作笔记页面(DocumentManagerPage.tsx)出现TypeError错误：
\`\`\`
TypeError: Cannot read properties of undefined (reading 'call')
    at __webpack_require__ (http://localhost/static/js/bundle.js:133666:32)
    at fn (http://localhost/static/js/bundle.js:133942:21)
    at ./src/pages/DocumentManagerPage.tsx (http://localhost/static/js/src_pages_DocumentManagerPage_tsx.chunk.js:2046:62)
\`\`\`

## 🔍 错误分析
这是一个典型的webpack模块加载错误，可能的原因包括：
1. **模块导入路径错误** - DocumentManagerPage.tsx中某个导入路径不正确
2. **循环依赖** - 组件间存在循环引用导致模块加载失败
3. **Missing默认导出** - 某个导入的模块缺少默认导出
4. **TypeScript编译问题** - 类型定义或编译配置异常
5. **依赖模块未正确安装** - node_modules中缺少某个依赖

## 🛠️ 修复计划

### 1. 检查导入语句
- 验证DocumentManagerPage.tsx中所有import语句
- 检查导入路径的正确性
- 确认导入的组件是否正确导出

### 2. 分析模块依赖
- 检查是否存在循环依赖
- 使用dependency图分析工具
- 验证组件导出方式（默认导出vs命名导出）

### 3. TypeScript编译验证
- 运行\`npm run type-check\`检查类型错误
- 验证tsconfig.json配置
- 检查接口定义和类型声明

### 4. 依赖检查
- 验证package.json中的依赖项
- 检查node_modules安装状态
- 重新安装可能缺失的依赖

## ✅ 验收标准
- [ ] 工作笔记页面可以正常加载
- [ ] 无JavaScript运行时错误
- [ ] 所有功能正常工作
- [ ] TypeScript编译无错误
- [ ] 浏览器控制台无错误信息

## 🎯 优先级
**高** - 影响核心功能，需要立即修复

## ⏱️ 预估工时
2-4小时`,
      priority: 'high',
      estimated_hours: 3,
      status: 'todo',
      tags: ['32周', 'bug修复', 'webpack', '前端', '工作笔记']
    });
    
    if (result.success) {
      console.log('✅ 子任务创建成功！');
      console.log('任务ID:', result.id);
      console.log('任务标题:', result.title || '修复工作笔记页面webpack模块加载错误');
      console.log('父任务ID:', 397);
      console.log('优先级:', result.priority || 'high');
    } else {
      console.log('❌ 子任务创建失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
});