import { useCallback, useRef, useState } from 'react';
import { message } from 'antd';

// 拖拽状态接口
export interface DragState {
  isDragging: boolean;
  draggedItem: any;
  dropZone: string | null;
  dragOverItem: any;
}

// 拖拽配置接口
export interface DragDropConfig {
  onFilesDrop?: (files: FileList, dropZone?: string) => void;
  onItemDrop?: (draggedItem: any, targetItem: any, dropZone: string) => void;
  onItemReorder?: (items: any[], fromIndex: number, toIndex: number) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  enableItemReorder?: boolean;
  enableFileDrop?: boolean;
}

// 拖拽和放置的Hook
export const useDragAndDrop = (config: DragDropConfig) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dropZone: null,
    dragOverItem: null
  });

  const dragCounter = useRef(0);
  const draggedItemRef = useRef<any>(null);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);

  // 验证文件类型
  const validateFile = useCallback((file: File): boolean => {
    if (config.acceptedFileTypes && config.acceptedFileTypes.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type.toLowerCase();
      
      const isValidType = config.acceptedFileTypes.some(type => 
        type.startsWith('.') ? fileExtension === type.toLowerCase() : 
        mimeType.includes(type.toLowerCase())
      );

      if (!isValidType) {
        message.error(`不支持的文件类型: ${file.name}`);
        return false;
      }
    }

    if (config.maxFileSize && file.size > config.maxFileSize) {
      message.error(`文件大小超过限制: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return false;
    }

    return true;
  }, [config.acceptedFileTypes, config.maxFileSize]);

  // 处理拖拽进入
  const handleDragEnter = useCallback((e: React.DragEvent, dropZone?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current++;
    
    if (dragCounter.current === 1) {
      setDragState(prev => ({
        ...prev,
        isDragging: true,
        dropZone: dropZone || null
      }));
    }
  }, []);

  // 处理拖拽离开
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setDragState(prev => ({
        ...prev,
        isDragging: false,
        dropZone: null,
        dragOverItem: null
      }));
    }
  }, []);

  // 处理拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent, targetItem?: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 设置拖拽效果
    if (config.enableFileDrop && e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    } else if (config.enableItemReorder && draggedItemRef.current) {
      e.dataTransfer.dropEffect = 'move';
    }

    setDragState(prev => ({
      ...prev,
      dragOverItem: targetItem || null
    }));
  }, [config.enableFileDrop, config.enableItemReorder]);

  // 处理文件拖放
  const handleDrop = useCallback((e: React.DragEvent, dropZone?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current = 0;
    
    setDragState({
      isDragging: false,
      draggedItem: null,
      dropZone: null,
      dragOverItem: null
    });

    // 处理文件拖放
    if (config.enableFileDrop && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      
      // 检查文件数量限制
      if (config.maxFiles && files.length > config.maxFiles) {
        message.error(`一次最多只能上传 ${config.maxFiles} 个文件`);
        return;
      }

      // 验证所有文件
      const validFiles = Array.from(files).filter(validateFile);
      
      if (validFiles.length === 0) {
        message.error('没有有效的文件可以上传');
        return;
      }

      if (validFiles.length < files.length) {
        message.warning(`${files.length - validFiles.length} 个文件被跳过`);
      }

      // 转换为FileList
      const fileList = new DataTransfer();
      validFiles.forEach(file => fileList.items.add(file));
      
      config.onFilesDrop?.(fileList.files, dropZone);
    }
    
    // 处理项目拖放
    else if (config.enableItemReorder && draggedItemRef.current) {
      const draggedItem = draggedItemRef.current;
      const targetItem = dragState.dragOverItem;
      
      if (targetItem && draggedItem !== targetItem) {
        if (config.onItemDrop) {
          config.onItemDrop(draggedItem, targetItem, dropZone || '');
        }
      }
      
      draggedItemRef.current = null;
    }
  }, [config, dragState.dragOverItem, validateFile]);

  // 开始拖拽项目
  const handleItemDragStart = useCallback((e: React.DragEvent, item: any) => {
    if (!config.enableItemReorder) return;
    
    draggedItemRef.current = item;
    dragStartPositionRef.current = { x: e.clientX, y: e.clientY };
    
    setDragState(prev => ({
      ...prev,
      draggedItem: item
    }));

    // 设置拖拽数据
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    
    // 添加自定义拖拽图像
    const dragImage = document.createElement('div');
    dragImage.textContent = item.title || item.name || '拖拽项目';
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      background: #1890ff;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // 清理拖拽图像
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }, [config.enableItemReorder]);

  // 结束拖拽项目
  const handleItemDragEnd = useCallback((e: React.DragEvent) => {
    setDragState(prev => ({
      ...prev,
      draggedItem: null
    }));
    
    draggedItemRef.current = null;
    dragStartPositionRef.current = null;
  }, []);

  // 创建拖拽区域属性
  const createDropZoneProps = useCallback((dropZone?: string) => ({
    onDragEnter: (e: React.DragEvent) => handleDragEnter(e, dropZone),
    onDragLeave: handleDragLeave,
    onDragOver: (e: React.DragEvent) => handleDragOver(e),
    onDrop: (e: React.DragEvent) => handleDrop(e, dropZone)
  }), [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  // 创建可拖拽项目属性
  const createDraggableProps = useCallback((item: any, isDraggable: boolean = true) => ({
    draggable: isDraggable && config.enableItemReorder,
    onDragStart: (e: React.DragEvent) => handleItemDragStart(e, item),
    onDragEnd: handleItemDragEnd,
    onDragOver: (e: React.DragEvent) => handleDragOver(e, item)
  }), [config.enableItemReorder, handleItemDragStart, handleItemDragEnd, handleDragOver]);

  // 重置拖拽状态
  const resetDragState = useCallback(() => {
    dragCounter.current = 0;
    draggedItemRef.current = null;
    dragStartPositionRef.current = null;
    setDragState({
      isDragging: false,
      draggedItem: null,
      dropZone: null,
      dragOverItem: null
    });
  }, []);

  return {
    dragState,
    createDropZoneProps,
    createDraggableProps,
    resetDragState,
    isDragActive: dragState.isDragging
  };
};

export default useDragAndDrop;