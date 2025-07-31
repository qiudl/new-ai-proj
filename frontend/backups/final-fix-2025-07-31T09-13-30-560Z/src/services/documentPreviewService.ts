/**
 * 文档预览服务
 * 处理文档预览、缩略图生成和缓存
 */

import { Document, DocumentType } from '../types/document';

export interface PreviewOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp';
  enableCache?: boolean;
}

export interface ThumbnailOptions extends PreviewOptions {
  width?: number;
  height?: number;
  crop?: boolean;
}

export interface PreviewResult {
  content: string;
  contentType: string;
  size: number;
  generatedAt: number;
}

export interface ThumbnailResult {
  url: string;
  width: number;
  height: number;
  size: number;
  generatedAt: number;
}

class DocumentPreviewService {
  private cache = new Map<string, PreviewResult | ThumbnailResult>();
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

  /**
   * 生成文档预览内容
   */
  async generatePreview(
    document: Document, 
    options: PreviewOptions = {}
  ): Promise<PreviewResult> {
    const cacheKey = this.getCacheKey('preview', document.id, document.updated_at, options);
    
    if (options.enableCache !== false) {
      const cached = this.getFromCache<PreviewResult>(cacheKey);
      if (cached) return cached;
    }

    try {
      const content = await this.renderDocumentContent(document, options);
      const result: PreviewResult = {
        content,
        contentType: this.getContentType(document.type),
        size: new Blob([content]).size,
        generatedAt: Date.now()
      };

      if (options.enableCache !== false) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('文档预览生成失败:', error);
      throw new Error(`预览生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成文档缩略图
   */
  async generateThumbnail(
    document: Document,
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult> {
    const {
      width = 200,
      height = 150,
      quality = 0.8,
      format = 'png',
      crop = true,
      enableCache = true
    } = options;

    const cacheKey = this.getCacheKey('thumbnail', document.id, document.updated_at, options);
    
    if (enableCache) {
      const cached = this.getFromCache<ThumbnailResult>(cacheKey);
      if (cached) return cached;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法获取Canvas上下文');
      }

      // 设置画布尺寸
      canvas.width = width;
      canvas.height = height;

      // 绘制缩略图
      await this.drawThumbnail(ctx, document, { width, height, crop });

      // 转换为数据URL
      const dataUrl = canvas.toDataURL(`image/${format}`, quality);
      
      const result: ThumbnailResult = {
        url: dataUrl,
        width,
        height,
        size: this.estimateDataUrlSize(dataUrl),
        generatedAt: Date.now()
      };

      if (enableCache) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('缩略图生成失败:', error);
      throw new Error(`缩略图生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量生成缩略图
   */
  async generateThumbnailsBatch(
    documents: Document[],
    options: ThumbnailOptions = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<number, ThumbnailResult>> {
    const results = new Map<number, ThumbnailResult>();
    const total = documents.length;

    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      try {
        const thumbnail = await this.generateThumbnail(document, options);
        results.set(document.id, thumbnail);
      } catch (error) {
        console.warn(`文档 ${document.id} 缩略图生成失败:`, error);
      }

      onProgress?.(i + 1, total);
    }

    return results;
  }

  /**
   * 渲染文档内容
   */
  private async renderDocumentContent(
    document: Document,
    options: PreviewOptions
  ): Promise<string> {
    const { type, content = '' } = document;

    switch (type) {
      case 'markdown':
        return await this.renderMarkdown(content, options);
      
      case 'html':
        return this.sanitizeHtml(content);
      
      case 'text':
        return this.renderPlainText(content);
      
      case 'json':
        return this.renderJson(content);
      
      case 'code':
        return this.renderCode(content, document.file_extension);
      
      case 'excel':
      case 'word':
      case 'pdf':
        return this.renderOfficeDocument(document);
      
      default:
        return this.renderUnsupported(document);
    }
  }

  /**
   * 渲染Markdown内容
   */
  private async renderMarkdown(content: string, options: PreviewOptions): Promise<string> {
    try {
      // 动态导入marked库
      const { marked } = await import('marked');
      
      // 配置marked选项
      marked.setOptions({
        breaks: true,
        gfm: true
      });

      const html = await marked(content);
      return this.wrapInPreviewTemplate(html, 'markdown');
    } catch (error) {
      throw new Error(`Markdown渲染失败: ${error}`);
    }
  }

  /**
   * 渲染纯文本
   */
  private renderPlainText(content: string): string {
    const escaped = this.escapeHtml(content);
    const html = `<pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; line-height: 1.5;">${escaped}</pre>`;
    return this.wrapInPreviewTemplate(html, 'text');
  }

  /**
   * 渲染JSON内容
   */
  private renderJson(content: string): string {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      const html = `<pre style="background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; font-family: 'Courier New', monospace;"><code>${this.escapeHtml(formatted)}</code></pre>`;
      return this.wrapInPreviewTemplate(html, 'json');
    } catch {
      // 如果JSON解析失败，按纯文本处理
      return this.renderPlainText(content);
    }
  }

  /**
   * 渲染代码内容
   */
  private renderCode(content: string, extension?: string): string {
    const language = extension ? this.getLanguageFromExtension(extension) : 'text';
    const html = `<pre style="background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto;"><code class="language-${language}">${this.escapeHtml(content)}</code></pre>`;
    return this.wrapInPreviewTemplate(html, 'code');
  }

  /**
   * 渲染Office文档
   */
  private renderOfficeDocument(document: Document): string {
    const html = `
      <div style="text-align: center; padding: 40px; background: #fafafa; border-radius: 8px;">
        <div style="font-size: 48px; margin-bottom: 16px; color: #1890ff;">
          ${this.getDocumentIcon(document.type)}
        </div>
        <h3 style="margin: 0 0 8px 0; color: #333;">${document.title}</h3>
        <p style="color: #666; margin: 0;">需要下载查看完整内容</p>
        <div style="margin-top: 16px;">
          <span style="background: #e6f7ff; color: #1890ff; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
            ${document.type.toUpperCase()}
          </span>
        </div>
      </div>
    `;
    return this.wrapInPreviewTemplate(html, document.type);
  }

  /**
   * 渲染不支持的文档类型
   */
  private renderUnsupported(document: Document): string {
    const html = `
      <div style="text-align: center; padding: 40px; background: #fafafa; border-radius: 8px;">
        <div style="font-size: 48px; margin-bottom: 16px; color: #999;">
          📄
        </div>
        <h3 style="margin: 0 0 8px 0; color: #333;">无法预览此文档</h3>
        <p style="color: #666; margin: 0 0 16px 0;">不支持 ${document.type} 类型的预览</p>
        <div style="text-align: left; background: #fff; padding: 16px; border-radius: 4px; border: 1px solid #f0f0f0;">
          <p style="margin: 0 0 8px 0;"><strong>文档信息:</strong></p>
          <p style="margin: 0 0 4px 0;">标题: ${document.title}</p>
          <p style="margin: 0 0 4px 0;">类型: ${document.type}</p>
          <p style="margin: 0 0 4px 0;">大小: ${document.content?.length || 0} 字符</p>
          <p style="margin: 0;">更新时间: ${new Date(document.updated_at).toLocaleString()}</p>
        </div>
      </div>
    `;
    return this.wrapInPreviewTemplate(html, 'unsupported');
  }

  /**
   * 绘制缩略图
   */
  private async drawThumbnail(
    ctx: CanvasRenderingContext2D,
    document: Document,
    options: { width: number; height: number; crop: boolean }
  ): Promise<void> {
    const { width, height } = options;

    // 设置背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 绘制文档图标
    const iconSize = Math.min(width, height) * 0.3;
    const iconX = (width - iconSize) / 2;
    const iconY = height * 0.2;

    ctx.fillStyle = this.getDocumentColor(document.type);
    ctx.fillRect(iconX, iconY, iconSize, iconSize);

    // 绘制文档标题
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${Math.max(12, width * 0.06)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const title = document.title || '未命名文档';
    const maxTitleLength = Math.floor(width / 8);
    const displayTitle = title.length > maxTitleLength 
      ? title.substring(0, maxTitleLength) + '...' 
      : title;
    
    ctx.fillText(displayTitle, width / 2, iconY + iconSize + 20);

    // 绘制文档类型标签
    ctx.font = `${Math.max(10, width * 0.05)}px Arial`;
    ctx.fillStyle = '#666666';
    ctx.fillText(document.type.toUpperCase(), width / 2, iconY + iconSize + 40);

    // 绘制内容预览
    if (document.content) {
      const previewText = document.content.substring(0, 200).replace(/\n/g, ' ');
      const words = previewText.split(' ');
      const lineHeight = 12;
      const startY = iconY + iconSize + 60;
      const maxLines = Math.floor((height - startY - 10) / lineHeight);
      
      ctx.font = `${Math.max(8, width * 0.04)}px Arial`;
      ctx.fillStyle = '#999999';
      ctx.textAlign = 'left';
      
      let currentLine = '';
      let lineCount = 0;
      const maxLineWidth = width - 20;
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxLineWidth && currentLine) {
          ctx.fillText(currentLine, 10, startY + lineCount * lineHeight);
          currentLine = word;
          lineCount++;
          
          if (lineCount >= maxLines) break;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine && lineCount < maxLines) {
        ctx.fillText(currentLine, 10, startY + lineCount * lineHeight);
      }
    }
  }

  /**
   * 包装预览内容到模板中
   */
  private wrapInPreviewTemplate(content: string, type: string): string {
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>文档预览</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #ffffff;
            color: #333333;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          code {
            background: #f6f8fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
          }
          pre {
            background: #f6f8fa;
            padding: 16px;
            border-radius: 6px;
            overflow: auto;
          }
          blockquote {
            border-left: 4px solid #dfe2e5;
            padding-left: 16px;
            margin-left: 0;
            color: #6a737d;
          }
        </style>
      </head>
      <body data-document-type="${type}">
        ${content}
      </body>
      </html>
    `;
  }

  /**
   * 获取文档类型对应的颜色
   */
  private getDocumentColor(type: DocumentType): string {
    const colorMap: Record<DocumentType, string> = {
      'markdown': '#1890ff',
      'html': '#52c41a',
      'text': '#666666',
      'json': '#722ed1',
      'code': '#13c2c2',
      'pdf': '#ff4d4f',
      'word': '#1890ff',
      'excel': '#52c41a',
      'image': '#fa8c16'
    };
    return colorMap[type] || '#999999';
  }

  /**
   * 获取文档图标
   */
  private getDocumentIcon(type: DocumentType): string {
    const iconMap: Record<DocumentType, string> = {
      'markdown': '📝',
      'html': '🌐',
      'text': '📄',
      'json': '⚙️',
      'code': '💻',
      'pdf': '📕',
      'word': '📘',
      'excel': '📊',
      'image': '🖼️'
    };
    return iconMap[type] || '📄';
  }

  /**
   * 获取内容类型
   */
  private getContentType(type: DocumentType): string {
    const typeMap: Record<DocumentType, string> = {
      'markdown': 'text/html',
      'html': 'text/html',
      'text': 'text/plain',
      'json': 'application/json',
      'code': 'text/plain',
      'pdf': 'application/pdf',
      'word': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image': 'image/png'
    };
    return typeMap[type] || 'text/plain';
  }

  /**
   * 从文件扩展名获取语言
   */
  private getLanguageFromExtension(extension: string): string {
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'css': 'css',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'sql': 'sql',
      'sh': 'bash',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby'
    };
    return langMap[extension.toLowerCase()] || 'text';
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * HTML清理（简单版本）
   */
  private sanitizeHtml(html: string): string {
    // 这里应该使用专业的HTML清理库，如DOMPurify
    // 简单处理：移除script标签
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  /**
   * 估算Data URL大小
   */
  private estimateDataUrlSize(dataUrl: string): number {
    // Base64编码会增加约33%的大小
    return Math.floor((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
  }

  /**
   * 缓存管理
   */
  private getCacheKey(type: string, id: number, updatedAt: string, options: any): string {
    const optionsHash = JSON.stringify(options);
    return `${type}_${id}_${updatedAt}_${btoa(optionsHash).substring(0, 10)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // 检查是否过期
    if (Date.now() - (cached as any).generatedAt > this.CACHE_EXPIRY) {
      this.cache.delete(key);
      return null;
    }

    return cached as T;
  }

  private setCache(key: string, value: PreviewResult | ThumbnailResult): void {
    this.cache.set(key, value);
    
    // 清理过期缓存
    if (this.cache.size > 1000) {
      this.cleanExpiredCache();
    }
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - (value as any).generatedAt > this.CACHE_EXPIRY) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; entries: number } {
    let totalSize = 0;
    for (const value of this.cache.values()) {
      totalSize += (value as any).size || 0;
    }
    
    return {
      size: totalSize,
      entries: this.cache.size
    };
  }
}

// 导出单例实例
export const documentPreviewService = new DocumentPreviewService();
export default documentPreviewService;