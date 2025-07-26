/**
 * 回归测试: UnifiedDocumentService 功能验证
 * 
 * 测试目标：
 * 1. 确保服务合并后所有核心功能正常工作
 * 2. 验证类型适配器的正确性
 * 3. 确保错误处理机制正常
 * 4. 验证API调用的统一性
 */

import unifiedDocumentService, { adaptSimpleToDocument, adaptDocumentToSimple } from '../services/unifiedDocumentService';

// Mock API module
jest.mock('../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

import api from '../services/api';

describe('UnifiedDocumentService 回归测试', () => {
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('基础CRUD操作', () => {
    
    test('创建文档 - createDocument', async () => {
      const mockDocument = {
        id: 1,
        title: 'Test Document',
        type: 'markdown',
        status: 'draft',
        content: 'Test content',
        tags: ['test'],
        owner_id: 1,
        visibility: 'private',
        version: 1,
        is_template: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 1
      };

      api.post.mockResolvedValue(mockDocument);

      const request = {
        title: 'Test Document',
        type: 'markdown',
        content: 'Test content',
        tags: ['test']
      };

      const result = await unifiedDocumentService.createDocument(request);
      
      expect(api.post).toHaveBeenCalledWith('/documents', request);
      expect(result).toEqual(mockDocument);
    });

    test('获取文档 - getDocument', async () => {
      const mockDocument = {
        id: 1,
        title: 'Test Document',
        content: 'Test content'
      };

      api.get.mockResolvedValue(mockDocument);

      const result = await unifiedDocumentService.getDocument(1);
      
      expect(api.get).toHaveBeenCalledWith('/documents/1');
      expect(result).toEqual(mockDocument);
    });

    test('更新文档 - updateDocument', async () => {
      const mockDocument = {
        id: 1,
        title: 'Updated Document'
      };

      api.put.mockResolvedValue(mockDocument);

      const request = { title: 'Updated Document' };
      const result = await unifiedDocumentService.updateDocument(1, request);
      
      expect(api.put).toHaveBeenCalledWith('/documents/1', request);
      expect(result).toEqual(mockDocument);
    });

    test('删除文档 - deleteDocument', async () => {
      api.delete.mockResolvedValue();

      await unifiedDocumentService.deleteDocument(1);
      
      expect(api.delete).toHaveBeenCalledWith('/documents/1');
    });

    test('获取文档列表 - getDocuments', async () => {
      const mockDocuments = [
        { id: 1, title: 'Document 1' },
        { id: 2, title: 'Document 2' }
      ];

      api.get.mockResolvedValue(mockDocuments);

      const result = await unifiedDocumentService.getDocuments();
      
      expect(api.get).toHaveBeenCalledWith('/documents');
      expect(result).toEqual(mockDocuments);
    });

    test('获取文档列表（带文件夹ID） - getDocuments with folderId', async () => {
      const mockDocuments = [{ id: 1, title: 'Document 1' }];

      api.get.mockResolvedValue(mockDocuments);

      const result = await unifiedDocumentService.getDocuments(123);
      
      expect(api.get).toHaveBeenCalledWith('/documents?folder_id=123');
      expect(result).toEqual(mockDocuments);
    });
  });

  describe('高级功能', () => {
    
    test('复制文档 - copyDocument', async () => {
      const mockDocument = { id: 2, title: 'Copy of Document' };

      api.post.mockResolvedValue(mockDocument);

      const result = await unifiedDocumentService.copyDocument(1);
      
      expect(api.post).toHaveBeenCalledWith('/documents/1/copy');
      expect(result).toEqual(mockDocument);
    });

    test('切换模板状态 - toggleTemplate', async () => {
      const mockDocument = { id: 1, is_template: true };

      api.post.mockResolvedValue(mockDocument);

      const result = await unifiedDocumentService.toggleTemplate(1);
      
      expect(api.post).toHaveBeenCalledWith('/documents/1/toggle-template');
      expect(result).toEqual(mockDocument);
    });

    test('批量删除文档 - batchDeleteDocuments', async () => {
      api.post.mockResolvedValue();

      await unifiedDocumentService.batchDeleteDocuments([1, 2, 3]);
      
      expect(api.post).toHaveBeenCalledWith('/documents/batch-delete', {
        document_ids: [1, 2, 3]
      });
    });

    test('上传图片 - uploadImage', async () => {
      const mockResponse = {
        url: 'https://example.com/image.jpg',
        filename: 'image.jpg',
        size: 1024,
        mime_type: 'image/jpeg'
      };

      api.post.mockResolvedValue(mockResponse);

      const file = new File([''], 'image.jpg', { type: 'image/jpeg' });
      const result = await unifiedDocumentService.uploadImage({ file });
      
      expect(api.post).toHaveBeenCalledWith('/documents/upload-image', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('错误处理', () => {
    
    test('API错误时的处理', async () => {
      const errorResponse = {
        response: {
          data: {
            message: 'Document not found'
          }
        }
      };

      api.get.mockRejectedValue(errorResponse);

      await expect(unifiedDocumentService.getDocument(999))
        .rejects.toThrow('Document not found');
    });

    test('网络错误时的处理', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      await expect(unifiedDocumentService.getDocument(1))
        .rejects.toThrow('Network error');
    });

    test('获取文档列表失败时返回空数组', async () => {
      api.get.mockRejectedValue(new Error('Server error'));

      const result = await unifiedDocumentService.getDocuments();
      
      expect(result).toEqual([]);
    });
  });

  describe('类型适配器', () => {
    
    test('SimpleDocument转Document - adaptSimpleToDocument', () => {
      const simpleDoc = {
        id: 1,
        title: 'Test',
        type: 'markdown',
        status: 'draft',
        tags: ['test'],
        owner_id: 1,
        visibility: 'private',
        version: 1,
        is_template: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 1
      };

      const result = adaptSimpleToDocument(simpleDoc);

      expect(result).toHaveProperty('content', '');
      expect(result).toHaveProperty('content_size', 0);
      expect(result).toHaveProperty('metadata', {});
      expect(result).toHaveProperty('can_edit', true);
      expect(result).toHaveProperty('can_share', true);
      expect(result.id).toBe(simpleDoc.id);
      expect(result.title).toBe(simpleDoc.title);
    });

    test('Document转SimpleDocument - adaptDocumentToSimple', () => {
      const document = {
        id: 1,
        title: 'Test',
        content: 'Content',
        content_size: 7,
        type: 'markdown',
        status: 'draft',
        tags: ['test'],
        metadata: { key: 'value' },
        owner_id: 1,
        visibility: 'private',
        version: 1,
        is_template: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 1,
        can_edit: true,
        can_share: true
      };

      const result = adaptDocumentToSimple(document);

      expect(result).not.toHaveProperty('content_size');
      expect(result).not.toHaveProperty('metadata');
      expect(result).not.toHaveProperty('can_edit');
      expect(result).not.toHaveProperty('can_share');
      expect(result.id).toBe(document.id);
      expect(result.title).toBe(document.title);
      expect(result.content).toBe(document.content);
    });
  });

  describe('API调用统一性', () => {
    
    test('所有方法使用统一的API包装器', async () => {
      // 测试各种API调用都使用了统一的错误处理
      const methods = [
        () => unifiedDocumentService.getDocument(1),
        () => unifiedDocumentService.createDocument({ title: 'Test', type: 'markdown' }),
        () => unifiedDocumentService.updateDocument(1, { title: 'Updated' }),
        () => unifiedDocumentService.getDocuments(),
      ];

      // Mock一个成功的响应
      api.get.mockResolvedValue({ id: 1 });
      api.post.mockResolvedValue({ id: 1 });
      api.put.mockResolvedValue({ id: 1 });

      for (const method of methods) {
        await expect(method()).resolves.toBeDefined();
      }
    });
  });
});

// 集成测试示例
describe('UnifiedDocumentService 集成测试', () => {
  
  test('完整的文档生命周期', async () => {
    // 1. 创建文档
    const createResponse = { id: 1, title: 'New Document' };
    api.post.mockResolvedValueOnce(createResponse);
    
    const created = await unifiedDocumentService.createDocument({
      title: 'New Document',
      type: 'markdown'
    });
    expect(created).toEqual(createResponse);

    // 2. 获取文档
    const getResponse = { id: 1, title: 'New Document', content: 'Content' };
    api.get.mockResolvedValueOnce(getResponse);
    
    const retrieved = await unifiedDocumentService.getDocument(1);
    expect(retrieved).toEqual(getResponse);

    // 3. 更新文档
    const updateResponse = { id: 1, title: 'Updated Document' };
    api.put.mockResolvedValueOnce(updateResponse);
    
    const updated = await unifiedDocumentService.updateDocument(1, {
      title: 'Updated Document'
    });
    expect(updated).toEqual(updateResponse);

    // 4. 删除文档
    api.delete.mockResolvedValueOnce();
    
    await expect(unifiedDocumentService.deleteDocument(1))
      .resolves.toBeUndefined();
  });
});