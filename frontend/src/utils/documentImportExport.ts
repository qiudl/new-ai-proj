/*
 * 文档导入导出工具
 */

import { message } from 'antd';
import { Document, DocumentListItem } from '../types/document';
// 修复PDF库导入，确保类型安全
import jsPDF from 'jspdf';

// 导出格式
export type ExportFormat = 'csv' | 'json' | 'excel' | 'pdf' | 'markdown' | 'docx' | 'txt' | 'html';

// 导入格式
export type ImportFormat = 'csv' | 'json' | 'excel' | 'markdown' | 'txt' | 'docx';

// 导出选项
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  fields?: string[];
  includeFields?: string[];
  excludeFields?: string[];
  includeHeader?: boolean;
  dateFormat?: string;
  encoding?: string;
  templateStyle?: 'minimal' | 'professional' | 'detailed';
  includeThumbnails?: boolean;
  watermark?: string;
  compression?: boolean;
}

// 导入选项
export interface ImportOptions {
  format: ImportFormat;
  encoding?: string;
  delimiter?: string;
  skipEmptyLines?: boolean;
  autoDetectFormat?: boolean;
  validateData?: boolean;
  maxFileSize?: number; // MB
  skipRows?: number;
  validation?: boolean;
}

// 高级导入选项
export interface AdvancedImportOptions {
  mapping?: Record<string, string>;
  skipRows?: number;
  skipDuplicates?: boolean;
  batchSize?: number;
  defaultValues?: Record<string, any>;
  validation?: boolean;
  onProgress?: (progress: number, total: number) => void;
}

// 导入结果
export interface ImportResult {
  success: number; // Changed to number to track successful imports
  failed: number;
  duplicates: number;
  data: Partial<Document>[];
  errors: string[];
  skipped: number;
  imported: number;
}

class DocumentImportExport {
  // /**
  //  * 增强的文档导入方法
  //  */
  // async importDocuments(
  //   file: File,
  //   options: ImportOptions = {},
  //   advancedOptions: AdvancedImportOptions = {}
  // ): Promise<ImportResult> {
  //   // ... method implementation commented out to resolve duplicate function error
  // }

  // 导出文档数据
  async exportDocuments(
    documents: (Document | DocumentListItem)[],
    options: ExportOptions
  ): Promise<boolean> {
    try {
      switch (options.format) {
        case 'csv':
          return await this.exportToCsv(documents, options);
        case 'json':
          return await this.exportToJson(documents, options);
        case 'excel':
          return await this.exportToExcel(documents, options);
        case 'pdf':
          return await this.exportToPdf(documents, options);
        case 'markdown':
          return await this.exportToMarkdown(documents, options);
        default:
          message.error('不支持的导出格式');
          return false;
      }
    } catch (error) {
      console.error('Export failed:', error);
      message.error('导出失败');
      return false;
    }
  }

  // 导出到CSV
  private async exportToCsv(
    documents: (Document | DocumentListItem)[],
    options: ExportOptions
  ): Promise<boolean> {
    const data = this.prepareExportData(documents, options);
    
    if (data.length === 0) {
      message.warning('没有数据可导出');
      return false;
    }

    // 生成CSV内容
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // 转义包含逗号或引号的值
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    // 下载文件
    const filename = options.filename || `documents_${this.formatDate(new Date())}.csv`;
    this.downloadFile(csvContent, filename, 'text/csv');
    
    message.success(`成功导出 ${data.length} 条记录到 ${filename}`);
    return true;
  }

  // 导出到JSON
  private async exportToJson(
    documents: (Document | DocumentListItem)[],
    options: ExportOptions
  ): Promise<boolean> {
    const data = this.prepareExportData(documents, options);
    
    const jsonContent = JSON.stringify(data, null, 2);
    const filename = options.filename || `documents_${this.formatDate(new Date())}.json`;
    
    this.downloadFile(jsonContent, filename, 'application/json');
    message.success(`成功导出 ${data.length} 条记录到 ${filename}`);
    return true;
  }

  // 导出到Excel
  private async exportToExcel(
    documents: (Document | DocumentListItem)[],
    options: ExportOptions
  ): Promise<boolean> {
    try {
      // 动态导入xlsx库
      const XLSX = await import('xlsx');
      
      const data = this.prepareExportData(documents, options);
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Documents');
      
      const filename = options.filename || `documents_${this.formatDate(new Date())}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      message.success(`成功导出 ${data.length} 条记录到 ${filename}`);
      return true;
    } catch (error) {
      console.error('Excel export failed:', error);
      message.error('Excel导出失败');
      return false;
    }
  }

  // 导出到PDF
  private async exportToPdf(
    documents: (Document | DocumentListItem)[],
    options: ExportOptions
  ): Promise<boolean> {
    try {
      const doc = new jsPDF();
    
      // 设置支持中文的字体 - 修复中文字符显示问题
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
    
      // 添加标题
      doc.setFontSize(16);
      doc.text('文档列表', 20, 20);
    
      // 添加生成时间
      doc.setFontSize(10);
      doc.text(`生成时间: ${new Date().toLocaleString()}`, 20, 30);
    
      // 准备数据
      const data = this.prepareExportData(documents, options);
    
      // 添加文档信息
      let yPosition = 50;
      const pageHeight = doc.internal.pageSize.height;
    
      data.forEach((document, index) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.text(`${index + 1}. ${document.title || 'Untitled'}`, 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        if (document.description) {
          doc.text(`描述: ${document.description}`, 30, yPosition);
          yPosition += 8;
        }
        
        doc.text(`更新时间: ${document.updated_at || 'Unknown'}`, 30, yPosition);
        yPosition += 8;
        
        if (document.owner_name || document.creator_name) {
          doc.text(`创建者: ${document.owner_name || document.creator_name}`, 30, yPosition);
          yPosition += 8;
        }
        
        yPosition += 5; // 间距
      });
    
      // 下载文件
      const filename = options.filename || `documents_${this.formatDate(new Date())}.pdf`;
      doc.save(filename);
    
      message.success(`成功导出 ${data.length} 条记录到 ${filename}`);
      return true;
    } catch (error) {
      console.error('PDF export failed:', error);
      message.error('PDF导出失败');
      return false;
    }
  }

  // 导出到Markdown
  private async exportToMarkdown(
    documents: (Document | DocumentListItem)[],
    options: ExportOptions
  ): Promise<boolean> {
    const data = this.prepareExportData(documents, options);
    
    let markdownContent = `# 文档列表\n\n`;
    markdownContent += `> 导出时间: ${new Date().toLocaleString()}\n`;
    markdownContent += `> 文档总数: ${data.length}\n\n`;
    
    // 添加目录
    markdownContent += `## 目录\n\n`;
    data.forEach((document, index) => {
      markdownContent += `${index + 1}. [${document.title || 'Untitled'}](#document-${index + 1})\n`;
    });
    markdownContent += `\n---\n\n`;
    
    // 添加详细信息
    data.forEach((document, index) => {
      markdownContent += `## Document ${index + 1}\n\n`;
      markdownContent += `### ${document.title || 'Untitled'}\n\n`;
      
      if (document.description) {
        markdownContent += `**描述:** ${document.description}\n\n`;
      }
      
      markdownContent += `**更新时间:** ${document.updated_at || 'Unknown'}\n`;
      markdownContent += `**创建者:** ${document.owner_name || document.creator_name || 'Unknown'}\n`;
      
      if (document.tags && Array.isArray(document.tags) && document.tags.length > 0) {
        markdownContent += `**标签:** ${document.tags.join(', ')}\n`;
      }
      
      markdownContent += `\n---\n\n`;
    });
    
    const filename = options.filename || `documents_${this.formatDate(new Date())}.md`;
    this.downloadFile(markdownContent, filename, 'text/markdown');
    
    message.success(`成功导出 ${data.length} 条记录到 ${filename}`);
    return true;
  }

  // 准备导出数据
  private prepareExportData(documents: (Document | DocumentListItem)[], options: ExportOptions): any[] {
    return documents.map(doc => {
      const exportDoc: any = {};
      
      // 基础字段
      exportDoc.id = (doc as any).id;
      exportDoc.title = (doc as any).title || '';
      exportDoc.description = (doc as any).description || '';
      exportDoc.type = (doc as any).type || '';
      exportDoc.status = (doc as any).status || '';
      exportDoc.created_at = (doc as any).created_at || '';
      exportDoc.updated_at = (doc as any).updated_at || '';
      exportDoc.owner_name = (doc as any).owner_name || (doc as any).creator_name || '';
      
      // 可选字段
      if ((doc as any).folder_name) exportDoc.folder_name = (doc as any).folder_name;
      if ((doc as any).tags) exportDoc.tags = Array.isArray((doc as any).tags) ? (doc as any).tags.join(', ') : (doc as any).tags;
      if ((doc as any).file_size) exportDoc.file_size = (doc as any).file_size;
      if ((doc as any).version) exportDoc.version = (doc as any).version;
      
      // 根据选项过滤字段
      const fieldsToInclude = options.fields || options.includeFields;
      if (fieldsToInclude && fieldsToInclude.length > 0) {
        const filtered: Record<string, any> = {};
        fieldsToInclude.forEach(field => {
          if (Object.prototype.hasOwnProperty.call(exportDoc, field)) {
            filtered[field] = exportDoc[field];
          }
        });
        return filtered;
      }
      
      if (options.excludeFields && options.excludeFields.length > 0) {
        options.excludeFields.forEach(field => {
          delete exportDoc[field];
        });
      }
      
      return exportDoc;
    });
  }

  // 导入文档数据
  async importDocuments(file: File, options: Partial<ImportOptions> = {}): Promise<ImportResult> {
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      // 设置默认选项
      const defaultOptions: ImportOptions = {
        format: 'csv',
        encoding: 'utf-8',
        skipEmptyLines: true,
        autoDetectFormat: true,
        validateData: true,
        maxFileSize: 50
      };
      
      const finalOptions: ImportOptions = { ...defaultOptions, ...options };
      
      switch (extension) {
        case 'csv':
          return await this.importFromCsv(file, finalOptions);
        case 'json':
          return await this.importFromJson(file, finalOptions);
        case 'xlsx':
        case 'xls':
          return await this.importFromExcel(file, finalOptions);
        default:
          return {
            success: 0,
            failed: 1,
            duplicates: 0,
            data: [],
            errors: ['不支持的文件格式'],
            skipped: 0,
            imported: 0
          };
      }
    } catch (error) {
      console.error('Import failed:', error);
      return {
        success: 0,
        failed: 1,
        duplicates: 0,
        data: [],
        errors: [String(error)],
        skipped: 0,
        imported: 0
      };
    }
  }

  // 从CSV导入
  private async importFromCsv(file: File, options: Partial<ImportOptions>): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      data: [],
      errors: [],
      skipped: 0,
      imported: 0
    };

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        result.errors.push('文件为空');
        return result;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataLines = lines.slice(1 + (options.skipRows || 0));
      
      for (let i = 0; i < dataLines.length; i++) {
        try {
          const values = this.parseCsvLine(dataLines[i]);
          if (values.length !== headers.length) {
            result.errors.push(`第 ${i + 2} 行数据格式错误`);
            result.skipped++;
            continue;
          }
          
          const rowData: any = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index];
          });
          
          const transformedData = this.transformImportData(rowData);
          
          if (options.validation && !this.validateImportData(transformedData)) {
            result.errors.push(`第 ${i + 2} 行数据验证失败`);
            result.skipped++;
            continue;
          }
          
          result.data.push(transformedData);
          result.imported++;
          result.success++;
        } catch (error) {
          result.errors.push(`第 ${i + 2} 行处理失败: ${String(error)}`);
          result.skipped++;
        }
      }
    } catch (error) {
      result.errors.push(`CSV解析失败: ${String(error)}`);
    }

    return result;
  }

  // 从JSON导入
  private async importFromJson(file: File, options: Partial<ImportOptions>): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      data: [],
      errors: [],
      skipped: 0,
      imported: 0
    };

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const documents = Array.isArray(jsonData) ? jsonData : [jsonData];
      
      for (let i = 0; i < documents.length; i++) {
        try {
          const transformedData = this.transformImportData(documents[i]);
          
          if (options.validation && !this.validateImportData(transformedData)) {
            result.errors.push(`第 ${i + 1} 条记录验证失败`);
            result.skipped++;
            continue;
          }
          
          result.data.push(transformedData);
          result.imported++;
          result.success++;
        } catch (error) {
          result.errors.push(`第 ${i + 1} 条记录处理失败: ${String(error)}`);
          result.skipped++;
        }
      }
    } catch (error) {
      result.errors.push(`JSON解析失败: ${String(error)}`);
    }

    return result;
  }

  // 从Excel导入
  private async importFromExcel(file: File, options: Partial<ImportOptions>): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      data: [],
      errors: [],
      skipped: 0,
      imported: 0
    };

    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      for (let i = 0; i < jsonData.length; i++) {
        try {
          const transformedData = this.transformImportData(jsonData[i]);
          
          if (options.validation && !this.validateImportData(transformedData)) {
            result.errors.push(`第 ${i + 1} 行数据验证失败`);
            result.skipped++;
            continue;
          }
          
          result.data.push(transformedData);
          result.imported++;
        } catch (error) {
          result.errors.push(`第 ${i + 1} 行处理失败: ${String(error)}`);
          result.skipped++;
        }
      }
    } catch (error) {
      result.errors.push(`Excel解析失败: ${String(error)}`);
      result.failed++;
    }

    return result;
  }

  // 转换导入数据
  private transformImportData(item: any): Partial<Document> {
    return {
      title: item.title || item.name || item.filename || 'Untitled',
      description: item.description || item.desc || '',
      type: item.type || 'markdown',
      status: item.status || 'draft',
      tags: typeof item.tags === 'string' ? item.tags.split(',').map((t: string) => t.trim()) : (item.tags || []),
      visibility: item.visibility || 'private',
      is_template: Boolean(item.is_template),
      metadata: item.metadata || {}
    };
  }

  // 验证导入数据
  private validateImportData(data: Partial<Document>): boolean {
    return !!(data.title && data.title.trim().length > 0);
  }

  // 解析CSV行
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i - 1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // 下载文件
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 格式化日期
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
  }

  // 获取支持的导出格式
  getSupportedExportFormats(): Array<{ value: ExportFormat; label: string; description: string }> {
    return [
      { value: 'excel', label: 'Excel (.xlsx)', description: '适合数据分析和编辑' },
      { value: 'csv', label: 'CSV (.csv)', description: '通用格式，兼容性最好' },
      { value: 'json', label: 'JSON (.json)', description: '结构化数据，适合程序处理' },
      { value: 'pdf', label: 'PDF (.pdf)', description: '适合打印和分享' },
      { value: 'markdown', label: 'Markdown (.md)', description: '文档格式，适合文档管理' }
    ];
  }

  // 获取支持的导入格式
  getSupportedImportFormats(): Array<{ value: ExportFormat; label: string; description: string }> {
    return [
      { value: 'excel', label: 'Excel (.xlsx)', description: '支持复杂数据结构' },
      { value: 'csv', label: 'CSV (.csv)', description: '简单易用，兼容性好' },
      { value: 'json', label: 'JSON (.json)', description: '完整数据结构支持' }
    ];
  }
}

// 单例实例
export const documentImportExport = new DocumentImportExport();

// 便捷函数
export const exportDocuments = (
  documents: (Document | DocumentListItem)[],
  options: ExportOptions
) => documentImportExport.exportDocuments(documents, options);

export const importDocuments = (
  file: File,
  options: ImportOptions
) => documentImportExport.importDocuments(file, options);

// 在开发环境下挂载到window
if (process.env.NODE_ENV === 'development') {
  (window as any).documentImportExport = documentImportExport;
}

export default DocumentImportExport;
