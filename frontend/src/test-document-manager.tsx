import React from 'react';
import DocumentFileManager from './components/DocumentFileManager';
import { Document } from './types/document';

// 模拟数据
const mockDocuments: Document[] = [
  {
    id: 1,
    title: 'API设计文档',
    description: '后端API接口设计规范说明',
    content: '# API设计文档\n\n这是API设计的详细说明...',
    type: 'markdown',
    status: 'published',
    tags: ['API', '设计', '后端'],
    folder_id: 1,
    folder_name: '技术文档',
    project_id: 1,
    project_name: '电商系统',
    customer_id: 1,
    customer_name: '阿里巴巴',
    owner_id: 1,
    owner_name: '张三',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-20T14:45:00Z',
    version: 2,
    is_favorite: true,
    is_template: false,
    visibility: 'team',
    file_url: undefined,
    file_size: undefined,
    category: 'technical',
    created_by: 1
  },
  {
    id: 2,
    title: '用户需求分析',
    description: '用户调研结果和需求分析报告',
    content: '# 用户需求分析\n\n基于用户调研的需求分析...',
    type: 'pdf',
    status: 'draft',
    tags: ['需求', '用户研究'],
    folder_id: 2,
    folder_name: '产品文档',
    project_id: 1,
    project_name: '电商系统',
    customer_id: 2,
    customer_name: '腾讯',
    owner_id: 2,
    owner_name: '李四',
    created_at: '2024-01-10T09:15:00Z',
    updated_at: '2024-01-18T16:20:00Z',
    version: 1,
    is_favorite: false,
    is_template: true,
    visibility: 'private',
    file_url: '/files/user-requirements.pdf',
    file_size: 2048000,
    category: 'requirement',
    created_by: 2
  },
  {
    id: 3,
    title: 'UI原型设计',
    description: '移动端界面设计原型',
    content: '',
    type: 'image',
    status: 'published',
    tags: ['UI', '原型', '移动端'],
    folder_id: undefined,
    folder_name: undefined,
    project_id: 2,
    project_name: '移动应用',
    customer_id: 3,
    customer_name: '字节跳动',
    owner_id: 3,
    owner_name: '王五',
    created_at: '2024-01-12T11:00:00Z',
    updated_at: '2024-01-19T13:30:00Z',
    version: 3,
    is_favorite: true,
    is_template: false,
    visibility: 'public',
    file_url: '/files/ui-prototype.png',
    file_size: 1024000,
    category: 'design',
    created_by: 3
  }
];

const TestDocumentManager: React.FC = () => {
  // 模拟文件夹导航事件监听
  React.useEffect(() => {
    const handleFolderNavigate = (event: CustomEvent) => {
      console.log('文件夹导航事件触发:', event.detail);
      alert(`导航到文件夹: ${event.detail.folderName} (ID: ${event.detail.folderId})`);
    };

    window.addEventListener('folderNavigate', handleFolderNavigate as EventListener);
    
    return () => {
      window.removeEventListener('folderNavigate', handleFolderNavigate as EventListener);
    };
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>文档管理器测试页面</h1>
      <DocumentFileManager
        folderId={1}
        showSearch={true}
        onDocumentSelect={(doc) => console.log('选中文档:', doc)}
        onDocumentUpdate={() => console.log('文档更新')}
      />
    </div>
  );
};

export default TestDocumentManager;
