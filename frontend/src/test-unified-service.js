// 简单的测试脚本来验证 unifiedDocumentService 可以正常导入和实例化
const { unifiedDocumentService } = require('./services/unifiedDocumentService.ts');

console.log('✅ unifiedDocumentService successfully imported');
console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(unifiedDocumentService)));

// 测试基本的API接口存在性
const expectedMethods = [
  'createDocument',
  'getDocument', 
  'updateDocument',
  'deleteDocument',
  'getDocuments',
  'getAllDocuments',
  'copyDocument',
  'toggleTemplate',
  'batchDeleteDocuments',
  'duplicateDocument',
  'exportDocument',
  'uploadImage'
];

expectedMethods.forEach(method => {
  if (typeof unifiedDocumentService[method] === 'function') {
    console.log(`✅ ${method} method exists`);
  } else {
    console.log(`❌ ${method} method missing`);
  }
});

console.log('🎉 Service merge verification completed!');