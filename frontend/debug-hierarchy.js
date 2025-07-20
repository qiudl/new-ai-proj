// 测试任务层级显示的调试脚本
// 在浏览器控制台中运行此脚本来检查层级样式

console.log('🔍 检查任务层级样式应用情况...');

// 检查CSS文件是否正确加载
const checkCSSLoaded = () => {
  const stylesheets = Array.from(document.styleSheets);
  const hasHierarchyStyles = stylesheets.some(sheet => {
    try {
      const rules = Array.from(sheet.cssRules || sheet.rules || []);
      return rules.some(rule => rule.cssText && rule.cssText.includes('task-hierarchy-item'));
    } catch (e) {
      return false;
    }
  });
  
  console.log(hasHierarchyStyles ? '✅ CSS样式已加载' : '❌ CSS样式未加载');
  return hasHierarchyStyles;
};

// 检查任务行的层级类名
const checkTaskRows = () => {
  const taskRows = document.querySelectorAll('tr.task-hierarchy-item');
  console.log(`📊 找到 ${taskRows.length} 个任务行`);
  
  taskRows.forEach((row, index) => {
    const classList = Array.from(row.classList);
    const depthClass = classList.find(cls => cls.startsWith('depth-'));
    const depth = depthClass ? depthClass.replace('depth-', '') : '0';
    
    const taskNameElement = row.querySelector('.task-name-with-indent');
    const indentElement = row.querySelector('.task-indent-space');
    const indentWidth = indentElement ? indentElement.style.width : 'N/A';
    
    const taskTitle = row.querySelector('td')?.textContent?.trim() || 'Unknown';
    
    console.log(`  任务 ${index + 1}: "${taskTitle}"`);
    console.log(`    层级深度: ${depth}`);
    console.log(`    CSS类: ${classList.join(', ')}`);
    console.log(`    缩进宽度: ${indentWidth}`);
    console.log(`    背景色: ${getComputedStyle(row).backgroundColor}`);
    console.log(`    左边框: ${getComputedStyle(row).borderLeft}`);
    console.log('    ---');
  });
};

// 检查缩进元素
const checkIndentElements = () => {
  const indentElements = document.querySelectorAll('.task-indent-space');
  console.log(`📐 找到 ${indentElements.length} 个缩进元素`);
  
  indentElements.forEach((element, index) => {
    const width = element.style.width;
    const computedStyle = getComputedStyle(element);
    console.log(`  缩进 ${index + 1}: 设置宽度=${width}, 计算宽度=${computedStyle.width}`);
  });
};

// 检查深度指示器
const checkDepthIndicators = () => {
  const indicators = document.querySelectorAll('.task-depth-indicator');
  console.log(`🎨 找到 ${indicators.length} 个深度指示器`);
  
  indicators.forEach((indicator, index) => {
    const classList = Array.from(indicator.classList);
    const depthClass = classList.find(cls => cls.startsWith('depth-'));
    const computedStyle = getComputedStyle(indicator);
    
    console.log(`  指示器 ${index + 1}: ${depthClass}`);
    console.log(`    背景色: ${computedStyle.backgroundColor}`);
    console.log(`    宽度x高度: ${computedStyle.width} x ${computedStyle.height}`);
  });
};

// 运行所有检查
const runAllChecks = () => {
  console.clear();
  console.log('🚀 开始检查任务层级样式...\n');
  
  checkCSSLoaded();
  console.log('');
  
  checkTaskRows();
  console.log('');
  
  checkIndentElements();
  console.log('');
  
  checkDepthIndicators();
  console.log('');
  
  console.log('✅ 检查完成！');
  
  // 提供修复建议
  const taskRows = document.querySelectorAll('tr.task-hierarchy-item');
  const depthRows = document.querySelectorAll('tr.task-hierarchy-item[class*="depth-"]');
  
  if (taskRows.length === 0) {
    console.warn('⚠️ 没有找到任务行，请确保页面已加载任务数据');
  } else if (depthRows.length === 0) {
    console.warn('⚠️ 没有找到层级任务，可能需要展开父任务或创建子任务');
  } else {
    console.log(`🎉 找到 ${depthRows.length} 个层级任务，层级样式应该已生效！`);
  }
};

// 自动运行检查
runAllChecks();

// 提供手动运行函数
window.checkTaskHierarchy = runAllChecks;