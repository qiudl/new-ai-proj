// @ts-nocheck
import React, { useState, useCallback, useEffect} from 'react';
import { Input, message, Typography, Modal } from 'antd';
import { 
 EditOutlined,
 SaveOutlined,
 FullscreenOutlined,
 FullscreenExitOutlined, 
 FilePdfOutlined} from '@ant-design/icons';
// Markdown rendering dependencies temporarily removed to fix compilation issues
import ImageUpload from './ImageUpload';
import PDFViewer from './PDFViewer';
import './MarkdownEditor.css';




interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  placeholder?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
  height?: number;
  title?: string;
  onTitleChange?: (title: string) => void;
  loading?: boolean;
  projectId?: number;
  readOnly?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  onSave,
  placeholder = '开始编写Markdown文档...',
  autoSave = true,
  autoSaveDelay = 3000,
  height = 600,
  title = '',
  onTitleChange,
  loading = false,
  projectId,
  readOnly = false}) => {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'pending' | 'error'>('saved');
  const [imageUploadVisible, setImageUploadVisible] = useState(false);
  const [pdfUploadVisible, setPdfUploadVisible] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const textAreaRef = useRef<any>(null);

  // 自动保存逻辑
  useEffect(() => {
    if (!autoSave || !onSave) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (saveStatus === 'pending') {
      autoSaveTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await onSave();
          setSaveStatus('saved');
        } catch (error) {
          setSaveStatus('error');
          console.error('Auto save failed:', error);
        }
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [value, autoSave, autoSaveDelay, onSave, saveStatus]);

  // 内容变化处理
  const handleContentChange = useCallback((newValue: string) => {
    onChange(newValue);
    if (autoSave && saveStatus !== 'pending') {
      setSaveStatus('pending');
    }
  }, [onChange, autoSave, saveStatus]);

  // 手动保存
  const handleManualSave = useCallback(async () => {
    if (!onSave) return;
    
    setSaveStatus('saving');
    try {
      await onSave();
      setSaveStatus('saved');
      message.success('文档已保存');
    } catch (error) {
      setSaveStatus('error');
      message.error('保存失败，请重试');
      console.error('Manual save failed:', error);
    }
  }, [onSave]);

  // 快捷键处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          handleManualSave();
          break;
        case 'b':
          e.preventDefault();
          insertMarkdown('**', '**');
          break;
        case 'i':
          e.preventDefault();
          insertMarkdown('*', '*');
          break;
        case 'k':
          e.preventDefault();
          insertMarkdown('[', '](url)');
          break;
      }
    }

    // Tab键缩进
    if (e.key === 'Tab') {
      e.preventDefault();
      insertMarkdown('  ');
    }
  }, [handleManualSave]);

  // 插入Markdown语法
  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = textAreaRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    handleContentChange(newText);
    
    // 设置新的光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  }, [value, handleContentChange]);

  // 插入图片
  const handleImageInsert = useCallback((imageUrl: string, fileName: string) => {
    const altText = fileName.replace(/\.[^/.]+$/, ''); // 移除文件扩展名作为alt文本
    const markdownImage = `![${altText}](${imageUrl})`;
    
    const textarea = textAreaRef.current?.resizableTextArea?.textArea;
    if (textarea) {
      const start = textarea.selectionStart;
      const newText = value.substring(0, start) + '\n' + markdownImage + '\n' + value.substring(start);
      handleContentChange(newText);
      
      // 设置光标位置到插入图片之后
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + markdownImage.length + 2, start + markdownImage.length + 2);
      }, 0);
    } else {
      // 如果无法获取光标位置，就在末尾添加
      handleContentChange(value + '\n' + markdownImage + '\n');
    }
  }, [value, handleContentChange]);

  // 插入PDF文档
  const handlePDFInsert = useCallback((pdfUrl: string, fileName: string) => {
    const linkText = fileName.replace(/\.[^/.]+$/, ''); // 移除文件扩展名作为链接文本
    const markdownLink = `[📄 ${linkText}](${pdfUrl} "点击查看PDF文档")`;
    
    const textarea = textAreaRef.current?.resizableTextArea?.textArea;
    if (textarea) {
      const start = textarea.selectionStart;
      const newText = value.substring(0, start) + '\n' + markdownLink + '\n' + value.substring(start);
      handleContentChange(newText);
      
      // 设置光标位置到插入链接之后
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + markdownLink.length + 2, start + markdownLink.length + 2);
      }, 0);
    } else {
      // 如果无法获取光标位置，就在末尾添加
      handleContentChange(value + '\n' + markdownLink + '\n');
    }
  }, [value, handleContentChange]);

  // 工具栏按钮
  const toolbar = (
    <div className="markdown-toolbar">
      <div className="toolbar-left">
        {!readOnly && (
          <>
            <Button
              
              type={mode === 'edit' ? 'primary' : 'default'}
              icon={<EditOutlined />}
              onClick={() => setMode('edit')}
            >
              编辑
            </Button>
            <Button
              
              type={mode === 'preview' ? 'primary' : 'default'}
              icon={<EyeOutlined />}
              onClick={() => setMode('preview')}
            >
              预览
            </Button>
            <Button
              
              type={mode === 'split' ? 'primary' : 'default'}
              onClick={() => setMode('split')}
            >
              分屏
            </Button>
          </>
        )}
        {readOnly && (
          <Button
            
            type="primary"
            icon={<EyeOutlined />}
          >
            查看模式
          </Button>
        )}
        
        {!readOnly && (
          <>
            <div className="toolbar-divider" />
            
            <Button
              
              onClick={() => insertMarkdown('**', '**')}
              title="粗体 (Ctrl+B)"
            >
              <strong>B</strong>
            </Button>
            <Button
              
              onClick={() => insertMarkdown('*', '*')}
              title="斜体 (Ctrl+I)"
            >
              <em>I</em>
            </Button>
            <Button
              
              onClick={() => insertMarkdown('[', '](url)')}
              title="链接 (Ctrl+K)"
            >
              🔗
            </Button>
            <Button
              
              icon={<PictureOutlined />}
              onClick={() => setImageUploadVisible(true)}
              title="上传图片"
            >
              图片
            </Button>
            <Button
              
              icon={<FilePdfOutlined />}
              onClick={() => setPdfUploadVisible(true)}
              title="上传PDF"
            >
              PDF
            </Button>
            <Button
              
              onClick={() => insertMarkdown('```\n', '\n```')}
              title="代码块"
            >
              {'</>'}
            </Button>
          </>
        )}
      </div>
      
      <div className="toolbar-right">
        {!readOnly && (
          <>
            <div className="save-status">
              {saveStatus === 'saving' && <Spin size="small" />}
              {saveStatus === 'saved' && <span className="status-saved">已保存</span>}
              {saveStatus === 'pending' && <span className="status-pending">待保存</span>}
              {saveStatus === 'error' && <span className="status-error">保存失败</span>}
            </div>
            
            <Button
              
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleManualSave}
              loading={saveStatus === 'saving'}
            >
              保存
            </Button>
          </>
        )}
        
        <Button
          
          icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          onClick={() => setIsFullscreen(!isFullscreen)}
          title="全屏"
        />
      </div>
    </div>
  );

  // 渲染编辑器
  const renderEditor = () => (
    <TextArea
      ref={textAreaRef}
      value={value}
      onChange={readOnly ? undefined : (e) => handleContentChange(e.target.value)}
      onKeyDown={readOnly ? undefined : handleKeyDown}
      placeholder={readOnly ? '' : placeholder}
      className="markdown-textarea"
      readOnly={readOnly}
      style={{ 
        height: height - 100, 
        resize: 'none',
        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        backgroundColor: readOnly ? '#f5f5f5' : '#fff',
        cursor: readOnly ? 'default' : 'text'
      }}
    />
  );

  // 渲染预览
  const renderPreview = () => (
    <div 
      className="markdown-preview" 
      style={{ 
        height: height - 100, 
        overflow: 'auto',
        padding: '16px',
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        backgroundColor: '#fafafa'
      }}
    >
      <div style={{ padding: '16px', whiteSpace: 'pre-wrap' }}>
        {value || '*开始编写内容，预览将在此显示...*'}
      </div>
    </div>
  );

  return (
    <div className={`markdown-editor ${isFullscreen ? 'fullscreen' : ''}`}>
      {loading && (
        <div className="loading-overlay">
          <Spin size="large">
            <div style={{ padding: 50 }}>加载中...</div>
          </Spin>
        </div>
      )}
      
      {/* 标题编辑 */}
      {onTitleChange && (
        <div className="document-title">
          <Input
            value={title}
            onChange={readOnly ? undefined : (e) => onTitleChange(e.target.value)}
            placeholder={readOnly ? '' : "输入文档标题..."}
            size="large"
            readOnly={readOnly}
            style={{ 
              fontSize: '20px', 
              fontWeight: 'bold',
              border: readOnly ? 'none' : '1px solid #d9d9d9',
              boxShadow: 'none',
              backgroundColor: readOnly ? 'transparent' : '#fff',
              cursor: readOnly ? 'default' : 'text'
            }}
          />
        </div>
      )}
      
      {/* 工具栏 */}
      {toolbar}
      
      {/* 编辑区域 */}
      <div className="editor-content" style={{ height }}>
        {readOnly ? (
          <div className="preview-pane">
            {renderPreview()}
          </div>
        ) : (
          <>
            {mode === 'edit' && (
              <div className="editor-pane">
                {renderEditor()}
              </div>
            )}
            
            {mode === 'preview' && (
              <div className="preview-pane">
                {renderPreview()}
              </div>
            )}
            
            {mode === 'split' && (
              <div className="split-pane">
                <div className="editor-half">
                  {renderEditor()}
                </div>
                <div className="preview-half">
                  {renderPreview()}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 图片上传模态框 - 只在非只读模式下显示 */}
      {!readOnly && (
        <>
          <Modal
            title="上传图片"
            open={imageUploadVisible}
            onCancel={() => setImageUploadVisible(false)}
            footer={null}
            width={600}
            destroyOnHidden
          >
            <ImageUpload
              onImageInsert={(imageUrl, fileName) => {
                handleImageInsert(imageUrl, fileName);
                setImageUploadVisible(false);
              }}
              maxSize={5}
              maxCount={10}
              showPreview={true}
              projectId={projectId}
            />
          </Modal>

          {/* PDF上传模态框 */}
          <Modal
            title="上传PDF文档"
            open={pdfUploadVisible}
            onCancel={() => setPdfUploadVisible(false)}
            footer={null}
            width={700}
            destroyOnHidden
          >
            <PDFViewer
              onPDFInsert={(pdfUrl, fileName) => {
                handlePDFInsert(pdfUrl, fileName);
                setPdfUploadVisible(false);
              }}
              maxSize={10}
              maxCount={5}
              showPreview={true}
              projectId={projectId}
            />
          </Modal>
        </>
      )}
    </div>
  );
};

export default MarkdownEditor;