import React, { useState, useEffect, useCallback } from 'react';
import { Button, Space, message, Spin, Input } from 'antd';
import { SaveOutlined, FullscreenOutlined, FullscreenExitOutlined, FilePdfOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import TaskMarkdownEditor from './TaskMarkdownEditor';
import api from '../services/api';
import { documentService } from '../services/unifiedDocumentService';
import { apiCache } from '../utils/apiCacheManager';
import html2pdf from 'html2pdf.js';
import '../styles/TaskDocumentEditor.css';

// html2pdf and mermaid are now loaded as npm packages
declare global {
  interface Window {
    html2pdf: any;
    mermaid?: any;
    mermaidInitialized: boolean;
  }
}

// Make html2pdf available globally for compatibility
if (typeof window !== 'undefined') {
  window.html2pdf = html2pdf;
}

// API返回的数据结构 - 匹配后端统一响应格式
interface TaskDocumentResponse {
  data: {
    content: string;
    task_id: number;
    project_id: number;
    format: string;
    size?: number;
    last_updated?: string;
  };
}

interface DocumentRequest {
  content: string;
}


interface TaskDocumentEditorProps {
  taskId: number;
  projectId: number;
  taskDocument?: {
    id: number;
    title: string;
    content: string;
    type: string;
  };
  onSave?: (content: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

const TaskDocumentEditor: React.FC<TaskDocumentEditorProps> = ({
  taskId,
  projectId,
  taskDocument,
  onSave,
  style = {},
  className = 'task-document-editor'
}) => {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // 加载文档内容
  const loadDocument = useCallback(async (forceReload: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      // 如果传入了taskDocument prop，优先使用它的数据
      if (taskDocument && taskDocument.id) {
        console.log('📥 [加载文档] 使用传入的taskDocument prop', {
          documentId: taskDocument.id,
          title: taskDocument.title,
          contentLength: (taskDocument.content || '').length,
          version: (taskDocument as any).version
        });

        // 直接使用传入的文档数据
        setContent(taskDocument.content || '');
        setOriginalContent(taskDocument.content || '');
        setTitle(taskDocument.title || '');
        setOriginalTitle(taskDocument.title || '');
        setLoading(false);
        return;
      }

      // 如果没有传入taskDocument，则从API加载主文档
      console.log('📥 [加载文档] 从API加载主文档...', {
        projectId,
        taskId
      });

      // 直接调用API，添加时间戳绕过所有缓存
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/documents`, {
        params: {
          include_main: true,
          page: 1,
          page_size: 10,
          _t: Date.now() // 时间戳强制绕过缓存
        }
      });

      // 处理响应数据
      const documents = response.documents || response.data?.documents || response;
      const docsArray = Array.isArray(documents) ? documents : [];

      // 查找主文档（metadata.relationship_type='main'）
      const mainDoc = docsArray.find((doc: any) =>
        doc.metadata?.relationship_type === 'main' || doc.relationship_type === 'main'
      );

      if (mainDoc) {
        setContent(mainDoc.content || '');
        setOriginalContent(mainDoc.content || '');
        setTitle(mainDoc.title || '');
        setOriginalTitle(mainDoc.title || '');
        console.log('✅ [加载文档] 加载成功（从API查找main文档）', {
          documentId: mainDoc.id,
          version: mainDoc.version,
          contentLength: (mainDoc.content || '').length
        });
      } else {
        // 文档不存在，显示空内容
        setContent('');
        setOriginalContent('');
        setTitle('');
        setOriginalTitle('');
        console.log('📄 [加载文档] 主文档不存在，显示空内容');
      }

    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '加载文档失败';
      setError(errorMsg);
      console.error('❌ [加载文档] 加载失败:', err);

    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, taskDocument]); // 添加taskDocument依赖

  // 保存文档
  const saveDocument = useCallback(async () => {
    if (!hasChanges) {
      message.info('没有需要保存的更改');
      return;
    }

    if (!taskDocument) {
      message.error('未选择文档');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      console.log('🔄 [保存文档] 开始保存...', {
        documentId: taskDocument.id,
        title: title.trim() || taskDocument.title,
        contentLength: content.length
      });

      // 使用documentService.updateDocument方法，确保正确的API调用
      await documentService.updateDocument(taskDocument.id, {
        content,
        title: title.trim() || taskDocument.title,
        type: taskDocument.type as 'markdown' | 'txt' | 'pdf'
      });

      console.log('✅ [保存文档] 保存成功，清除所有相关缓存并重新获取最新数据...');

      // 清除该文档的缓存
      apiCache.delete(`document_${taskDocument.id}`);

      // 清除所有任务文档相关缓存（遍历所有缓存键）
      const cacheKeys = apiCache.keys();
      cacheKeys.forEach((key: string) => {
        // 清除包含 task_document 或 task_documents 的所有缓存键
        if (
          key.includes(`task_document_${projectId}_${taskId}`) ||
          key.includes(`task_documents_${projectId}_${taskId}`)
        ) {
          console.log('🗑️ [清除缓存]', key);
          apiCache.delete(key);
        }
      });

      // 直接通过文档ID重新获取文档（此时已无缓存，会从服务器获取）
      const updatedDocument = await documentService.getDocument(taskDocument.id);

      // 更新本地状态为最新的服务器数据
      setContent(updatedDocument.content || '');
      setOriginalContent(updatedDocument.content || '');
      setTitle(updatedDocument.title || '');
      setOriginalTitle(updatedDocument.title || '');
      setHasChanges(false);

      console.log('✅ [保存文档] 最新版本号:', updatedDocument.version);
      message.success(`文档保存成功 (版本 ${updatedDocument.version})`);

      // 通知父组件文档已更新，让父组件重新加载数据
      if (onSave) {
        onSave(content);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '保存文档失败';
      setError(errorMsg);
      message.error(errorMsg);
      console.error('❌ [保存文档] 保存失败:', err);
    } finally {
      setSaving(false);
    }
  }, [content, title, taskDocument, onSave, hasChanges]);

  // 检查内容是否有变化
  useEffect(() => {
    setHasChanges(content !== originalContent || title !== originalTitle);
  }, [content, originalContent, title, originalTitle]);

  // 初始加载
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // 全屏切换功能
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);



  // PDF导出功能 - 修复版本（基于d51feab的稳定方法）
  const exportToPdf = useCallback(async () => {
    if (!content.trim()) {
      message.warning('文档内容为空，无法导出PDF');
      return;
    }

    setIsExportingPdf(true);
    console.log('🔄 [PDF导出] 开始导出PDF...', { contentLength: content.length, taskId, projectId });
    
    try {
      // 检查全局html2pdf是否可用 (通过CDN加载)
      if (typeof window.html2pdf === 'undefined') {
        throw new Error('PDF导出库未加载，请刷新页面后重试');
      }

      console.log('✅ [PDF导出] html2pdf库已加载');

      // 简单的Markdown转换HTML函数（优化边框渲染以适配scale=1.5）
      const simpleMarkdownToHtml = (md: string) => {
        let html = md
          // 标题（减小间距）
          .replace(/^### (.*$)/gm, '<h3 style="color: #333; margin: 10px 0 6px 0; font-size: 16px; font-weight: 600; page-break-after: avoid;">$1</h3>')
          .replace(/^## (.*$)/gm, '<h2 style="color: #333; margin: 12px 0 8px 0; font-size: 18px; font-weight: 600; page-break-after: avoid;">$1</h2>')
          .replace(/^# (.*$)/gm, '<h1 style="color: #333; margin: 14px 0 10px 0; font-size: 20px; font-weight: 700; border-bottom: 1px solid #1890ff; padding-bottom: 6px; page-break-after: avoid;">$1</h1>')
          // 粗体和斜体
          .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #333; font-weight: 600;">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: #666;">$1</em>')
          // 代码块（减小间距，添加分页保护）
          .replace(/```[\s\S]*?```/g, (match) => {
            const code = match.replace(/```(\w+)?/, '').replace(/```$/, '');
            return `<pre style="background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 3px; padding: 10px; margin: 8px 0; font-family: 'Courier New', Consolas, Monaco, monospace; font-size: 10px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%; page-break-inside: avoid;">${code.trim()}</pre>`;
          })
          // 行内代码（使用背景色，无边框）
          .replace(/`([^`]+)`/g, '<code style="background: #f6f8fa; padding: 2px 5px; border-radius: 2px; font-family: \'Courier New\', Consolas, Monaco, monospace; font-size: 12px; color: #d73a49;">$1</code>')
          // 链接
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #1890ff; text-decoration: underline;">$1</a>')
          // 分割线（减小间距）
          .replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid #d0d7de; margin: 12px 0;">');

        // 处理无序列表（包裹在ul中，减小间距）
        html = html.replace(/((?:^[\*\-] .*$\n?)+)/gm, (match) => {
          const items = match
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^[\*\-] (.*)$/, '<li style="margin: 2px 0; line-height: 1.5;">$1</li>'))
            .join('');
          return `<ul style="margin: 8px 0; padding-left: 24px; list-style-type: disc; page-break-inside: avoid;">${items}</ul>`;
        });

        // 处理有序列表（包裹在ol中，减小间距）
        html = html.replace(/((?:^\d+\. .*$\n?)+)/gm, (match) => {
          const items = match
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^\d+\. (.*)$/, '<li style="margin: 2px 0; line-height: 1.5;">$1</li>'))
            .join('');
          return `<ol style="margin: 8px 0; padding-left: 24px; page-break-inside: avoid;">${items}</ol>`;
        });

        // 处理段落（将连续的非标签行包裹在p标签中，减小段落间距）
        html = html.replace(/^(?!<[huplodi]|<\/|<pre|<hr)(.+)$/gm, '<p style="margin: 4px 0; line-height: 1.6;">$1</p>');

        return html;
      };

      // 转换内容
      const htmlContent = simpleMarkdownToHtml(content);
      console.log('✅ [PDF导出] Markdown转换完成', { htmlLength: htmlContent.length });

      // 如果转换后的内容为空，使用原始内容
      const finalContent = htmlContent.trim() || content.replace(/\n/g, '<br>');

      // ===== 优化的PDF内容元素创建 =====
      // 创建PDF容器元素，设置合适的宽度以适应A4页面
      const pdfElement = document.createElement('div');

      // 设置优化的内容结构，减小整体间距
      pdfElement.innerHTML = `
        <div style="max-width: 100%; padding: 20px; background: white; font-family: Arial, 'Microsoft YaHei', sans-serif; color: #333; line-height: 1.6; box-sizing: border-box;">
          <h1 style="color: #333; border-bottom: 1px solid #1890ff; padding-bottom: 6px; margin-bottom: 12px; font-size: 20px; font-weight: 700; word-wrap: break-word; page-break-after: avoid;">${title || '任务文档'}</h1>
          <div style="margin: 10px 0; color: #666; font-size: 11px; border-bottom: 1px solid #d0d7de; padding-bottom: 6px; word-wrap: break-word;">
            任务ID: ${taskId} | 项目ID: ${projectId} | 导出时间: ${new Date().toLocaleString('zh-CN')}
          </div>
          <div style="margin-top: 14px; color: #333; line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word;">
            ${finalContent}
          </div>
        </div>
      `;

      // 设置元素样式，确保内容不溢出页面
      // A4纸宽度210mm，减去margin后约680px（在scale=1时）
      pdfElement.style.width = '210mm';  // 使用mm单位匹配A4宽度
      pdfElement.style.maxWidth = '210mm';
      pdfElement.style.backgroundColor = '#ffffff';
      pdfElement.style.color = '#333333';
      pdfElement.style.fontFamily = 'Arial, "Microsoft YaHei", sans-serif';
      pdfElement.style.lineHeight = '1.6';  // 减小行高，紧凑布局
      pdfElement.style.boxSizing = 'border-box';
      pdfElement.style.overflow = 'hidden';  // 防止内容溢出

      console.log('✅ [PDF导出] 简化元素创建完成');

      // 🎯 智能检测文档类型，自动选择最佳scale
      const detectDocumentType = (text: string): { hasAsciiArt: boolean; scale: number; mode: string } => {
        // 检测ASCII艺术图/线框图的特征
        const asciiArtPatterns = [
          /[│├┤┬┴┼─┌┐└┘]/g,           // 中文制表符
          /[|]{2,}/g,                   // 连续的竖线（至少2个）
          /[-─]{3,}/g,                  // 连续的横线（至少3个）
          /[+\-|]{5,}/g,                // 包含+-|的组合（至少5个字符）
          /\s+[|]\s+.*\s+[|]\s+/g,     // 表格结构（| xxx | xxx |）
          /[\/\\]{2,}/g,                // 斜线组合
          /[▲▼◄►▶◀△▽]/g,              // 箭头符号
          /[┌┐└┘├┤┬┴┼]/g,              // 框线字符
        ];

        // 检测是否包含架构图特征
        let matchCount = 0;
        asciiArtPatterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) {
            matchCount += matches.length;
          }
        });

        // 如果匹配超过5个特征，认为包含线框图
        const hasAsciiArt = matchCount > 5;

        // 根据检测结果选择scale
        const scale = hasAsciiArt ? 1 : 1.5;
        const mode = hasAsciiArt ? '标准模式(线框图优化)' : '高清模式(文字优化)';

        console.log(`📊 [PDF导出] 文档类型检测: ${mode}, 匹配特征数: ${matchCount}, scale: ${scale}`);

        return { hasAsciiArt, scale, mode };
      };

      // 检测文档类型
      const docType = detectDocumentType(content);

      // PDF配置选项（智能选择scale以平衡线框和清晰度）
      const opt = {
        margin: [10, 10, 10, 10],  // 上右下左边距（mm）
        filename: `task-${taskId}-document-${new Date().toISOString().split('T')[0]}.pdf`,
        image: {
          type: 'jpeg',
          quality: docType.scale === 1 ? 0.98 : 0.96  // 线框图模式使用更高质量
        },
        html2canvas: {
          scale: docType.scale,  // 智能选择：线框图用1，纯文字用1.5
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,  // 改善文字渲染质量
          scrollX: 0,
          scrollY: 0,
          imageTimeout: 0,
          removeContainer: true,
          dpi: docType.scale === 1 ? 150 : 144  // 根据scale调整DPI
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
          precision: 2  // 提高PDF精度
        },
        pagebreak: {
          mode: ['css', 'legacy'],  // 使用CSS分页控制
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: 'p, pre, code, h1, h2, h3, ul, ol, li'  // 避免在这些元素中间分页
        }
      };

      console.log(`🔄 [PDF导出] 开始生成PDF（${docType.mode}）...`);

      // 使用简化的生成方法（基于调试成功的逻辑）
      await window.html2pdf().set(opt).from(pdfElement).save();

      console.log('✅ [PDF导出] PDF生成并下载成功');
      message.success(`PDF导出成功！（${docType.mode}）`);

    } catch (error: any) {
      console.error('❌ [PDF导出] PDF导出失败:', error);
      message.error(`PDF导出失败：${error.message || '未知错误'}`);
    } finally {
      setIsExportingPdf(false);
    }
  }, [content, title, taskId, projectId]);




  // 键盘快捷键
  useEffect(() => {
    // 检查 document 是否存在且为有效对象
    if (typeof document === 'undefined' || !document || typeof document.addEventListener !== 'function') {
      console.warn('[TaskDocumentEditor] document.addEventListener is not available, skipping keyboard shortcuts');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
      
      // F11 或 Ctrl+Shift+F 切换全屏
      if (e.key === 'F11' || (e.ctrlKey && e.shiftKey && e.key === 'F')) {
        e.preventDefault();
        toggleFullscreen();
      }
      
      // ESC 键退出全屏
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    try {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        if (typeof document !== 'undefined' && document && typeof document.removeEventListener === 'function') {
          document.removeEventListener('keydown', handleKeyDown);
        }
      };
    } catch (error) {
      console.warn('[TaskDocumentEditor] Failed to add/remove event listener:', error);
      return () => {}; // 返回空的清理函数
    }
  }, [saveDocument, toggleFullscreen, isFullscreen]);

  // 全屏状态变化时的副作用
  useEffect(() => {
    // 检查 document 是否可用
    if (typeof document === 'undefined' || !document || !document.body) {
      console.warn('[TaskDocumentEditor] document is not available for fullscreen functionality');
      return;
    }

    if (isFullscreen) {
      // 全屏时隐藏页面滚动条并添加全屏CSS类
      document.body.style.overflow = 'hidden';
      document.body.classList.add('fullscreen-editor-active');
      
      // 更精确地隐藏页面布局元素 - 使用更广泛的选择器
      const hideSelectors = [
        // Ant Design Layout 组件
        '.ant-layout-header',
        '.ant-layout-sider', 
        '.ant-layout-footer',
        
        // 通用布局类名
        'header', 'nav', 'aside', 'footer',
        '.header', '.nav', '.sidebar', '.footer',
        '.navigation', '.menu', '.topbar',
        
        // 可能的自定义类名
        '[class*="layout"]', 
        '[class*="Layout"]',
        '[class*="sidebar"]',
        '[class*="Sidebar"]', 
        '[class*="navigation"]',
        '[class*="Navigation"]',
        '[class*="header"]',
        '[class*="Header"]',
        
        // 主应用容器的直接子元素（除了我们的全屏编辑器）
        '#root > *:not([data-fullscreen-editor])',
        '.App > *:not([data-fullscreen-editor])',
        '[class*="App"] > *:not([data-fullscreen-editor])'
      ];
      
      // 隐藏所有匹配的元素
      hideSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element instanceof HTMLElement && !element.hasAttribute('data-fullscreen-editor')) {
            element.style.display = 'none';
            element.setAttribute('data-hidden-by-fullscreen', 'true');
          }
        });
      });
      
    } else {
      // 退出全屏时恢复body样式并显示其他元素
      document.body.style.overflow = '';
      document.body.classList.remove('fullscreen-editor-active');
      
      // 恢复被隐藏的元素
      const hiddenElements = document.querySelectorAll('[data-hidden-by-fullscreen="true"]');
      hiddenElements.forEach(element => {
        if (element instanceof HTMLElement) {
          element.style.display = '';
          element.removeAttribute('data-hidden-by-fullscreen');
        }
      });
    }

    // 清理函数
    return () => {
      if (typeof document !== 'undefined' && document && document.body) {
        document.body.style.overflow = '';
        document.body.classList.remove('fullscreen-editor-active');
        // 确保退出时恢复所有元素
        const hiddenElements = document.querySelectorAll('[data-hidden-by-fullscreen="true"]');
        hiddenElements.forEach(element => {
          if (element instanceof HTMLElement) {
            element.style.display = '';
            element.removeAttribute('data-hidden-by-fullscreen');
          }
        });
      }
    };
  }, [isFullscreen]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>加载文档中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>
          ❌ {error}
        </div>
        <Button onClick={loadDocument}>重新加载</Button>
      </div>
    );
  }

  // 全屏样式
  const fullscreenStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 2147483647, // 极大层级，确保覆盖页面任何元素
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    boxSizing: 'border-box',
    margin: 0,
    border: 'none',
    outline: 'none',
    overflow: 'auto', // 修复: 允许容器滚动
    overflowX: 'hidden' // 避免出现横向滚动条
  };

  // 普通模式容器样式：放开滚动，由页面整体滚动接管，避免局部滚动条
  const normalContainerStyle: React.CSSProperties = {
    ...style,
    width: '100%',
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflowX: 'visible',
    overflowY: 'visible',
    minHeight: 0
  };

  const containerStyle: React.CSSProperties = isFullscreen 
    ? fullscreenStyle 
    : normalContainerStyle;

  // 渲染编辑器内容
  const renderEditor = () => (
    <div 
      style={containerStyle} 
      className={className}
      id={isFullscreen ? 'task-doc-fullscreen' : undefined}
      data-fullscreen-editor={isFullscreen ? 'true' : 'false'}
    >
      {/* 工具栏 */}
      <div style={{ marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px' }}>
        <Space split={<div style={{ width: '1px', height: '20px', background: '#f0f0f0' }} />}>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!hasChanges}
              onClick={saveDocument}
            >
              保存 {hasChanges && '*'}
            </Button>
            <Button
              type="default"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              title={isFullscreen ? '退出全屏 (ESC / F11)' : '全屏编辑 (F11 / Ctrl+Shift+F)'}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </Button>
            <Button
              type="default"
              icon={<FilePdfOutlined />}
              loading={isExportingPdf}
              onClick={exportToPdf}
              disabled={!content.trim()}
              title="导出为PDF文件"
            >
              导出PDF
            </Button>
          </Space>
          
          {hasChanges && (
            <span style={{ color: '#faad14', fontSize: '12px' }}>
              📝 有未保存的更改 (Ctrl+S 快速保存)
            </span>
          )}
          
          {isFullscreen && (
            <span style={{ color: '#1890ff', fontSize: '12px' }}>
              💡 F11、Ctrl+Shift+F 或 ESC 键可切换全屏模式
            </span>
          )}
        </Space>
      </div>

      {/* 文档标题编辑 */}
      <div style={{ marginBottom: '16px' }}>
        <Input
          placeholder="请输入文档标题..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ 
            fontSize: '18px', 
            fontWeight: '600',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            padding: '12px 16px'
          }}
          maxLength={255}
          showCount
        />
      </div>

      {/* 使用TaskMarkdownEditor组件 */}
      <div className="task-document-scroll" style={{ 
        flex: isFullscreen ? 1 : 'none', 
        display: 'flex', 
        flexDirection: 'column',
        overflowY: isFullscreen ? 'auto' : 'visible',
        overflowX: 'visible',
        minHeight: isFullscreen ? 0 : 'auto'
      }}>
        <TaskMarkdownEditor
          value={content}
          onChange={setContent}
          placeholder="请输入任务文档内容（支持Markdown格式）..."
          rows={isFullscreen ? undefined : 20}
          style={isFullscreen ? { 
            height: '100%', 
            minHeight: '500px', // 设置最小高度
            flex: 1, // 占用所有可用空间
            border: 'none', // 移除边框
            resize: 'none' // 禁用手动调整大小
          } : {}}
        />
      </div>

      {/* 底部信息 */}
      <div style={{ 
        marginTop: isFullscreen ? '12px' : '8px', 
        paddingTop: isFullscreen ? '12px' : '0',
        borderTop: isFullscreen ? '1px solid #f0f0f0' : 'none',
        fontSize: '12px', 
        color: '#8c8c8c',
        display: 'flex',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <span>
          任务ID: {taskId} | 项目ID: {projectId}
          {isFullscreen && ' | 全屏编辑模式'}
        </span>
        <span>
          字符数: {content.length} | Ctrl+S 快速保存
          {isFullscreen && ' | ESC 退出全屏'}
        </span>
      </div>
    </div>
  );

  // 如果是全屏模式，使用Portal渲染到body
  if (isFullscreen) {
    // 确保document.body可用，否则回退到正常渲染
    if (typeof document !== 'undefined' && document && document.body) {
      return createPortal(renderEditor(), document.body);
    } else {
      // document.body not available for portal, falling back to normal rendering
      // 回退到正常渲染，但保持全屏样式
      return renderEditor();
    }
  }

  // 正常模式直接渲染
  return renderEditor();
};

export default TaskDocumentEditor;