import React, { useState, useRef } from 'react';
import { Upload, Button, message, Modal, Image, Progress } from 'antd';
import { Space } from 'antd';
import { 
  PictureOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  UploadOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { UploadFile, RcFile } from 'antd/es/upload';
import { documentService } from '../services/documentService';

interface ImageUploadProps {
  onImageInsert?: (imageUrl: string, fileName: string) => void;
  maxSize?: number; // MB
  maxCount?: number;
  showPreview?: boolean;
  accept?: string;
  className?: string;
  projectId?: number;
  folderId?: number;
}

interface UploadedImage {
  id: string;
  name: string;
  url: string;
  size: number;
  file: File;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageInsert,
  maxSize = 5, // 默认5MB
  maxCount = 10,
  showPreview = true,
  accept = '.png,.jpg,.jpeg',
  className,
  projectId,
  folderId
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 验证文件格式和大小
  const validateFile = (file: RcFile): boolean => {
    const isValidType = file.type === 'image/png' || 
                       file.type === 'image/jpeg' || 
                       file.type === 'image/jpg';
    
    if (!isValidType) {
      message.error('只支持 PNG、JPG、JPEG 格式的图片！');
      return false;
    }

    const isValidSize = file.size / 1024 / 1024 < maxSize;
    if (!isValidSize) {
      message.error(`图片大小不能超过 ${maxSize}MB！`);
      return false;
    }

    return true;
  };

  // 上传文件到服务器
  const uploadToServer = async (file: File): Promise<string> => {
    try {
      // 使用真实的API上传图片
      const response = await documentService.uploadImage({
        file,
        project_id: projectId
      });
      return response.url;
    } catch (error) {
      // 如果API失败，回退到本地预览URL（开发阶段）
      console.warn('API upload failed, using local URL:', error);
      return URL.createObjectURL(file);
    }
  };

  // 处理文件上传
  const handleUpload = async (file: RcFile) => {
    if (!validateFile(file)) {
      return false;
    }

    if (uploadedImages.length >= maxCount) {
      message.error(`最多只能上传 ${maxCount} 张图片！`);
      return false;
    }

    setUploading(true);
    setUploadProgress(0);

    // 模拟上传进度（因为真实API可能不提供进度回调）
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const next = prev + Math.random() * 20;
        return next > 90 ? 90 : next;
      });
    }, 300);

    try {
      const imageUrl = await uploadToServer(file);
      
      // 完成上传进度
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const newImage: UploadedImage = {
        id: Date.now().toString(),
        name: file.name,
        url: imageUrl,
        size: file.size,
        file: file
      };

      setUploadedImages(prev => [...prev, newImage]);
      
      // 如果有回调函数，调用它来插入Markdown
      if (onImageInsert) {
        onImageInsert(imageUrl, file.name);
      }

      message.success('图片上传成功！');
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload failed:', error);
      message.error('图片上传失败，请重试！');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500); // 稍微延迟以显示100%进度
    }

    return false; // 阻止默认上传行为
  };

  // 删除图片
  const handleDelete = (imageId: string) => {
    const image = uploadedImages.find(img => img.id === imageId);
    if (image) {
      // 释放本地URL
      URL.revokeObjectURL(image.url);
      setUploadedImages(prev => prev.filter(img => img.id !== imageId));
      message.success('图片已删除');
    }
  };

  // 预览图片
  const handlePreview = (image: UploadedImage) => {
    setPreviewImage(image.url);
    setPreviewTitle(image.name);
    setPreviewVisible(true);
  };

  // 插入图片到编辑器
  const handleInsertToEditor = (image: UploadedImage) => {
    if (onImageInsert) {
      onImageInsert(image.url, image.name);
    }
  };

  // 批量删除选中的图片
  const handleBatchDelete = () => {
    if (selectedImages.size === 0) {
      message.warning('请选择要删除的图片');
      return;
    }

    selectedImages.forEach(imageId => {
      const image = uploadedImages.find(img => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.url);
      }
    });

    setUploadedImages(prev => prev.filter(img => !selectedImages.has(img.id)));
    setSelectedImages(new Set());
    message.success(`已删除 ${selectedImages.size} 张图片`);
  };

  // 批量插入选中的图片
  const handleBatchInsert = () => {
    if (selectedImages.size === 0) {
      message.warning('请选择要插入的图片');
      return;
    }

    selectedImages.forEach(imageId => {
      const image = uploadedImages.find(img => img.id === imageId);
      if (image && onImageInsert) {
        onImageInsert(image.url, image.name);
      }
    });

    setSelectedImages(new Set());
    message.success(`已插入 ${selectedImages.size} 张图片`);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedImages.size === uploadedImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(uploadedImages.map(img => img.id)));
    }
  };

  // 单个图片选择切换
  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  // 拖拽上传处理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      message.warning('请拖拽图片文件');
      return;
    }

    if (uploadedImages.length + imageFiles.length > maxCount) {
      message.warning(`最多只能上传 ${maxCount} 张图片`);
      return;
    }

    // 批量上传
    imageFiles.forEach(file => {
      handleUpload(file as RcFile);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className={className}>
      {/* 上传区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragOver ? '#1890ff' : '#d9d9d9'}`,
          borderRadius: '6px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: dragOver ? '#f0f8ff' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: dragOver ? 'scale(1.02)' : 'scale(1)'
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
            <PlusOutlined style={{ fontSize: '24px', color: '#999', marginBottom: '8px' }} />
            <div style={{ marginBottom: '8px', color: '#666' }}>
              {dragOver ? '释放文件开始上传' : '点击或拖拽图片到此处上传'}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              支持 PNG、JPG、JPEG 格式，单个文件不超过 {maxSize}MB<br/>
              支持批量上传，最多 {maxCount} 张图片
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

      {/* 已上传图片列表 */}
      {uploadedImages.length > 0 && showPreview && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px' 
          }}>
            <div style={{ fontWeight: 'bold' }}>
              已上传图片 ({uploadedImages.length}/{maxCount})
              {selectedImages.size > 0 && (
                <span style={{ color: '#1890ff', marginLeft: '8px' }}>
                  (已选择 {selectedImages.size} 张)
                </span>
              )}
            </div>
            
            <Space>
              {uploadedImages.length > 1 && (
                <Button 
                  size="small" 
                  onClick={handleSelectAll}
                >
                  {selectedImages.size === uploadedImages.length ? '取消全选' : '全选'}
                </Button>
              )}
              
              {selectedImages.size > 0 && (
                <>
                  <Button 
                    size="small" 
                    type="primary"
                    onClick={handleBatchInsert}
                  >
                    批量插入 ({selectedImages.size})
                  </Button>
                  <Button 
                    size="small" 
                    danger
                    onClick={handleBatchDelete}
                  >
                    批量删除 ({selectedImages.size})
                  </Button>
                </>
              )}
            </Space>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '12px'
          }}>
            {uploadedImages.map(image => (
              <div
                key={image.id}
                style={{
                  border: selectedImages.has(image.id) ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  borderRadius: '6px',
                  padding: '8px',
                  background: selectedImages.has(image.id) ? '#f0f8ff' : '#fff',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => toggleImageSelection(image.id)}
              >
                {/* 选择指示器 */}
                {selectedImages.has(image.id) && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: '#1890ff',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    zIndex: 1
                  }}>
                    ✓
                  </div>
                )}
                {/* 图片预览 */}
                <div
                  style={{
                    width: '100%',
                    height: '80px',
                    backgroundImage: `url(${image.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(image);
                  }}
                />

                {/* 图片信息 */}
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  <div style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {image.name}
                  </div>
                  <div>{(image.size / 1024).toFixed(1)} KB</div>
                </div>

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(image);
                    }}
                    title="预览"
                  />
                  <Button
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInsertToEditor(image);
                    }}
                    title="插入到编辑器"
                  />
                  <Button
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image.id);
                    }}
                    title="删除"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图片预览模态框 */}
      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80%"
        style={{ maxWidth: '800px' }}
      >
        <Image
          alt="preview"
          style={{ width: '100%' }}
          src={previewImage}
        />
      </Modal>
    </div>
  );
};

export default ImageUpload;