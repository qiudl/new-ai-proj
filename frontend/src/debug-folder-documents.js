// 调试文件夹文档问题的脚本
// 在浏览器控制台中运行

console.log('🔍 调试文件夹文档问题');

// 1. 检查本地存储的文档
function checkLocalDocuments() {
  const stored = localStorage.getItem('mock_documents');
  if (stored) {
    const docs = JSON.parse(stored);
    console.log('📄 本地存储的文档:', docs);
    console.log('📊 文档数量:', docs.length);
    
    // 检查文档的folder_id分布
    const folderIds = docs.map(doc => doc.folder_id);
    const uniqueFolderIds = [...new Set(folderIds)];
    console.log('📁 文档的文件夹ID分布:', uniqueFolderIds);
    
    // 按文件夹分组显示
    uniqueFolderIds.forEach(folderId => {
      const docsInFolder = docs.filter(doc => doc.folder_id === folderId);
      console.log(`📁 文件夹ID ${folderId}: ${docsInFolder.length} 个文档`, docsInFolder.map(d => d.title));
    });
    
    return docs;
  } else {
    console.log('❌ 没有本地存储的文档');
    return [];
  }
}

// 2. 模拟API调用
function simulateGetDocuments(folderId) {
  const docs = checkLocalDocuments();
  if (folderId !== undefined) {
    const filtered = docs.filter(doc => doc.folder_id === folderId);
    console.log(`🔍 获取文件夹 ${folderId} 的文档:`, filtered);
    return filtered;
  }
  return docs;
}

// 3. 创建测试文档（带文件夹ID）
function createTestDocumentWithFolder(folderId) {
  const testDoc = {
    id: Date.now(),
    folder_id: folderId,
    title: `测试文档-文件夹${folderId}`,
    content: '这是一个测试文档',
    type: 'markdown',
    status: 'draft',
    description: `属于文件夹${folderId}的测试文档`,
    tags: ['test', 'folder'],
    owner_id: 1,
    visibility: 'private',
    version: 1,
    is_template: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 1,
    owner_name: 'Current User',
    can_edit: true,
    can_share: true
  };
  
  // 保存到localStorage
  const stored = localStorage.getItem('mock_documents');
  const docs = stored ? JSON.parse(stored) : [];
  docs.push(testDoc);
  localStorage.setItem('mock_documents', JSON.stringify(docs));
  
  console.log(`✅ 创建了测试文档到文件夹${folderId}:`, testDoc);
  return testDoc;
}

// 4. 检查后端API状态
async function checkBackendAPI() {
  try {
    console.log('🌐 检查后端API状态...');
    
    // 测试根文档API
    const response1 = await fetch('/api/v1/documents');
    console.log('📡 /documents API状态:', response1.status);
    
    // 测试带folder_id的API
    const response2 = await fetch('/api/v1/documents?folder_id=1');
    console.log('📡 /documents?folder_id=1 API状态:', response2.status);
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('📊 API返回的文档数据:', data1);
    }
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('📊 API返回的文件夹1文档:', data2);
    }
    
  } catch (error) {
    console.log('❌ 后端API不可用:', error.message);
    console.log('💡 这就是为什么使用本地存储的原因');
  }
}

// 5. 运行完整诊断
async function runDiagnosis() {
  console.log('='.repeat(50));
  console.log('🏥 文件夹文档问题诊断');
  console.log('='.repeat(50));
  
  // 检查本地文档
  console.log('\n1. 检查本地存储...');
  checkLocalDocuments();
  
  // 检查后端API
  console.log('\n2. 检查后端API...');
  await checkBackendAPI();
  
  // 测试文件夹过滤
  console.log('\n3. 测试文件夹过滤...');
  simulateGetDocuments(1);
  simulateGetDocuments(2);
  simulateGetDocuments(undefined);
  
  console.log('\n4. 问题总结:');
  console.log('如果本地存储的文档没有正确的folder_id，');
  console.log('选择文件夹时会过滤出空数组。');
  
  console.log('\n5. 解决方案:');
  console.log('- 创建文档时确保设置正确的folder_id');
  console.log('- 或者在后端API可用时使用真实数据');
}

// 导出函数到全局
window.checkLocalDocuments = checkLocalDocuments;
window.simulateGetDocuments = simulateGetDocuments;
window.createTestDocumentWithFolder = createTestDocumentWithFolder;
window.checkBackendAPI = checkBackendAPI;
window.runDiagnosis = runDiagnosis;

console.log('🛠️ 调试工具已加载:');
console.log('  runDiagnosis() - 运行完整诊断');
console.log('  checkLocalDocuments() - 检查本地文档');
console.log('  createTestDocumentWithFolder(folderId) - 创建测试文档');
console.log('  checkBackendAPI() - 检查后端API');

// 自动运行诊断
runDiagnosis();