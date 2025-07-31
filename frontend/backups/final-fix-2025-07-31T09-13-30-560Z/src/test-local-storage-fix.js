// 测试本地存储修复的脚本
// 在浏览器控制台中运行此脚本

console.log('🧪 测试UnifiedDocumentService本地存储修复');

// 清除之前的本地存储数据（可选）
localStorage.removeItem('mock_documents');

// 模拟测试
async function testLocalStorageFix() {
  try {
    // 导入服务（在实际环境中）
    // import unifiedDocumentService from './services/unifiedDocumentService';
    
    console.log('1. 测试创建文档...');
    
    // 创建测试文档
    const testDoc = {
      title: '测试文档 - 本地存储修复',
      content: '这是测试本地存储修复的文档内容',
      type: 'markdown',
      status: 'draft',
      description: '测试本地存储功能',
      tags: ['test', 'local-storage'],
      visibility: 'private',
      is_template: false
    };
    
    // 由于API不可用，这会触发mock数据创建和本地存储
    // const created = await unifiedDocumentService.createDocument(testDoc);
    // console.log('✅ 创建成功:', created);
    
    console.log('2. 测试获取文档列表...');
    
    // 获取文档列表 - 应该返回刚创建的文档
    // const documents = await unifiedDocumentService.getDocuments();
    // console.log('✅ 获取列表:', documents);
    
    console.log('3. 检查本地存储...');
    
    // 直接检查localStorage
    const storedDocs = localStorage.getItem('mock_documents');
    if (storedDocs) {
      const parsedDocs = JSON.parse(storedDocs);
      console.log('✅ 本地存储中的文档:', parsedDocs);
      console.log(`📊 共有 ${parsedDocs.length} 个文档`);
    } else {
      console.log('❌ 本地存储为空');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return false;
  }
}

// 手动测试步骤说明
console.log('📋 手动测试步骤:');
console.log('1. 在文档管理页面创建一个新文档');
console.log('2. 观察控制台是否出现 "Document API not available, using local mock data" 警告');
console.log('3. 检查文档是否被保存到localStorage');
console.log('4. 刷新页面，检查文档列表是否显示之前创建的文档');
console.log('5. 在控制台运行: localStorage.getItem("mock_documents")');

// 清理函数
window.clearMockDocuments = function() {
  localStorage.removeItem('mock_documents');
  console.log('🧹 已清理本地mock文档数据');
};

// 查看当前存储的文档
window.viewMockDocuments = function() {
  const stored = localStorage.getItem('mock_documents');
  if (stored) {
    const docs = JSON.parse(stored);
    console.log('📄 当前存储的mock文档:', docs);
    return docs;
  } else {
    console.log('📄 没有存储的mock文档');
    return [];
  }
};

console.log('🛠️ 调试工具已加载:');
console.log('  clearMockDocuments() - 清理本地数据');
console.log('  viewMockDocuments() - 查看当前数据');

// 运行测试
testLocalStorageFix();