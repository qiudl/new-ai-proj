/**
 * 文件上传服务
 * File Upload Service
 */

import apiClient from './api';

export interface UploadImageResponse {
  url: string;
  filename: string;
  size: number;
  type: string;
}

/**
 * 上传图片文件
 * @param file 图片文件
 * @returns 上传结果，包含图片URL
 */
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post<UploadImageResponse>('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.url;
};

/**
 * 上传图片并返回完整响应
 * @param file 图片文件
 * @param onProgress 上传进度回调
 * @returns 完整上传结果
 */
export const uploadImageWithProgress = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadImageResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post<UploadImageResponse>('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });

  return response.data;
};

/**
 * 验证图片文件
 * @param file 文件对象
 * @param maxSizeMB 最大文件大小（MB），默认10MB
 * @returns 验证结果
 */
export const validateImageFile = (file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } => {
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '不支持的图片格式。支持的格式：JPG, PNG, GIF, WEBP, SVG',
    };
  }

  // 检查文件大小
  const maxSize = maxSizeMB * 1024 * 1024; // 转换为字节
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `文件大小超过限制。最大允许 ${maxSizeMB}MB，当前文件 ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return { valid: true };
};

/**
 * 压缩图片（仅在浏览器支持Canvas的情况下）
 * @param file 原始图片文件
 * @param maxWidth 最大宽度，默认1920
 * @param maxHeight 最大高度，默认1080
 * @param quality 压缩质量，0-1之间，默认0.8
 * @returns 压缩后的Blob
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 计算缩放比例
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取Canvas上下文'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('图片压缩失败'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
};

const uploadService = {
  uploadImage,
  uploadImageWithProgress,
  validateImageFile,
  compressImage,
};

export default uploadService;
