/**
 * 在线文档编辑器集成组件
 * 支持多种在线编辑器的统一接口
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Tabs,
  Button,
  Space,
  Modal,
  Select,
  Switch,
  Typography,
  Alert,
  Spin,
  message,
  Dropdown,
  Tooltip,
  Badge,
  Row,
  Col,
  Statistic,
  Tag
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  ShareAltOutlined,
  FullscreenOutlined,
  SettingOutlined,
  CloudOutlined,
  GoogleOutlined,
  WindowsOutlined,
  FileTextOutlined,
  TeamOutlined,
  HistoryOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { Document } from '../types/document';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;

// 编辑器类型定义
export type EditorType = 
  | 'ckeditor'      // CKEditor 5
  | 'quill'         // Quill.js  
  | 'tinymce'       // TinyMCE
  | 'onlyoffice'    // OnlyOffice
  | 'google-docs'   // Google Docs
  | 'office365'     // Microsoft Office 365
  | 'notion'        // Notion-like editor
  | 'markdown';     // Markdown编辑器

// 编辑器配置
interface EditorConfig {
  type: EditorType;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  isCloud: boolean;
  supportRealtime: boolean;
  supportOffice: boolean;
  pricing: 'free' | 'freemium' | 'paid';
}

// 编辑器实例接口
interface EditorInstance {
  getInstance: () => any;
  getContent: () => string;
  setContent: (content: string) => void;
  save: () => Promise<void>;
  destroy: () => void;
  focus: () => void;
}

interface OnlineDocumentEditorProps {
  document: Document;
  visible: boolean;
  onClose: () => void;
  onSave?: (content: string) => Promise<void>;
  onShare?: (shareData: any) => void;
  defaultEditor?: EditorType;
  readOnly?: boolean;
  enableCollaboration?: boolean;
}

// 编辑器配置数据
const EDITOR_CONFIGS: Record<EditorType, EditorConfig> = {
  ckeditor: {
    type: 'ckeditor',
    name: 'CKEditor 5',
    description: '现代化富文本编辑器，功能强大且可定制',
    icon: <EditOutlined style={{ color: '#1890ff' }} />,
    features: ['富文本编辑', '插件生态', '协作编辑', '图片上传', '表格支持'],
    isCloud: false,
    supportRealtime: true,
    supportOffice: false,
    pricing: 'freemium'
  },
  quill: {
    type: 'quill',
    name: 'Quill.js',
    description: '轻量级现代编辑器，性能优秀',
    icon: <FileTextOutlined style={{ color: '#52c41a' }} />,
    features: ['轻量级', '模块化', '主题定制', 'Delta格式', '移动端优化'],
    isCloud: false,
    supportRealtime: true,
    supportOffice: false,
    pricing: 'free'
  },
  tinymce: {
    type: 'tinymce',
    name: 'TinyMCE',
    description: '功能丰富的编辑器，插件生态完善',
    icon: <EditOutlined style={{ color: '#faad14' }} />,
    features: ['丰富插件', '所见即所得', '移动端支持', '云服务', '拼写检查'],
    isCloud: true,
    supportRealtime: true,
    supportOffice: true,
    pricing: 'freemium'
  },
  onlyoffice: {
    type: 'onlyoffice',
    name: 'OnlyOffice',
    description: '完整的Office套件，完全兼容MS Office',
    icon: <WindowsOutlined style={{ color: '#722ed1' }} />,
    features: ['完整Office', '格式兼容', '协作编辑', '版本控制', '企业级'],
    isCloud: true,
    supportRealtime: true,
    supportOffice: true,
    pricing: 'freemium'
  },
  'google-docs': {
    type: 'google-docs',
    name: 'Google Docs',
    description: 'Google原生文档编辑器，云端协作',
    icon: <GoogleOutlined style={{ color: '#4285f4' }} />,
    features: ['云端存储', '实时协作', '版本历史', '评论系统', '分享权限'],
    isCloud: true,
    supportRealtime: true,
    supportOffice: true,
    pricing: 'free'
  },
  office365: {
    type: 'office365',
    name: 'Office 365',
    description: 'Microsoft Office在线版本',
    icon: <WindowsOutlined style={{ color: '#0078d4' }} />,
    features: ['原生Office', '云端同步', '团队协作', '企业集成', '高级功能'],
    isCloud: true,
    supportRealtime: true,
    supportOffice: true,
    pricing: 'paid'
  },
  notion: {
    type: 'notion',
    name: 'Notion风格',
    description: '块编辑器，支持丰富的内容类型',
    icon: <EditOutlined style={{ color: '#000' }} />,
    features: ['块编辑', '数据库', '模板系统', '嵌入内容', '协作空间'],
    isCloud: false,
    supportRealtime: true,
    supportOffice: false,
    pricing: 'freemium'
  },
  markdown: {
    type: 'markdown',
    name: 'Markdown编辑器',
    description: '专业的Markdown编辑体验',
    icon: <FileTextOutlined style={{ color: '#8c8c8c' }} />,
    features: ['Markdown语法', '实时预览', '语法高亮', '快捷键', '导出功能'],
    isCloud: false,
    supportRealtime: false,
    supportOffice: false,
    pricing: 'free'
  }
};

const OnlineDocumentEditor: React.FC<OnlineDocumentEditorProps> = ({
  document,
  visible,
  onClose,
  onSave,
  onShare,
  defaultEditor = 'ckeditor',
  readOnly = false,
  enableCollaboration = true
}) => {
  // 状态管理
  const [currentEditor, setCurrentEditor] = useState<EditorType>(defaultEditor);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);
  const [content, setContent] = useState(document.content || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // 编辑器容器引用
  const editorRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  // 初始化编辑器
  useEffect(() => {
    if (visible && editorRef.current) {
      initializeEditor();
    }
    
    return () => {
      if (editorInstance) {
        editorInstance.destroy();
      }
    };
  }, [visible, currentEditor]);

  // 初始化编辑器
  const initializeEditor = async () => {
    setLoading(true);
    
    try {
      const instance = await createEditorInstance(currentEditor);
      setEditorInstance(instance);
      
      if (instance && content) {
        instance.setContent(content);
      }
    } catch (error) {
      console.error('编辑器初始化失败:', error);
      message.error('编辑器加载失败，请尝试其他编辑器');
    } finally {
      setLoading(false);
    }
  };

  // 创建编辑器实例
  const createEditorInstance = async (type: EditorType): Promise<EditorInstance | null> => {
    const container = editorRef.current;
    if (!container) return null;

    switch (type) {
      case 'ckeditor':
        return await createCKEditor(container);
      case 'quill':
        return await createQuillEditor(container);
      case 'tinymce':
        return await createTinyMCEEditor(container);
      case 'onlyoffice':
        return await createOnlyOfficeEditor(container);
      case 'google-docs':
        return await createGoogleDocsEditor(container);
      case 'office365':
        return await createOffice365Editor(container);
      case 'notion':
        return await createNotionEditor(container);
      case 'markdown':
        return await createMarkdownEditor(container);
      default:
        return null;
    }
  };

  // CKEditor 5集成
  const createCKEditor = async (container: HTMLElement): Promise<EditorInstance> => {
    // 这里需要动态导入CKEditor 5
    // const { ClassicEditor } = await import('@ckeditor/ckeditor5-build-classic');
    
    // 模拟CKEditor实例
    const mockInstance = {
      setData: (data: string) => {
        container.innerHTML = `<div class="ck-content">${data}</div>`;
      },
      getData: () => container.innerHTML,
      destroy: () => {
        container.innerHTML = '';
      }
    };

    // 初始化编辑器UI
    container.innerHTML = `
      <div class="ckeditor-container" style="
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        min-height: 400px;
        padding: 16px;
        background: white;
      ">
        <div class="editor-toolbar" style="
          border-bottom: 1px solid #f0f0f0;
          padding: 8px 0;
          margin-bottom: 16px;
        ">
          <button style="margin-right: 8px; padding: 4px 8px; border: 1px solid #d9d9d9; background: white; border-radius: 4px;">粗体</button>
          <button style="margin-right: 8px; padding: 4px 8px; border: 1px solid #d9d9d9; background: white; border-radius: 4px;">斜体</button>
          <button style="margin-right: 8px; padding: 4px 8px; border: 1px solid #d9d9d9; background: white; border-radius: 4px;">链接</button>
          <button style="margin-right: 8px; padding: 4px 8px; border: 1px solid #d9d9d9; background: white; border-radius: 4px;">图片</button>
        </div>
        <div class="editor-content" contenteditable="true" style="
          min-height: 300px;
          padding: 16px;
          border: 1px solid #f0f0f0;
          border-radius: 4px;
          line-height: 1.6;
        ">
          ${content || '<p>开始编辑您的文档...</p>'}
        </div>
      </div>
    `;

    return {
      getInstance: () => mockInstance,
      getContent: () => {
        const contentEl = container.querySelector('.editor-content');
        return contentEl?.innerHTML || '';
      },
      setContent: (newContent: string) => {
        const contentEl = container.querySelector('.editor-content');
        if (contentEl) {
          contentEl.innerHTML = newContent;
        }
      },
      save: async () => {
        const content = container.querySelector('.editor-content')?.innerHTML || '';
        setContent(content);
      },
      destroy: () => {
        container.innerHTML = '';
      },
      focus: () => {
        const contentEl = container.querySelector('.editor-content') as HTMLElement;
        contentEl?.focus();
      }
    };
  };

  // Quill.js集成
  const createQuillEditor = async (container: HTMLElement): Promise<EditorInstance> => {
    container.innerHTML = `
      <div class="quill-container">
        <div id="quill-toolbar" style="border-bottom: 1px solid #ccc;">
          <span class="ql-formats">
            <select class="ql-font"></select>
            <select class="ql-size"></select>
          </span>
          <span class="ql-formats">
            <button class="ql-bold"></button>
            <button class="ql-italic"></button>
            <button class="ql-underline"></button>
          </span>
          <span class="ql-formats">
            <button class="ql-list" value="ordered"></button>
            <button class="ql-list" value="bullet"></button>
          </span>
        </div>
        <div id="quill-editor" style="height: 400px; background: white;">
          ${content || '<p>开始使用Quill编辑器...</p>'}
        </div>
      </div>
    `;

    return {
      getInstance: () => ({}),
      getContent: () => {
        const editor = container.querySelector('#quill-editor');
        return editor?.innerHTML || '';
      },
      setContent: (newContent: string) => {
        const editor = container.querySelector('#quill-editor');
        if (editor) {
          editor.innerHTML = newContent;
        }
      },
      save: async () => {
        const content = container.querySelector('#quill-editor')?.innerHTML || '';
        setContent(content);
      },
      destroy: () => {
        container.innerHTML = '';
      },
      focus: () => {
        const editor = container.querySelector('#quill-editor') as HTMLElement;
        editor?.focus();
      }
    };
  };

  // Google Docs集成 (使用Google Drive API)
  const createGoogleDocsEditor = async (container: HTMLElement): Promise<EditorInstance> => {
    container.innerHTML = `
      <div class="google-docs-container" style="
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        background: white;
        min-height: 500px;
      ">
        <div class="docs-header" style="
          background: #f8f9fa;
          padding: 12px 16px;
          border-bottom: 1px solid #e8eaed;
          display: flex;
          align-items: center;
          gap: 12px;
        ">
          <div style="color: #4285f4; font-size: 20px;">📄</div>
          <div>
            <div style="font-weight: 500;">${document.title}</div>
            <div style="font-size: 12px; color: #5f6368;">Google Docs集成</div>
          </div>
        </div>
        <div class="docs-toolbar" style="
          padding: 8px 16px;
          border-bottom: 1px solid #e8eaed;
          display: flex;
          gap: 8px;
        ">
          <button style="padding: 6px 12px; border: none; background: #f8f9fa; border-radius: 4px;">文件</button>
          <button style="padding: 6px 12px; border: none; background: #f8f9fa; border-radius: 4px;">编辑</button>
          <button style="padding: 6px 12px; border: none; background: #f8f9fa; border-radius: 4px;">插入</button>
          <button style="padding: 6px 12px; border: none; background: #f8f9fa; border-radius: 4px;">格式</button>
        </div>
        <div class="docs-content" contenteditable="true" style="
          padding: 96px 72px;
          min-height: 350px;
          background: white;
          line-height: 1.6;
          font-family: 'Times New Roman', serif;
          font-size: 14px;
        ">
          ${content || '<p>在Google Docs风格编辑器中开始编辑...</p>'}
        </div>
      </div>
    `;

    return {
      getInstance: () => ({}),
      getContent: () => {
        const editor = container.querySelector('.docs-content');
        return editor?.innerHTML || '';
      },
      setContent: (newContent: string) => {
        const editor = container.querySelector('.docs-content');
        if (editor) {
          editor.innerHTML = newContent;
        }
      },
      save: async () => {
        const content = container.querySelector('.docs-content')?.innerHTML || '';
        setContent(content);
        // 这里可以集成Google Drive API保存
      },
      destroy: () => {
        container.innerHTML = '';
      },
      focus: () => {
        const editor = container.querySelector('.docs-content') as HTMLElement;
        editor?.focus();
      }
    };
  };

  // OnlyOffice集成
  const createOnlyOfficeEditor = async (container: HTMLElement): Promise<EditorInstance> => {
    container.innerHTML = `
      <div class="onlyoffice-container" style="
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        background: white;
        min-height: 500px;
      ">
        <div class="office-header" style="
          background: #2b579a;
          color: white;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <div style="font-size: 16px;">📄</div>
          <div style="font-weight: 500;">OnlyOffice文档编辑器</div>
        </div>
        <div class="office-ribbon" style="
          background: #f4f4f4;
          padding: 4px;
          border-bottom: 1px solid #d4d4d4;
        ">
          <div style="display: flex; gap: 4px; margin-bottom: 4px;">
            <button style="padding: 4px 8px; border: 1px solid #d4d4d4; background: white; font-size: 12px;">文件</button>
            <button style="padding: 4px 8px; border: 1px solid #d4d4d4; background: white; font-size: 12px;">开始</button>
            <button style="padding: 4px 8px; border: 1px solid #d4d4d4; background: white; font-size: 12px;">插入</button>
            <button style="padding: 4px 8px; border: 1px solid #d4d4d4; background: white; font-size: 12px;">页面布局</button>
          </div>
          <div style="display: flex; gap: 4px;">
            <button style="padding: 2px 6px; border: 1px solid #d4d4d4; background: white; font-size: 11px;">B</button>
            <button style="padding: 2px 6px; border: 1px solid #d4d4d4; background: white; font-size: 11px;">I</button>
            <button style="padding: 2px 6px; border: 1px solid #d4d4d4; background: white; font-size: 11px;">U</button>
          </div>
        </div>
        <div class="office-content" contenteditable="true" style="
          padding: 72px 96px;
          min-height: 350px;
          background: white;
          line-height: 1.5;
          font-family: 'Times New Roman', serif;
        ">
          ${content || '<p>OnlyOffice编辑器 - 完全兼容MS Office格式</p>'}
        </div>
      </div>
    `;

    return {
      getInstance: () => ({}),
      getContent: () => {
        const editor = container.querySelector('.office-content');
        return editor?.innerHTML || '';
      },
      setContent: (newContent: string) => {
        const editor = container.querySelector('.office-content');
        if (editor) {
          editor.innerHTML = newContent;
        }
      },
      save: async () => {
        const content = container.querySelector('.office-content')?.innerHTML || '';
        setContent(content);
      },
      destroy: () => {
        container.innerHTML = '';
      },
      focus: () => {
        const editor = container.querySelector('.office-content') as HTMLElement;
        editor?.focus();
      }
    };
  };

  // 其他编辑器的创建函数 (简化实现)
  const createTinyMCEEditor = async (container: HTMLElement): Promise<EditorInstance> => {
    // TinyMCE集成逻辑
    return createBasicEditor(container, 'TinyMCE编辑器', '#faad14');
  };

  const createOffice365Editor = async (container: HTMLElement): Promise<EditorInstance> => {
    // Office 365集成逻辑  
    return createBasicEditor(container, 'Office 365在线编辑器', '#0078d4');
  };

  const createNotionEditor = async (container: HTMLElement): Promise<EditorInstance> => {
    // Notion风格编辑器
    return createBasicEditor(container, 'Notion风格块编辑器', '#000');
  };

  const createMarkdownEditor = async (container: HTMLElement): Promise<EditorInstance> => {
    // Markdown编辑器
    container.innerHTML = `
      <div class="markdown-container" style="display: flex; height: 500px; border: 1px solid #d9d9d9; border-radius: 6px;">
        <div class="markdown-editor" style="flex: 1; padding: 16px; border-right: 1px solid #f0f0f0;">
          <div style="margin-bottom: 8px; font-weight: 500; color: #666;">Markdown编辑</div>
          <textarea style="
            width: 100%;
            height: 400px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            padding: 12px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 13px;
            resize: none;
          " placeholder="# 开始编写Markdown...">${content || '# 文档标题\n\n开始编写您的Markdown文档...'}</textarea>
        </div>
        <div class="markdown-preview" style="flex: 1; padding: 16px; background: #fafafa;">
          <div style="margin-bottom: 8px; font-weight: 500; color: #666;">预览</div>
          <div class="preview-content" style="
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            padding: 12px;
            background: white;
            height: 400px;
            overflow-y: auto;
          ">
            ${content || '<h1>文档标题</h1><p>开始编写您的Markdown文档...</p>'}
          </div>
        </div>
      </div>
    `;

    return {
      getInstance: () => ({}),
      getContent: () => {
        const textarea = container.querySelector('textarea');
        return textarea?.value || '';
      },
      setContent: (newContent: string) => {
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = newContent;
        }
      },
      save: async () => {
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
        setContent(textarea?.value || '');
      },
      destroy: () => {
        container.innerHTML = '';
      },
      focus: () => {
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
        textarea?.focus();
      }
    };
  };

  // 基础编辑器创建函数
  const createBasicEditor = async (container: HTMLElement, title: string, color: string): Promise<EditorInstance> => {
    container.innerHTML = `
      <div class="basic-editor-container" style="
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        background: white;
        min-height: 500px;
      ">
        <div class="editor-header" style="
          background: ${color};
          color: white;
          padding: 12px 16px;
          font-weight: 500;
        ">
          ${title}
        </div>
        <div class="editor-content" contenteditable="true" style="
          padding: 20px;
          min-height: 400px;
          line-height: 1.6;
        ">
          ${content || '<p>开始编辑您的文档...</p>'}
        </div>
      </div>
    `;

    return {
      getInstance: () => ({}),
      getContent: () => {
        const editor = container.querySelector('.editor-content');
        return editor?.innerHTML || '';
      },
      setContent: (newContent: string) => {
        const editor = container.querySelector('.editor-content');
        if (editor) {
          editor.innerHTML = newContent;
        }
      },
      save: async () => {
        const content = container.querySelector('.editor-content')?.innerHTML || '';
        setContent(content);
      },
      destroy: () => {
        container.innerHTML = '';
      },
      focus: () => {
        const editor = container.querySelector('.editor-content') as HTMLElement;
        editor?.focus();
      }
    };
  };

  // 保存文档
  const handleSave = async () => {
    if (!editorInstance) return;

    setSaving(true);
    try {
      await editorInstance.save();
      const currentContent = editorInstance.getContent();
      
      if (onSave) {
        await onSave(currentContent);
      }
      
      setLastSaved(new Date());
      message.success('文档保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 切换编辑器
  const handleEditorChange = (newEditor: EditorType) => {
    if (editorInstance) {
      const currentContent = editorInstance.getContent();
      setContent(currentContent);
      editorInstance.destroy();
      setEditorInstance(null);
    }
    
    setCurrentEditor(newEditor);
  };

  // 全屏切换
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 分享文档
  const handleShare = () => {
    if (onShare) {
      onShare({
        documentId: document.id,
        editor: currentEditor,
        content: editorInstance?.getContent() || content
      });
    } else {
      Modal.info({
        title: '分享文档',
        content: '分享功能需要后端支持，当前为演示模式'
      });
    }
  };

  // 渲染编辑器选择器
  const renderEditorSelector = () => (
    <Select
      value={currentEditor}
      onChange={handleEditorChange}
      style={{ width: 200 }}
      optionLabelProp="label"
    >
      {Object.values(EDITOR_CONFIGS).map(config => (
        <Option
          key={config.type}
          value={config.type}
          label={config.name}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {config.icon}
            <div>
              <div style={{ fontWeight: 500 }}>{config.name}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {config.isCloud && <CloudOutlined style={{ marginRight: 4 }} />}
                {config.pricing}
              </div>
            </div>
          </div>
        </Option>
      ))}
    </Select>
  );

  // 渲染工具栏
  const renderToolbar = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '12px 16px',
      background: '#fafafa',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <Space>
        {renderEditorSelector()}
        
        <Badge dot={EDITOR_CONFIGS[currentEditor].isCloud}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            disabled={readOnly}
          >
            保存
          </Button>
        </Badge>
        
        <Button
          icon={<ShareAltOutlined />}
          onClick={handleShare}
        >
          分享
        </Button>
        
        <Button
          icon={<FullscreenOutlined />}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? '退出全屏' : '全屏'}
        </Button>
      </Space>

      <Space>
        {enableCollaboration && EDITOR_CONFIGS[currentEditor].supportRealtime && (
          <Badge count={collaborators.length} size="small">
            <Button icon={<TeamOutlined />} type="text">
              协作
            </Button>
          </Badge>
        )}
        
        <Button icon={<HistoryOutlined />} type="text">
          历史
        </Button>
        
        <Dropdown
          menu={{
            items: [
              { key: 'export-pdf', label: '导出为PDF', icon: <ExportOutlined /> },
              { key: 'export-word', label: '导出为Word', icon: <ExportOutlined /> },
              { key: 'export-markdown', label: '导出为Markdown', icon: <ExportOutlined /> }
            ]
          }}
        >
          <Button icon={<ExportOutlined />} type="text">
            导出
          </Button>
        </Dropdown>
        
        {lastSaved && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            最后保存: {lastSaved.toLocaleTimeString()}
          </Text>
        )}
      </Space>
    </div>
  );

  // 渲染编辑器信息面板
  const renderEditorInfo = () => {
    const config = EDITOR_CONFIGS[currentEditor];
    
    return (
      <Alert
        message={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {config.icon}
            <span style={{ fontWeight: 500 }}>{config.name}</span>
            {config.isCloud && <Badge count="云端" size="small" />}
            {config.supportRealtime && <Badge count="协作" size="small" />}
          </div>
        }
        description={
          <div>
            <div style={{ marginBottom: 8 }}>{config.description}</div>
            <Space wrap>
              {config.features.slice(0, 3).map(feature => (
                <Tag key={feature}>{feature}</Tag>
              ))}
              {config.features.length > 3 && (
                <Tag>+{config.features.length - 3}更多</Tag>
              )}
            </Space>
          </div>
        }
        type="info"
        style={{ margin: '16px', marginTop: 0 }}
      />
    );
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EditOutlined />
          在线编辑 - {document.title}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={isFullscreen ? '100vw' : 1200}
      style={isFullscreen ? { 
        top: 0, 
        maxWidth: '100vw',
        margin: 0,
        paddingBottom: 0
      } : {}}
      bodyStyle={isFullscreen ? { 
        height: '100vh', 
        padding: 0,
        overflow: 'hidden'
      } : { 
        height: '70vh', 
        padding: 0 
      }}
      footer={null}
      destroyOnHidden
    >
      <div ref={fullscreenRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 工具栏 */}
        {renderToolbar()}
        
        {/* 编辑器信息 */}
        {!isFullscreen && renderEditorInfo()}
        
        {/* 编辑器容器 */}
        <div style={{ flex: 1, padding: isFullscreen ? 0 : '0 16px 16px' }}>
          <Spin spinning={loading} tip="加载编辑器中...">
            <div
              ref={editorRef}
              style={{ 
                height: '100%', 
                minHeight: isFullscreen ? '100%' : '400px'
              }}
            />
          </Spin>
        </div>
      </div>
    </Modal>
  );
};

export default OnlineDocumentEditor;