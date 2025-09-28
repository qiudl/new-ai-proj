/**
 * PDF打印预览组件
 * 
 * 功能：
 * 1. 显示PDF导出的预览内容
 * 2. 支持打印设置（字体大小、页边距等）
 * 3. 实时预览打印效果
 * 4. 支持中文内容预览
 * 
 * 创建时间: 2025/8/6
 * 任务编号: #714
 */

import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Card, Row, Col, Slider, Select, Switch, Space, Typography, message } from 'antd';
import { PrinterOutlined, EyeOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ExportData, ExportOptions } from '../services/exportService';
import { exportToPDF } from '../services/exportService';
import { hasChineseCharacters } from '../utils/pdfFontUtils';

const { Title, Text } = Typography;
const { Option } = Select;

interface PrintPreviewProps {
  visible: boolean;
  data: ExportData;
  options?: Partial<ExportOptions>;
  onCancel: () => void;
  onExport?: (data: ExportData, options: ExportOptions) => Promise<void>;
}

interface PrintSettings {
  fontSize: number;
  lineSpacing: number;
  pageMargin: number;
  includeStats: boolean;
  includeDetails: boolean;
  paperSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  fontFamily: 'auto' | 'helvetica' | 'times';
}

const PrintPreview: React.FC<PrintPreviewProps> = ({
  visible,
  data,
  options = {},
  onCancel,
  onExport,
}) => {
  const [settings, setSettings] = useState<PrintSettings>({
    fontSize: 12,
    lineSpacing: 1.4,
    pageMargin: 20,
    includeStats: true,
    includeDetails: true,
    paperSize: 'a4',
    orientation: 'portrait',
    fontFamily: 'auto',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);

  // 检测内容是否包含中文
  const hasChineseContent = React.useMemo(() => {
    const allText = [
      data.weekRange,
      ...data.tasks.map(task => task.title),
      ...data.tasks.map(task => task.description || ''),
    ].join(' ');
    return hasChineseCharacters(allText);
  }, [data]);

  // 生成预览内容
  useEffect(() => {
    const generatePreviewHTML = () => {
      const fontFamily = settings.fontFamily === 'auto' 
        ? (hasChineseContent ? '"Microsoft YaHei", "SimHei", sans-serif' : 'helvetica') 
        : settings.fontFamily;

      return `
        <div style="
          font-family: ${fontFamily};
          font-size: ${settings.fontSize}px;
          line-height: ${settings.lineSpacing};
          margin: ${settings.pageMargin}px;
          max-width: ${settings.paperSize === 'a4' ? '210mm' : '8.5in'};
          background: white;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
          <!-- 标题 -->
          <h1 style="font-size: ${settings.fontSize + 6}px; margin-bottom: 20px; text-align: center;">
            任务周报
          </h1>
          
          <!-- 基本信息 -->
          <p><strong>报告期间:</strong> ${data.weekRange}</p>
          <p><strong>导出时间:</strong> ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
          <hr style="margin: 20px 0;" />
          
          <!-- 统计信息 -->
          ${settings.includeStats ? `
            <h2 style="font-size: ${settings.fontSize + 2}px;">汇总统计</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>任务总数</strong></td><td style="border: 1px solid #ccc; padding: 8px;">${data.stats.totalTasks}</td></tr>
              <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>已完成</strong></td><td style="border: 1px solid #ccc; padding: 8px;">${data.stats.completedTasks}</td></tr>
              <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>进行中</strong></td><td style="border: 1px solid #ccc; padding: 8px;">${data.stats.inProgressTasks}</td></tr>
              <tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>完成率</strong></td><td style="border: 1px solid #ccc; padding: 8px;">${data.stats.completionRate}%</td></tr>
            </table>
          ` : ''}
          
          <!-- 任务详情 -->
          ${settings.includeDetails && data.tasks.length > 0 ? `
            <h2 style="font-size: ${settings.fontSize + 2}px;">任务详情</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">任务名称</th>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">状态</th>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">优先级</th>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">截止时间</th>
                </tr>
              </thead>
              <tbody>
                ${data.tasks.slice(0, 10).map(task => `
                  <tr>
                    <td style="border: 1px solid #ccc; padding: 8px;">${task.title}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待办'}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${task.custom_fields?.priority || '-'}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${task.due_date ? dayjs(task.due_date).format('MM-DD') : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${data.tasks.length > 10 ? `<p style="margin-top: 10px; color: #666;">... 还有 ${data.tasks.length - 10} 个任务未显示</p>` : ''}
          ` : ''}
          
          <!-- 页码显示 -->
          <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e8e8e8; padding-top: 10px;">
            <p style="margin: 0; font-size: ${settings.fontSize - 2}px; color: #999;">
              第 1 页，共 ${Math.ceil((data.tasks.length * 0.8 + (settings.includeStats ? 10 : 0)) / 30)} 页
            </p>
          </div>
          
          <!-- 中文字体提示 -->
          ${hasChineseContent ? `
            <div style="margin-top: 20px; padding: 10px; background-color: #f6f8ff; border-left: 4px solid #1890ff;">
              <p style="margin: 0; font-size: ${settings.fontSize - 1}px; color: #666;">
                🈴 检测到中文内容，已自动配置中文字体支持
              </p>
            </div>
          ` : ''}
        </div>
      `;
    };

    setPreviewContent(generatePreviewHTML());
  }, [settings, data, hasChineseContent]);

  // 处理导出
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportOptions: ExportOptions = {
        ...options,
        fontSize: settings.fontSize,
        includeStats: settings.includeStats,
        includeDetails: settings.includeDetails,
        filename: options.filename || `任务周报_${data.selectedWeek.format('YYYY年第ww周')}_${dayjs().format('MMDD')}.pdf`,
      };

      if (onExport) {
        await onExport(data, exportOptions);
      } else {
        await exportToPDF(data, exportOptions);
      }

      message.success('PDF导出成功！');
      onCancel();
    } catch (error) {
      console.error('PDF导出失败:', error);
      message.error(`PDF导出失败: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 处理打印预览
  const handlePrintPreview = () => {
    if (previewRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>打印预览 - 任务周报</title>
              <style>
                @media print {
                  body { margin: 0; }
                  @page { size: ${settings.paperSize === 'a4' ? 'A4' : 'letter'} ${settings.orientation}; }
                }
              </style>
            </head>
            <body>
              ${previewContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          打印预览
          {hasChineseContent && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              (已检测到中文内容)
            </Text>
          )}
        </Space>
      }
      visible={visible}
      onCancel={onCancel}
      width={1200}
      style={{ top: 20 }}
      footer={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrintPreview}>
            浏览器打印
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            loading={isExporting}
            onClick={handleExport}
          >
            导出PDF
          </Button>
        </Space>
      }
    >
      <Row gutter={24}>
        {/* 左侧设置面板 */}
        <Col span={8}>
          <Card title={<><SettingOutlined /> 打印设置</>} >
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 字体大小 */}
              <div>
                <Text strong>字体大小: {settings.fontSize}px</Text>
                <Slider
                  min={8}
                  max={20}
                  value={settings.fontSize}
                  onChange={(value) => setSettings(prev => ({ ...prev, fontSize: value }))}
                  marks={{ 8: '8px', 12: '12px', 16: '16px', 20: '20px' }}
                />
              </div>

              {/* 行距 */}
              <div>
                <Text strong>行距: {settings.lineSpacing}</Text>
                <Slider
                  min={1.0}
                  max={2.5}
                  step={0.1}
                  value={settings.lineSpacing}
                  onChange={(value) => setSettings(prev => ({ ...prev, lineSpacing: value }))}
                  marks={{ 1.0: '1.0', 1.5: '1.5', 2.0: '2.0', 2.5: '2.5' }}
                />
              </div>

              {/* 页边距 */}
              <div>
                <Text strong>页边距: {settings.pageMargin}mm</Text>
                <Slider
                  min={10}
                  max={40}
                  value={settings.pageMargin}
                  onChange={(value) => setSettings(prev => ({ ...prev, pageMargin: value }))}
                  marks={{ 10: '10mm', 20: '20mm', 30: '30mm', 40: '40mm' }}
                />
              </div>

              {/* 纸张设置 */}
              <div>
                <Text strong>纸张大小</Text>
                <Select
                  value={settings.paperSize}
                  onChange={(value) => setSettings(prev => ({ ...prev, paperSize: value }))}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  <Option value="a4">A4 (210×297mm)</Option>
                  <Option value="letter">Letter (8.5×11in)</Option>
                </Select>
              </div>

              {/* 方向 */}
              <div>
                <Text strong>页面方向</Text>
                <Select
                  value={settings.orientation}
                  onChange={(value) => setSettings(prev => ({ ...prev, orientation: value }))}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  <Option value="portrait">纵向</Option>
                  <Option value="landscape">横向</Option>
                </Select>
              </div>

              {/* 字体选择 */}
              <div>
                <Text strong>字体</Text>
                <Select
                  value={settings.fontFamily}
                  onChange={(value) => setSettings(prev => ({ ...prev, fontFamily: value }))}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  <Option value="auto">自动选择 {hasChineseContent ? '(中文优化)' : '(英文优化)'}</Option>
                  <Option value="helvetica">Helvetica</Option>
                  <Option value="times">Times</Option>
                </Select>
              </div>

              {/* 内容选择 */}
              <div>
                <Space direction="vertical">
                  <div>
                    <Switch
                      checked={settings.includeStats}
                      onChange={(checked) => setSettings(prev => ({ ...prev, includeStats: checked }))}
                    />
                    <Text style={{ marginLeft: 8 }}>包含统计信息</Text>
                  </div>
                  <div>
                    <Switch
                      checked={settings.includeDetails}
                      onChange={(checked) => setSettings(prev => ({ ...prev, includeDetails: checked }))}
                    />
                    <Text style={{ marginLeft: 8 }}>包含任务详情</Text>
                  </div>
                </Space>
              </div>
            </Space>
          </Card>

          {/* 预览信息 */}
          <Card title="预览信息"  style={{ marginTop: 16 }}>
            <Space direction="vertical" >
              <Text type="secondary">
                📊 任务数量: {data.tasks.length}
              </Text>
              <Text type="secondary">
                📄 预计页数: {Math.ceil((data.tasks.length * 0.8 + (settings.includeStats ? 10 : 0)) / 30)}
              </Text>
              <Text type="secondary">
                🈴 中文字符: {hasChineseContent ? '是' : '否'}
              </Text>
              <Text type="secondary">
                🔤 字体配置: {settings.fontFamily === 'auto' 
                  ? (hasChineseContent ? '中文优化' : 'Helvetica') 
                  : settings.fontFamily}
              </Text>
            </Space>
          </Card>
        </Col>

        {/* 右侧预览区域 */}
        <Col span={16}>
          <Card title="内容预览"  style={{ height: '600px', overflow: 'hidden' }}>
            <div 
              ref={previewRef}
              style={{ 
                height: '560px', 
                overflow: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                backgroundColor: '#f5f5f5',
                padding: '20px'
              }}
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          </Card>
        </Col>
      </Row>
    </Modal>
  );
};

export default PrintPreview;