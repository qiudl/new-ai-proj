#!/usr/bin/env node

console.log('🐛 Mermaid系统调试脚本');
console.log('==============================\n');

console.log('📋 问题分析：');
console.log('- 测试页面：Mermaid渲染正常');
console.log('- 系统任务：Mermaid仍显示加载中');
console.log('- 需要：对比两者差异找出根本原因\n');

console.log('🔍 可能的差异点：\n');

console.log('1. **Mermaid库加载方式差异**：');
console.log('   测试页面：<script src="https://unpkg.com/mermaid@10.9.1/dist/mermaid.min.js"></script>');
console.log('   系统页面：可能通过React组件加载，存在异步问题\n');

console.log('2. **初始化时机差异**：');
console.log('   测试页面：DOMContentLoaded后统一初始化');
console.log('   系统页面：React useEffect中初始化，可能存在竞态条件\n');

console.log('3. **渲染触发方式差异**：');
console.log('   测试页面：mermaid.run()直接渲染所有.mermaid元素');
console.log('   系统页面：MarkdownRenderer异步渲染单个图表\n');

console.log('4. **DOM更新时机差异**：');
console.log('   测试页面：静态HTML，图表容器预存在');
console.log('   系统页面：React动态渲染，可能存在DOM更新竞态\n');

console.log('🛠️ 调试策略：\n');

console.log('**Step 1: 检查系统页面的Mermaid库加载**');
console.log('- 在浏览器控制台执行：typeof window.mermaid');
console.log('- 确认mermaid对象是否存在\n');

console.log('**Step 2: 检查MarkdownRenderer组件状态**');
console.log('- 查找console.log输出："🎨 [MarkdownRenderer] 开始渲染 Mermaid 图表"');
console.log('- 确认renderMermaid函数是否被调用\n');

console.log('**Step 3: 检查mermaidUtils.ts执行情况**');
console.log('- 查找console.log输出："✅ [MermaidUtils] Mermaid 库初始化成功"');
console.log('- 确认ensureMermaidReady()是否成功\n');

console.log('**Step 4: 检查超时保护机制**');
console.log('- 等待5秒看是否有："⚠️ [MarkdownRenderer] Mermaid 渲染超时"');
console.log('- 确认超时保护是否触发\n');

console.log('**Step 5: 比较React环境与静态HTML环境**');
console.log('- React：复杂的组件生命周期和状态管理');
console.log('- HTML：简单的脚本执行和DOM操作\n');

console.log('🎯 预期发现：\n');

console.log('最可能的原因：');
console.log('1. **React严格模式**：useEffect可能执行两次，导致初始化冲突');
console.log('2. **异步状态竞争**：setIsLoading状态更新与渲染不同步');
console.log('3. **DOM引用失效**：ref.current在渲染过程中可能变为null');
console.log('4. **Mermaid版本差异**：系统和测试页面使用不同版本的mermaid');
console.log('5. **CSS样式冲突**：系统页面CSS可能影响mermaid渲染\n');

console.log('📱 下一步行动：');
console.log('1. 访问具体的任务页面（如任务631）');
console.log('2. 打开浏览器开发者工具');
console.log('3. 观察Console输出的调试信息');
console.log('4. 检查Network面板的mermaid库加载');
console.log('5. 对比Elements面板中的DOM结构\n');

console.log('🔧 临时解决方案：');
console.log('如果发现是React特有问题，可以考虑：');
console.log('- 使用useRef避免重复初始化');
console.log('- 添加useCallback优化渲染函数');
console.log('- 实现组件卸载时的清理逻辑');
console.log('- 考虑将mermaid渲染移到useLayoutEffect中\n');

console.log('✅ 调试脚本准备完毕，请在浏览器中执行上述检查步骤');