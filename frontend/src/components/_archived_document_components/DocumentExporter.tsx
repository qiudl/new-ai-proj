import React, { useState } from 'react';
import { 
  Button, 
  Modal, 
  Select, 
  Form, 
  Input, 
  message, 
  Radio, 
  Checkbox, 
  Divider,
  Typography,
  Space,
  Card
} from 'antd';
import { 
  DownloadOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  Html5Outlined,
  SettingOutlined
} from '@ant-design/icons';
import { Document as DocumentType } from '../types/document';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface DocumentExporterProps {
  document: DocumentType;
  visible: boolean;
  onClose: () => void;
  className?: string;
}

interface ExportOptions {
  format: 'html' | 'pdf' | 'markdown';
  includeMetadata: boolean;
  includeTableOfContents: boolean;
  customCSS?: string;
  fileName?: string;
  pageSize?: 'A4' | 'A3' | 'Letter';
  margins?: 'normal' | 'narrow' | 'wide';
}

const DocumentExporter: React.FC<DocumentExporterProps> = ({
  document,
  visible,
  onClose,
  className
}) => {
  const [form] = Form.useForm();
  const [exporting, setExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'html',
    includeMetadata: true,
    includeTableOfContents: false,
    pageSize: 'A4',
    margins: 'normal'
  });

  // 导出格式配置
  const exportFormats = [
    {
      key: 'html',
      name: 'HTML',
      icon: <Html5Outlined />,
      description: '导出为HTML网页文件，支持在浏览器中查看',
      extension: '.html'
    },
    {
      key: 'pdf',
      name: 'PDF',
      icon: <FilePdfOutlined />,
      description: '导出为PDF文档，适合打印和分享',
      extension: '.pdf'
    },
    {
      key: 'markdown',
      name: 'Markdown',
      icon: <FileTextOutlined />,
      description: '导出为原始Markdown文件，保持源格式',
      extension: '.md'
    }
  ];

  // 处理导出选项变化
  const handleOptionsChange = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 生成HTML内容
  const generateHTML = (content: string, options: ExportOptions): string => {
    const metadata = options.includeMetadata ? `
      <div class="document-metadata">
        <h1>${document.title}</h1>
        <div class="meta-info">
          <p><strong>创建者:</strong> ${document.creator_name}</p>
          <p><strong>创建时间:</strong> ${new Date(document.created_at).toLocaleString()}</p>
          <p><strong>更新时间:</strong> ${new Date(document.updated_at).toLocaleString()}</p>
          <p><strong>状态:</strong> ${document.status === 'published' ? '已发布' : document.status === 'draft' ? '草稿' : '已归档'}</p>
        </div>
        <hr />
      </div>
    ` : '';

    const tableOfContents = options.includeTableOfContents ? `
      <div class="table-of-contents">
        <h2>目录</h2>
        <ul id="toc-list"></ul>
        <hr />
      </div>
    ` : '';

    const customCSS = options.customCSS || `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        color: #333;
      }
      .document-metadata {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      .meta-info p {
        margin: 8px 0;
      }
      .table-of-contents {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      h1, h2, h3, h4, h5, h6 {
        color: #2c3e50;
        margin-top: 30px;
        margin-bottom: 15px;
      }
      h1 { font-size: 2.5em; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
      h2 { font-size: 2em; border-bottom: 1px solid #bdc3c7; padding-bottom: 8px; }
      h3 { font-size: 1.5em; }
      code {
        background: #f1f2f6;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
      }
      pre {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        overflow-x: auto;
        border-left: 4px solid #3498db;
      }
      blockquote {
        border-left: 4px solid #3498db;
        padding-left: 20px;
        margin: 20px 0;
        color: #7f8c8d;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 20px 0;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      th {
        background-color: #f8f9fa;
        font-weight: bold;
      }
      img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      a {
        color: #3498db;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      @media print {
        body { margin: 0; padding: 15px; }
        .no-print { display: none; }
      }
    `;

    // 简单的Markdown到HTML转换（实际项目中应使用专业的Markdown解析器）
    const htmlContent = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
      .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br>')
      .replace(/^(.*)$/gim, '<p>$1</p>')
      .replace(/<p><h/gim, '<h')
      .replace(/<\/h([1-6])><\/p>/gim, '</h$1>')
      .replace(/<p><\/p>/gim, '');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${document.title}</title>
    <style>
      ${customCSS}
    </style>
</head>
<body>
    ${metadata}
    ${tableOfContents}
    <div class="document-content">
        ${htmlContent}
    </div>
    
    ${options.includeTableOfContents ? `
    <script>
      // 生成目录
      document.addEventListener('DOMContentLoaded', function() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const toc = document.getElementById('toc-list');
        if (toc && headings.length > 0) {
          headings.forEach((heading, index) => {
            const id = 'heading-' + index;
            heading.id = id;
            const level = parseInt(heading.tagName.charAt(1));
            const li = window.document.createElement('li');
            li.style.marginLeft = (level - 1) * 20 + 'px';
            li.innerHTML = '<a href="#' + id + '">' + heading.textContent + '</a>';
            toc.appendChild(li);
          });
        }
      });
    </script>
    ` : ''}
</body>
</html>
    `;
  };

  // 执行导出
  const handleExport = async () => {
    try {
      const values = await form.validateFields();
      setExporting(true);

      const fileName = values.fileName || document.title;
      const format = exportOptions.format;

      let content: string;
      let mimeType: string;
      let fileExtension: string;

      switch (format) {
        case 'html':
          content = generateHTML(document.content || '', exportOptions);
          mimeType = 'text/html';
          fileExtension = '.html';
          break;
        
        case 'pdf':
          // 对于PDF导出，我们先生成HTML，然后使用浏览器的打印功能
          // 实际项目中可以使用专业的PDF生成库
          const htmlForPdf = generateHTML(document.content || '', exportOptions);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(htmlForPdf);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 500);
          }
          message.success('已打开打印窗口，请选择"另存为PDF"');
          setExporting(false);
          return;
        
        case 'markdown':
        default:
          content = `# ${document.title}\n\n${exportOptions.includeMetadata ? `
**创建者:** ${document.creator_name}
**创建时间:** ${new Date(document.created_at).toLocaleString()}
**更新时间:** ${new Date(document.updated_at).toLocaleString()}
**状态:** ${document.status === 'published' ? '已发布' : document.status === 'draft' ? '草稿' : '已归档'}

---

` : ''}${document.content}`;
          mimeType = 'text/markdown';
          fileExtension = '.md';
          break;
      }

      // 创建并下载文件
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName + fileExtension;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success(`文档已导出为 ${format.toUpperCase()} 格式`);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      message.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <DownloadOutlined />
          导出文档
        </Space>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleExport}
      okText="导出"
      cancelText="取消"
      confirmLoading={exporting}
      width={600}
      className={className}
    >
      <Form 
        form={form} 
        layout="vertical"
        initialValues={{
          fileName: document.title,
          format: 'html',
          includeMetadata: true,
          includeTableOfContents: false
        }}
      >
        {/* 文档信息 */}
        <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#f8f9fa' }}>
          <Title level={5} style={{ margin: 0, marginBottom: '8px' }}>
            {document.title}
          </Title>
          <Space>
            <Text type="secondary">类型: {document.type}</Text>
            <Text type="secondary">创建者: {document.creator_name}</Text>
            <Text type="secondary">
              更新时间: {new Date(document.updated_at).toLocaleDateString()}
            </Text>
          </Space>
        </Card>

        {/* 导出格式选择 */}
        <Form.Item
          name="format"
          label="导出格式"
        >
          <Radio.Group 
            value={exportOptions.format}
            onChange={(e) => handleOptionsChange('format', e.target.value)}
          >
            {exportFormats.map(format => (
              <Card
                key={format.key}
                size="small"
                style={{ 
                  marginBottom: '8px',
                  cursor: 'pointer',
                  border: exportOptions.format === format.key ? '2px solid #1890ff' : '1px solid #d9d9d9'
                }}
                onClick={() => handleOptionsChange('format', format.key)}
              >
                <Radio value={format.key} style={{ marginBottom: '8px' }}>
                  <Space>
                    <span style={{ fontSize: '16px' }}>{format.icon}</span>
                    <strong>{format.name}</strong>
                  </Space>
                </Radio>
                <div style={{ marginLeft: '24px', color: '#666', fontSize: '12px' }}>
                  {format.description}
                </div>
              </Card>
            ))}
          </Radio.Group>
        </Form.Item>

        {/* 文件名 */}
        <Form.Item
          name="fileName"
          label="文件名"
          rules={[{ required: true, message: '请输入文件名' }]}
        >
          <Input placeholder="请输入导出文件名" />
        </Form.Item>

        <Divider>导出选项</Divider>

        {/* 基础选项 */}
        <Form.Item>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Checkbox
              checked={exportOptions.includeMetadata}
              onChange={(e) => handleOptionsChange('includeMetadata', e.target.checked)}
            >
              包含文档元信息（创建者、时间、状态等）
            </Checkbox>
            
            {exportOptions.format !== 'markdown' && (
              <Checkbox
                checked={exportOptions.includeTableOfContents}
                onChange={(e) => handleOptionsChange('includeTableOfContents', e.target.checked)}
              >
                自动生成目录
              </Checkbox>
            )}
          </Space>
        </Form.Item>

        {/* PDF特定选项 */}
        {exportOptions.format === 'pdf' && (
          <>
            <Form.Item label="页面大小">
              <Select
                value={exportOptions.pageSize}
                onChange={(value) => handleOptionsChange('pageSize', value)}
              >
                <Option value="A4">A4</Option>
                <Option value="A3">A3</Option>
                <Option value="Letter">Letter</Option>
              </Select>
            </Form.Item>

            <Form.Item label="页边距">
              <Select
                value={exportOptions.margins}
                onChange={(value) => handleOptionsChange('margins', value)}
              >
                <Option value="normal">正常</Option>
                <Option value="narrow">窄</Option>
                <Option value="wide">宽</Option>
              </Select>
            </Form.Item>
          </>
        )}

        {/* HTML特定选项 */}
        {exportOptions.format === 'html' && (
          <Form.Item label="自定义CSS（可选）">
            <TextArea
              rows={4}
              placeholder="输入自定义CSS样式，留空使用默认样式"
              value={exportOptions.customCSS || ''}
              onChange={(e) => handleOptionsChange('customCSS', e.target.value)}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default DocumentExporter;