const path = require('path');

// 测试CSS文件是否可以被找到
const cssFiles = [
  'react-grid-layout/css/styles.css',
  'react-resizable/css/styles.css'
];

console.log('🔍 测试CSS文件解析...');

cssFiles.forEach(cssFile => {
  try {
    const fullPath = require.resolve(cssFile);
    console.log(`✅ ${cssFile} -> ${fullPath}`);
  } catch (error) {
    console.log(`❌ ${cssFile} -> 无法解析: ${error.message}`);
  }
});

// 测试模块解析
const modules = ['react-grid-layout', 'react-resizable'];
modules.forEach(mod => {
  try {
    const modulePath = require.resolve(mod);
    console.log(`📦 ${mod} -> ${modulePath}`);
  } catch (error) {
    console.log(`❌ ${mod} -> 无法解析: ${error.message}`);
  }
});

console.log('✅ 测试完成！');
