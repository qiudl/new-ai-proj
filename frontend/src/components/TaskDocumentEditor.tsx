import React, { useState, useEffect, useCallback } from 'react';
import { Button, Space, message, Spin, Input } from 'antd';
import { SaveOutlined, FullscreenOutlined, FullscreenExitOutlined, FilePdfOutlined, PrinterOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import TaskMarkdownEditor from './TaskMarkdownEditor';
import api from '../services/api';
import '../styles/TaskDocumentEditor.css';
import { renderMermaidDiagram } from '../utils/mermaidUtils';
// html2pdf.js and mermaid.js are loaded globally via CDN in index.html
declare global {
  interface Window {
    html2pdf: any;
    mermaid?: any;
    mermaidInitialized: boolean;
  }
}

// Type declaration for global html2pdf function
declare const html2pdf: any;

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
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // 加载文档内容
  const loadDocument = useCallback(async () => {
    if (!taskDocument) {
      setContent('');
      setOriginalContent('');
      setTitle('');
      setOriginalTitle('');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 使用传入的document数据，而不是从API加载
      const documentContent = taskDocument.content || '';
      const documentTitle = taskDocument.title || '';
      setContent(documentContent);
      setOriginalContent(documentContent);
      setTitle(documentTitle);
      setOriginalTitle(documentTitle);
      
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '加载文档失败';
      setError(errorMsg);
      console.error('Error loading document:', err);
      
    } finally {
      setLoading(false);
    }
  }, [document]);

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
      const requestData = { 
        content,
        title: title.trim() || taskDocument.title,
        type: taskDocument.type
      };
      await api.put(`/documents/${taskDocument.id}`, requestData);
      
      setOriginalContent(content);
      setOriginalTitle(title);
      setHasChanges(false);
      message.success('文档保存成功');
      
      if (onSave) {
        onSave(content);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '保存文档失败';
      setError(errorMsg);
      message.error(errorMsg);
      console.error('Error saving document:', err);
    } finally {
      setSaving(false);
    }
  }, [content, title, document, onSave, hasChanges]);

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

  // PDF导出功能
  const exportToPdf = useCallback(async () => {
    if (!content.trim()) {
      message.warning('文档内容为空，无法导出PDF');
      return;
    }

    setIsExportingPdf(true);
    
    try {
      // 检查全局html2pdf是否可用 (通过CDN加载)
      if (typeof window.html2pdf === 'undefined') {
        throw new Error('html2pdf.js库未加载，请刷新页面重试');
      }
      // 创建用于PDF渲染的HTML内容
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <title>任务文档 - Task ${taskId}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              background: white;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #262626;
              margin-top: 24px;
              margin-bottom: 16px;
              font-weight: 600;
            }
            h1 { font-size: 24px; border-bottom: 2px solid #1890ff; padding-bottom: 8px; }
            h2 { font-size: 20px; }
            h3 { font-size: 18px; }
            p { margin: 12px 0; }
            pre {
              background: #f6f8fa;
              border: 1px solid #e1e4e8;
              border-radius: 6px;
              padding: 16px;
              overflow-x: auto;
              font-family: 'Courier New', Consolas, monospace;
              font-size: 14px;
            }
            code {
              background: #f1f3f4;
              padding: 2px 4px;
              border-radius: 3px;
              font-family: 'Courier New', Consolas, monospace;
              font-size: 14px;
            }
            blockquote {
              border-left: 4px solid #1890ff;
              margin: 16px 0;
              padding: 8px 16px;
              background: #f9f9f9;
              color: #666;
            }
            ul, ol { padding-left: 24px; margin: 12px 0; }
            li { margin: 4px 0; }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 16px 0;
            }
            th, td {
              border: 1px solid #d0d7de;
              padding: 8px 12px;
              text-align: left;
            }
            th { background: #f6f8fa; font-weight: 600; }
            .document-header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 1px solid #e1e4e8;
            }
            .document-meta {
              color: #666;
              font-size: 14px;
              margin-top: 10px;
            }
            @media print {
              body { margin: 0; padding: 20px; }
              .document-header { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="document-header">
            <h1>任务文档</h1>
            <div class="document-meta">
              任务ID: ${taskId} | 项目ID: ${projectId} | 导出时间: ${new Date().toLocaleString('zh-CN')}
            </div>
          </div>
          <div class="document-content">
            ${await convertMarkdownToHtml(content)}
          </div>
        </body>
        </html>
      `;

      // 创建临时DOM元素用于渲染
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '794px'; // A4宽度
      tempDiv.style.backgroundColor = '#ffffff';
      document.body.appendChild(tempDiv);

      // 等待所有图片和SVG完全加载
      const waitForImages = () => {
        return new Promise<void>((resolve) => {
          const images = tempDiv.querySelectorAll('img, svg');
          if (images.length === 0) {
            resolve();
            return;
          }

          let loadedCount = 0;
          const checkAllLoaded = () => {
            loadedCount++;
            if (loadedCount >= images.length) {
              resolve();
            }
          };

          images.forEach((img) => {
            if (img.tagName === 'SVG') {
              // SVG已经渲染完成
              checkAllLoaded();
            } else if ((img as HTMLImageElement).complete) {
              checkAllLoaded();
            } else {
              (img as HTMLImageElement).onload = checkAllLoaded;
              (img as HTMLImageElement).onerror = checkAllLoaded;
            }
          });

          // 设置超时防止无限等待
          setTimeout(resolve, 3000);
        });
      };

      // 等待渲染完成
      await waitForImages();
      
      // 额外等待确保所有内容完全渲染
      await new Promise(resolve => setTimeout(resolve, 500));

      // PDF配置选项
      const opt = {
        margin: [15, 15, 15, 15],
        filename: `task-${taskId}-document-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false, // 减少控制台输出
          width: 794, // A4宽度
          height: null, // 自动高度
          scrollX: 0,
          scrollY: 0,
          // 确保SVG正确渲染
          foreignObjectRendering: true,
          removeContainer: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: ['.mermaid-container'] // 避免图表被分页
        }
      };

      // 生成并下载PDF (使用全局html2pdf对象)
      await window.html2pdf().set(opt).from(tempDiv.querySelector('.document-content')).save();
      
      message.success('PDF导出成功！流程图已包含在内。');
      
      // 清理临时DOM元素
      document.body.removeChild(tempDiv);

    } catch (error) {
      console.error('PDF导出失败:', error);
      message.error('PDF导出失败，请重试');
    } finally {
      setIsExportingPdf(false);
    }
  }, [content, taskId, projectId]);

  // 打印预览功能
  const openPrintPreview = useCallback(async () => {
    if (!content.trim()) {
      message.warning('文档内容为空，无法打印预览');
      return;
    }

    setIsPrintPreviewOpen(true);
  }, [content]);

  const closePrintPreview = useCallback(() => {
    setIsPrintPreviewOpen(false);
  }, []);

  // 打印预览窗口内容
  const renderPrintPreview = () => {
    if (!isPrintPreviewOpen) return null;

    const printContent = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>任务文档打印预览</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #fff;
          }
          
          h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
          }
          h1 { font-size: 24px; border-bottom: 1px solid #eaecef; padding-bottom: 8px; }
          h2 { font-size: 20px; }
          h3 { font-size: 18px; }
          h4 { font-size: 16px; }
          h5 { font-size: 14px; }
          h6 { font-size: 14px; color: #666; }
          
          p { margin-bottom: 16px; }
          
          ul, ol {
            margin-bottom: 16px;
            padding-left: 24px;
          }
          li { margin-bottom: 4px; }
          
          blockquote {
            margin: 16px 0;
            padding: 0 16px;
            color: #666;
            border-left: 4px solid #dfe2e5;
            background: #f8f9fa;
          }
          
          code {
            background: #f3f4f6;
            border-radius: 3px;
            font-size: 85%;
            margin: 0;
            padding: 2px 4px;
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
          }
          
          pre {
            background: #f6f8fa;
            border-radius: 6px;
            font-size: 85%;
            line-height: 1.45;
            overflow: auto;
            padding: 16px;
            margin: 16px 0;
          }
          pre code {
            background: transparent;
            border: 0;
            display: inline;
            font-size: inherit;
            line-height: inherit;
            margin: 0;
            max-width: auto;
            min-width: auto;
            overflow: visible;
            padding: 0;
            white-space: pre;
            word-wrap: normal;
          }
          
          table {
            border-collapse: collapse;
            border-spacing: 0;
            width: 100%;
            margin: 16px 0;
          }
          th, td {
            border: 1px solid #d0d7de;
            padding: 8px 12px;
            text-align: left;
          }
          th { 
            background: #f6f8fa; 
            font-weight: 600; 
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e1e4e8;
          }
          
          .print-meta {
            color: #666;
            font-size: 14px;
            margin-top: 10px;
          }
          
          .mermaid-container {
            margin: 20px 0;
            text-align: center;
            background: #fafafa;
            border: 1px solid #e1e4e8;
            border-radius: 8px;
            padding: 20px;
            page-break-inside: avoid;
          }
          
          @media print {
            body { margin: 0; padding: 20px; }
            .print-header { page-break-inside: avoid; }
            .no-print { display: none !important; }
          }
          
          @page {
            margin: 2cm;
            size: A4;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>任务文档</h1>
          <div class="print-meta">
            任务ID: ${taskId} | 项目ID: ${projectId} | 打印时间: ${new Date().toLocaleString('zh-CN')}
          </div>
        </div>
        <div class="print-content">
          ${content.replace(/```mermaid\n([\s\S]*?)```/g, (match, mermaidCode) => {
            return `<div class="mermaid-container">
              <div style="color: #666; font-style: italic; margin-bottom: 12px;">📊 Mermaid流程图</div>
              <details>
                <summary style="cursor: pointer; color: #1890ff;">查看图表代码</summary>
                <pre style="background: #f6f8fa; padding: 12px; border-radius: 4px; margin-top: 8px; font-size: 12px; text-align: left;">${mermaidCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              </details>
            </div>`;
          }).replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')}
        </div>
      </body>
      </html>
    `;

    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1060, // 高于全屏编辑器
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closePrintPreview();
          }
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            width: '90vw',
            height: '90vh',
            maxWidth: '900px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e8e8e8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fafafa',
              borderRadius: '8px 8px 0 0'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
              📄 打印预览 - 任务文档
            </h3>
            <Space>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(printContent);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
              >
                打印
              </Button>
              <Button
                onClick={closePrintPreview}
              >
                关闭
              </Button>
            </Space>
          </div>
          <iframe
            style={{
              flex: 1,
              border: 'none',
              borderRadius: '0 0 8px 8px'
            }}
            srcDoc={printContent}
            title="打印预览"
          />
        </div>
      </div>,
      document.body
    );
  };

  // 将Markdown转换为HTML的辅助函数
  const convertMarkdownToHtml = useCallback(async (markdown: string): Promise<string> => {
    // 更完善的Markdown到HTML转换，特别处理代码块和流程图
    let html = markdown;
    
    // 1. 首先处理Mermaid流程图代码块（避免其他规则干扰）
    const mermaidBlocks: string[] = [];
    
    // 异步处理Mermaid图表渲染
    const mermaidMatches = [...html.matchAll(/```mermaid\n([\s\S]*?)```/g)];
    for (const [match, mermaidCode] of mermaidMatches) {
      const placeholder = `__MERMAID_BLOCK_${mermaidBlocks.length}__`;
      const cleanCode = mermaidCode.replace(/^\n+/, '').replace(/\n+$/, ''); // 清理首尾换行
      const diagramId = `pdf-mermaid-${Date.now()}-${mermaidBlocks.length}`;
      
      try {
        
        // 使用统一的渲染工具
        const result = await renderMermaidDiagram(cleanCode, diagramId);
        
        if (result.error) {
          // 渲染失败时的降级处理
          console.warn('🎨 [TaskDocumentEditor] PDF导出：Mermaid图表渲染失败:', result.error);
          mermaidBlocks.push(`
            <div class="mermaid-container" style="margin: 20px 0; text-align: center; background: #fff2f0; border: 1px solid #ff7875; border-radius: 8px; padding: 20px;">
              <div style="color: #cf1322; font-weight: 600; margin-bottom: 12px;">❌ 图表渲染失败</div>
              <div style="color: #666; font-style: italic; margin-bottom: 12px;">错误: ${result.error}</div>
              <details style="text-align: left;">
                <summary style="cursor: pointer; color: #1890ff;">查看原始代码</summary>
                <pre style="background: #f6f8fa; padding: 12px; border-radius: 4px; margin-top: 8px; font-size: 12px; overflow-x: auto;">${cleanCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              </details>
            </div>
          `);
        } else if (result.svg) {
          // 渲染成功
          
          // 创建包含实际SVG的容器
          mermaidBlocks.push(`
            <div class="mermaid-container" style="margin: 20px 0; text-align: center; background: #fafafa; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; page-break-inside: avoid;">
              <div class="mermaid-diagram" style="display: inline-block; max-width: 100%; overflow: visible;">
                ${result.svg}
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: #666; text-align: center;">
                📊 Mermaid流程图
              </div>
            </div>
          `);
        } else {
          throw new Error('未知的渲染结果');
        }
      } catch (error: any) {
        console.warn('🎨 [TaskDocumentEditor] PDF导出：Mermaid图表渲染异常:', error);
        // 异常时的降级处理
        mermaidBlocks.push(`
          <div class="mermaid-container" style="margin: 20px 0; text-align: center; background: #fff7e6; border: 1px solid #ffd666; border-radius: 8px; padding: 20px;">
            <div style="color: #d46b08; font-weight: 600; margin-bottom: 12px;">⚠️ Mermaid图表</div>
            <div style="color: #666; font-style: italic; margin-bottom: 12px;">图表渲染需要加载Mermaid库</div>
            <details style="text-align: left;">
              <summary style="cursor: pointer; color: #1890ff;">查看原始代码</summary>
              <pre style="background: #f6f8fa; padding: 12px; border-radius: 4px; margin-top: 8px; font-size: 12px; overflow-x: auto;">${cleanCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </details>
          </div>
        `);
      }
      
      // 替换原始的markdown代码块
      html = html.replace(match, placeholder);
    }
    
    // 2. 处理其他代码块（避免其他规则干扰代码内容）
    const codeBlocks: string[] = [];
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      const lang = language || 'text';
      const cleanCode = code.replace(/^\n+/, '').replace(/\n+$/, ''); // 清理首尾换行
      codeBlocks.push(`<pre style="background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 16px; overflow-x: auto; font-family: 'Courier New', Consolas, monospace; font-size: 14px; color: #333; white-space: pre-wrap; word-wrap: break-word;"><code class="language-${lang}">${cleanCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
      return placeholder;
    });
    
    // 2. 处理行内代码
    html = html.replace(/`([^`]+)`/g, '<code style="background: #f1f3f4; padding: 2px 4px; border-radius: 3px; font-family: \'Courier New\', Consolas, monospace; font-size: 14px; color: #d73a49;">$1</code>');
    
    // 3. 处理标题
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; margin-top: 24px; margin-bottom: 16px; color: #262626; font-weight: 600;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 20px; margin-top: 24px; margin-bottom: 16px; color: #262626; font-weight: 600;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 24px; margin-top: 24px; margin-bottom: 16px; color: #262626; font-weight: 600; border-bottom: 2px solid #1890ff; padding-bottom: 8px;">$1</h1>');
    
    // 4. 处理文本样式
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>');
    
    // 5. 处理链接和图片
    html = html.replace(/!\[([^\]]*)\]\(([^\)]*)\)/g, '<img alt="$1" src="$2" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;" />');
    html = html.replace(/\[([^\]]*)\]\(([^\)]*)\)/g, '<a href="$2" style="color: #1890ff; text-decoration: none;">$1</a>');
    
    // 6. 处理引用
    html = html.replace(/^> (.*$)/gim, '<blockquote style="border-left: 4px solid #1890ff; margin: 16px 0; padding: 8px 16px; background: #f9f9f9; color: #666;">$1</blockquote>');
    
    // 7. 处理列表
    html = html.replace(/^- (.*$)/gim, '<li style="margin: 4px 0;">$1</li>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li style="margin: 4px 0;">$1</li>');
    
    // 8. 将连续的li包装在ul或ol中
    html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/gims, (match) => {
      return `<ul style="padding-left: 24px; margin: 12px 0;">${match}</ul>`;
    });
    
    // 9. 处理段落 - 将双换行符转换为段落分隔
    html = html.replace(/\n\n/g, '__PARAGRAPH_BREAK__');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/__PARAGRAPH_BREAK__/g, '</p><p style="margin: 12px 0; line-height: 1.6;">');
    html = `<p style="margin: 12px 0; line-height: 1.6;">${html}</p>`;
    
    // 10. 清理空段落和修复嵌套
    html = html.replace(/<p[^>]*><\/p>/g, '');
    html = html.replace(/<p[^>]*>(<h[1-6][^>]*>.*?<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p[^>]*>(<ul[^>]*>.*?<\/ul>)<\/p>/gims, '$1');
    html = html.replace(/<p[^>]*>(<blockquote[^>]*>.*?<\/blockquote>)<\/p>/gims, '$1');
    
    // 11. 还原Mermaid图表
    mermaidBlocks.forEach((mermaidBlock, index) => {
      html = html.replace(`__MERMAID_BLOCK_${index}__`, mermaidBlock);
    });
    
    // 12. 还原代码块
    codeBlocks.forEach((codeBlock, index) => {
      html = html.replace(`__CODE_BLOCK_${index}__`, codeBlock);
    });
    
    return html;
  }, []);

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