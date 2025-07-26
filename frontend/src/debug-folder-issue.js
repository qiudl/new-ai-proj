/**
 * 调试文件夹文档显示问题
 * 在浏览器控制台中运行此脚本来诊断问题
 */

console.log('🔍 文件夹文档问题诊断工具');

// 测试后端API是否可用
async function testBackendAPI() {
  console.log('\n=== 1. 测试后端API ===');
  
  try {
    // 测试基础API
    console.log('📡 测试 /api/v1/documents...');
    const response1 = await fetch('/api/v1/documents', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || 'dummy-token'}`
      }
    });
    console.log(`状态: ${response1.status} ${response1.statusText}`);
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ 后端返回数据:', data1);
      return true;
    } else {
      console.log('❌ 后端API调用失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 后端API不可用:', error.message);
    return false;
  }
}

// 测试特定文件夹的API
async function testFolderAPI(folderId) {
  console.log(`\n=== 2. 测试文件夹${folderId}的API ===`);
  
  try {
    const url = `/api/v1/documents?folder_id=${folderId}`;
    console.log(`📡 测试 ${url}...`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || 'dummy-token'}`
      }
    });
    
    console.log(`状态: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ 文件夹${folderId}的文档:`, data);
      return data;
    } else {
      const errorData = await response.text();
      console.log('❌ API调用失败:', errorData);
      return null;
    }
  } catch (error) {
    console.log('❌ API调用异常:', error.message);
    return null;
  }
}

// 检查本地存储的文档
function checkLocalStorage() {
  console.log('\n=== 3. 检查本地存储 ===');
  
  const stored = localStorage.getItem('mock_documents');
  if (!stored) {
    console.log('❌ 没有本地存储的文档');
    return [];
  }
  
  try {
    const docs = JSON.parse(stored);
    console.log(`📄 本地存储了 ${docs.length} 个文档:`);
    
    docs.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.title} (folder_id: ${doc.folder_id})`);
    });
    
    // 按文件夹分组
    const byFolder = {};
    docs.forEach(doc => {
      const folderId = doc.folder_id || 'null';
      if (!byFolder[folderId]) byFolder[folderId] = [];
      byFolder[folderId].push(doc.title);
    });
    
    console.log('📁 按文件夹分组:');
    Object.entries(byFolder).forEach(([folderId, titles]) => {
      console.log(`  文件夹${folderId}: ${titles.join(', ')}`);
    });
    
    return docs;
  } catch (error) {
    console.log('❌ 解析本地存储失败:', error.message);
    return [];
  }
}

// 模拟前端服务调用
async function simulateServiceCall(folderId) {
  console.log(`\n=== 4. 模拟前端服务调用 (folderId: ${folderId}) ===`);
  
  // 模拟 unifiedDocumentService.getDocuments(folderId) 的逻辑
  try {
    // 1. 尝试API调用
    const url = folderId ? `/api/v1/documents?folder_id=${folderId}` : '/api/v1/documents';
    console.log(`🔗 API URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || 'dummy-token'}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API调用成功，返回数据:', data);
      return data;
    } else {
      throw new Error(`API调用失败: ${response.status}`);
    }
  } catch (error) {
    console.log('⚠️ API调用失败，使用本地存储:', error.message);
    
    // 2. 降级到本地存储
    const localDocs = checkLocalStorage();
    
    if (folderId !== undefined) {
      const filtered = localDocs.filter(doc => doc.folder_id === folderId);
      console.log(`🔍 过滤结果 (folder_id=${folderId}):`, filtered);
      return filtered;
    }
    
    return localDocs;
  }
}

// 创建测试文档
function createTestDocument(folderId) {
  console.log(`\n=== 5. 创建测试文档 (文件夹${folderId}) ===`);
  
  const testDoc = {
    id: Date.now() + Math.random(),
    folder_id: folderId,
    title: `测试文档-文件夹${folderId}-${new Date().getTime()}`,
    content: '这是一个测试文档内容',
    type: 'markdown',
    status: 'draft',
    description: `属于文件夹${folderId}的测试文档`,
    tags: ['test', 'debug'],
    owner_id: 1,
    visibility: 'private',
    version: 1,
    is_template: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 1,
    owner_name: 'Test User',
    can_edit: true,
    can_share: true
  };
  
  // 保存到localStorage
  const stored = localStorage.getItem('mock_documents');
  const docs = stored ? JSON.parse(stored) : [];
  docs.push(testDoc);
  localStorage.setItem('mock_documents', JSON.stringify(docs));
  
  console.log('✅ 创建测试文档:', testDoc);
  return testDoc;
}

// 运行完整诊断
async function runFullDiagnosis() {
  console.log('🏥 开始完整诊断...');
  console.log('=' .repeat(60));
  
  // 1. 测试后端API
  const apiWorking = await testBackendAPI();
  
  // 2. 检查本地存储
  const localDocs = checkLocalStorage();
  
  // 3. 测试几个常见文件夹ID
  const testFolderIds = [1, 2, 3];
  for (const folderId of testFolderIds) {
    await testFolderAPI(folderId);
    await simulateServiceCall(folderId);
  }
  
  // 4. 诊断结论
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 诊断结论:');
  
  if (apiWorking) {
    console.log('✅ 后端API工作正常');
    console.log('💡 问题可能是前端调用方式或参数传递');
  } else {
    console.log('❌ 后端API不可用');
    if (localDocs.length === 0) {
      console.log('💡 本地也没有测试数据，建议先创建一些测试文档');
    } else {
      console.log('💡 依赖本地存储，需要确保文档有正确的folder_id');
    }
  }
  
  console.log('\n🛠️ 建议的修复步骤:');
  console.log('1. 确认后端服务是否运行');
  console.log('2. 检查前端API调用的URL和参数');
  console.log('3. 验证创建文档时是否正确设置folder_id');
  console.log('4. 测试本地存储的降级逻辑');
}

// 快速修复：创建测试数据
function quickFix() {
  console.log('\n🚀 快速修复：创建测试数据');
  
  // 清除现有数据
  localStorage.removeItem('mock_documents');
  
  // 为不同文件夹创建测试文档
  createTestDocument(1);
  createTestDocument(2);
  createTestDocument(3);
  createTestDocument(null); // 根目录
  
  console.log('✅ 已创建测试数据，请刷新页面查看效果');
}

// 导出到全局
window.testBackendAPI = testBackendAPI;
window.testFolderAPI = testFolderAPI;
window.checkLocalStorage = checkLocalStorage;
window.simulateServiceCall = simulateServiceCall;
window.createTestDocument = createTestDocument;
window.runFullDiagnosis = runFullDiagnosis;
window.quickFix = quickFix;

console.log('\n🛠️ 可用的调试命令:');
console.log('  runFullDiagnosis() - 运行完整诊断');
console.log('  quickFix() - 快速修复（创建测试数据）');
console.log('  testBackendAPI() - 测试后端API');
console.log('  testFolderAPI(folderId) - 测试特定文件夹API');
console.log('  createTestDocument(folderId) - 创建测试文档');

// 自动运行基础诊断
runFullDiagnosis();