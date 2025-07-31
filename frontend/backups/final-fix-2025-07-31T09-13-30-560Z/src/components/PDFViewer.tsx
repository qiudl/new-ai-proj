// @ts-nocheck
import React, { useState} from 'react';
import { Upload, message, Modal, Card} from 'antd';
import { 
 FilePdfOutlined, 
 UploadOutlined
} from '@ant-design/icons';
import { RcFile } from 'antd/es/upload';
import unifiedDocumentService from '../services/unifiedDocumentService';

interface PDFViewerProps {
  onPDFInsert?: (pdfUrl: string, fileName: string) => void;
  maxSize?: number; // MB
  maxCount?: number;
  showPreview?: boolean;
  accept?: string;
  className?: string;
  projectId?: number;
  folderId?: number;
}

interface UploadedPDF {
  id: string;
  name: string;
  url: string;
  size: number;
  file: File;
  thumbnail?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  onPDFInsert,
  maxSize = 10, // 默认10MB
  maxCount = 5,
  showPreview = true,
  accept = '.pdf',
  className,
  projectId,
  folderId
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedPDFs, setUploadedPDFs] = useState<UploadedPDF[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPDF, setPreviewPDF] = useState<UploadedPDF | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 验证PDF文件格式和大小
  const validateFile = (file: RcFile): boolean => {
    const isValidType = file.type === 'application/pdf';
    
    if (!isValidType) {
      message.error('只支持 PDF 格式的文件！');
      return false;
    }

    const isValidSize = file.size / 1024 / 1024 < maxSize;
    if (!isValidSize) {
      message.error(`PDF文件大小不能超过 ${maxSize}MB！`);
      return false;
    }

    return true;
  };

  // 上传PDF文件到服务器
  const uploadToServer = async (file: File): Promise<string> => {
    try {
      // 使用真实的API上传PDF
      // PDF upload functionality not yet implemented in unified service
      // const response = await unifiedDocumentService.uploadFile(file, 'pdf', { project_id: projectId });
      // Using fallback for now
      throw new Error('PDF upload not implemented yet');
    } catch (error) {
      // 如果API失败，回退到本地预览URL（开发阶段）
      console.warn('API upload failed, using local URL:', error);
      return URL.createObjectURL(file);
    }
  };

  // 处理PDF文件上传
  const handleUpload = async (file: RcFile) => {
    if (!validateFile(file)) {
      return false;
    }

    if (uploadedPDFs.length >= maxCount) {
      message.error(`最多只能上传 ${maxCount} 个PDF文件！`);
      return false;
    }

    setUploading(true);
    setUploadProgress(0);

    // 模拟上传进度
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const next = prev + Math.random() * 15;
        return next > 90 ? 90 : next;
      });
    }, 400);

    try {
      const pdfUrl = await uploadToServer(file);
      
      // 完成上传进度
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const newPDF: UploadedPDF = {
        id: Date.now().toString(),
        name: file.name,
        url: pdfUrl,
        size: file.size,
        file: file
      };

      setUploadedPDFs(prev => [...prev, newPDF]);
      
      // 如果有回调函数，调用它来插入文档引用
      if (onPDFInsert) {
        onPDFInsert(pdfUrl, file.name);
      }

      message.success('PDF文件上传成功！');
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload failed:', error);
      message.error('PDF上传失败，请重试！');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }

    return false; // 阻止默认上传行为
  };

  // 删除PDF文件
  const handleDelete = (pdfId: string) => {
    const pdf = uploadedPDFs.find(p => p.id === pdfId);
    if (pdf) {
      // 释放本地URL
      URL.revokeObjectURL(pdf.url);
      setUploadedPDFs(prev => prev.filter(p => p.id !== pdfId));
      message.success('PDF文件已删除');
    }
  };

  // 预览PDF文件
  const handlePreview = (pdf: UploadedPDF) => {
    setPreviewPDF(pdf);
    setPreviewVisible(true);
  };

  // 下载PDF文件
  const handleDownload = (pdf: UploadedPDF) => {
    const link = document.createElement('a');
    link.href = pdf.url;
    link.download = pdf.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 插入PDF到编辑器
  const handleInsertToEditor = (pdf: UploadedPDF) => {
    if (onPDFInsert) {
      onPDFInsert(pdf.url, pdf.name);
    }
  };

  // 拖拽上传处理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    files.forEach(file => {
      if (file.type === 'application/pdf') {
        handleUpload(file as RcFile);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* 上传区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: '2px dashed #d9d9d9',
          borderRadius: '6px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#fafafa',
          cursor: 'pointer',
          transition: 'border-color 0.3s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#1890ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#d9d9d9';
        }}
      >
        <Upload
          accept={accept}
          beforeUpload={handleUpload}
          showUploadList={false}
          multiple
          style={{ width: '100%' }}
        >
          <div>
            <FilePdfOutlined style={{ fontSize: '24px', color: '#ff4d4f', marginBottom: '8px' }} />
            <div style={{ marginBottom: '8px', color: '#666' }}>
              点击或拖拽PDF文件到此处上传
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              支持 PDF 格式，单个文件不超过 {maxSize}MB
            </div>
          </div>
        </Upload>
      </div>

      {/* 上传进度 */}
      {uploading && (
        <div style={{ margin: '16px 0' }}>
          <Progress 
            percent={Math.round(uploadProgress)} 
            status={uploadProgress === 100 ? 'success' : 'active'}
            showInfo={true}
          />
        </div>
      )}

      {/* 已上传PDF文件列表 */}
      {uploadedPDFs.length > 0 && showPreview && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            已上传PDF文件 ({uploadedPDFs.length}/{maxCount})
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '12px'
          }}>
            {uploadedPDFs.map(pdf => (
              <Card
                key={pdf.id}
                size="small"
                style={{ background: '#f9f9f9' }}
                styles={{ body: { padding: '12px' } }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* PDF图标 */}
                  <FilePdfOutlined 
                    style={{ 
                      fontSize: '32px', 
                      color: '#ff4d4f',
                      minWidth: '32px'
                    }} 
                  />

                  {/* 文件信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '4px',
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }}>
                      {pdf.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {formatFileSize(pdf.size)}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handlePreview(pdf)}
                      title="预览"
                    >
                      预览
                    </Button>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(pdf)}
                      title="下载"
                    >
                      下载
                    </Button>
                    <Button
                      size="small"
                      icon={<UploadOutlined />}
                      onClick={() => handleInsertToEditor(pdf)}
                      title="插入到编辑器"
                    >
                      插入
                    </Button>
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => handleDelete(pdf.id)}
                      title="删除"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PDF预览模态框 */}
      <Modal
        open={previewVisible}
        title={previewPDF?.name}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={() => previewPDF && handleDownload(previewPDF)}>
            下载
          </Button>,
          <Button key="insert" type="primary" icon={<UploadOutlined />} onClick={() => {
            if (previewPDF) {
              handleInsertToEditor(previewPDF);
              setPreviewVisible(false);
            }
          }}>
            插入到编辑器
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        onCancel={() => setPreviewVisible(false)}
        width="90%"
        style={{ maxWidth: '1000px', top: 20 }}
        styles={{ body: { padding: '16px', height: '70vh' } }}
      >
        {previewPDF && (
          <div style={{ height: '100%', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
            <iframe
              src={previewPDF.url}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                borderRadius: '4px'
              }}
              title={previewPDF.name}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PDFViewer;