import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  Card,
  Typography,
  Row,
  Col,
  Divider,
  Progress,
  Alert,
  Tooltip,
  Tag,
  message,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  SettingOutlined,
  EyeOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  generateExportPreview,
  type ExportData,
  type ExportOptions,
} from '../services/exportService';
import { Task } from '../types/task';
import { Project } from '../types/project';
import { Company } from '../types/company';

const { Title, Text } = Typography;
const { Option } = Select;

export interface ExportModalProps {
  visible: boolean;
  onCancel: () => void;
  data: {
    weekRange: string;
    selectedWeek: Dayjs;
    tasks: Task[];
    projects?: Project[];
    customers?: Company[];
    stats: {
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      todoTasks: number;
      overdueTasks: number;
      completionRate: number;
    };
    filters: {
      selectedProject?: number;
      selectedCustomer?: number;
      selectedStatus: string;
      searchText: string;
    };
  };
}

type ExportFormat = 'excel' | 'pdf' | 'csv';

export const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onCancel,
  data,
}) => {
  const [form] = Form.useForm();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [exportOptions, setExportOptions] = useState<Partial<ExportOptions>>({
    includeStats: true,
    includeDetails: true,
    includeCharts: false,
    customFields: [],
    groupBy: 'none',
    dateFormat: 'YYYY-MM-DD',
    language: 'zh',
  });

  // 自定义字段选项
  const customFieldOptions = [
    { label: '工作时长', value: 'hours' },
    { label: '标签', value: 'tags' },
    { label: '依赖关系', value: 'dependencies' },
    { label: '备注', value: 'notes' },
  ];

  // 分组选项
  const groupByOptions = [
    { label: '不分组', value: 'none' },
    { label: '按项目分组', value: 'project' },
    { label: '按状态分组', value: 'status' },
    { label: '按优先级分组', value: 'priority' },
    { label: '按负责人分组', value: 'assignee' },
  ];

  // 更新预览数据
  useEffect(() => {
    if (visible && data) {
      const preview = generateExportPreview(data, exportOptions);
      setPreviewData(preview);
    }
  }, [visible, data, exportOptions]);

  // 重置表单
  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        filename: `任务周报_${data.selectedWeek.format('YYYY年第ww周')}_${dayjs().format('MMDD')}`,
        includeStats: true,
        includeDetails: true,
        includeCharts: false,
        customFields: [],
        groupBy: 'none',
        dateFormat: 'YYYY-MM-DD',
        language: 'zh',
      });
      setExportFormat('excel');
      setIsExporting(false);
      setExportProgress(0);
      setShowPreview(false);
    }
  }, [visible, data, form]);

  // 处理导出
  const handleExport = async () => {
    try {
      const values = await form.validateFields();
      setIsExporting(true);
      setExportProgress(0);

      const exportConfig: Partial<ExportOptions> = {
        filename: values.filename + getFileExtension(exportFormat),
        includeStats: values.includeStats,
        includeDetails: values.includeDetails,
        includeCharts: values.includeCharts,
        customFields: values.customFields || [],
        groupBy: values.groupBy,
        dateFormat: values.dateFormat,
        language: values.language,
      };

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      let success = false;
      switch (exportFormat) {
        case 'excel':
          success = await exportToExcel(data, exportConfig);
          break;
        case 'pdf':
          success = await exportToPDF(data, exportConfig);
          break;
        case 'csv':
          success = await exportToCSV(data, exportConfig);
          break;
      }

      clearInterval(progressInterval);
      setExportProgress(100);

      if (success) {
        message.success('导出成功！');
        setTimeout(() => {
          onCancel();
        }, 1000);
      }
    } catch (error) {
      console.error('Export failed:', error);
      message.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // 获取文件扩展名
  const getFileExtension = (format: ExportFormat): string => {
    switch (format) {
      case 'excel':
        return '.xlsx';
      case 'pdf':
        return '.pdf';
      case 'csv':
        return '.csv';
      default:
        return '';
    }
  };

  // 获取格式图标
  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'excel':
        return <FileExcelOutlined style={{ color: '#107C41' }} />;
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#DC2626' }} />;
      case 'csv':
        return <FileTextOutlined style={{ color: '#6B7280' }} />;
      default:
        return <DownloadOutlined />;
    }
  };

  // 更新导出选项
  const updateExportOptions = (key: keyof ExportOptions, value: React.FormEvent | React.ChangeEvent<HTMLInputElement>) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal
      title={
        <Space>
          <DownloadOutlined />
          导出任务周报
          <Tag color="blue">{data?.weekRange}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      destroyOnClose
      footer={[
        <Button key="preview" icon={<EyeOutlined />} onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? '隐藏预览' : '预览'}
        </Button>,
        <Button key="cancel" onClick={onCancel} disabled={isExporting}>
          取消
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={getFormatIcon(exportFormat)}
          onClick={handleExport}
          loading={isExporting}
          disabled={!data || data.tasks.length === 0}
        >
          {isExporting ? `导出中... ${exportProgress}%` : '导出'}
        </Button>,
      ]}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* 导出进度 */}
        {isExporting && (
          <Alert
            message={
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ClockCircleOutlined />
                  <span>正在生成{exportFormat.toUpperCase()}文件...</span>
                </div>
                <Progress percent={exportProgress} size="small" />
              </div>
            }
            type="info"
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* 格式选择 */}
        <Card size="small" title="选择导出格式" style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            {(['excel', 'pdf', 'csv'] as ExportFormat[]).map(format => (
              <Col span={8} key={format}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => setExportFormat(format)}
                  style={{
                    border: exportFormat === format ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                      {getFormatIcon(format)}
                    </div>
                    <Text strong>{format.toUpperCase()}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {format === 'excel' && '多工作表、样式丰富'}
                      {format === 'pdf' && '便于打印、格式固定'}
                      {format === 'csv' && '轻量级、兼容性好'}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 导出配置 */}
        <Card size="small" title={<><SettingOutlined /> 导出配置</>} style={{ marginBottom: '16px' }}>
          <Form form={form} layout="vertical">
            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item
                  label="文件名"
                  name="filename"
                  rules={[{ required: true, message: '请输入文件名' }]}
                >
                  <Input
                    placeholder="文件名（不含扩展名）"
                    suffix={getFileExtension(exportFormat)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="日期格式" name="dateFormat">
                  <Select>
                    <Option value="YYYY-MM-DD">2024-01-15</Option>
                    <Option value="YYYY年MM月DD日">2024年01月15日</Option>
                    <Option value="MM/DD/YYYY">01/15/2024</Option>
                    <Option value="DD/MM/YYYY">15/01/2024</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="语言" name="language">
                  <Select>
                    <Option value="zh">中文</Option>
                    <Option value="en">English</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>包含内容</Title>
            <Row gutter={[16, 8]}>
              <Col span={8}>
                <Form.Item name="includeStats" valuePropName="checked">
                  <Switch />
                  <span style={{ marginLeft: '8px' }}>统计汇总</span>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="includeDetails" valuePropName="checked">
                  <Switch />
                  <span style={{ marginLeft: '8px' }}>任务详情</span>
                </Form.Item>
              </Col>
              {exportFormat === 'pdf' && (
                <Col span={8}>
                  <Form.Item name="includeCharts" valuePropName="checked">
                    <Switch />
                    <span style={{ marginLeft: '8px' }}>图表分析</span>
                  </Form.Item>
                </Col>
              )}
            </Row>

            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item label="分组方式" name="groupBy">
                  <Select
                    options={groupByOptions}
                    onChange={(value) => updateExportOptions('groupBy', value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="自定义字段" name="customFields">
                  <Select
                    mode="multiple"
                    placeholder="选择要包含的自定义字段"
                    options={customFieldOptions}
                    onChange={(value) => updateExportOptions('customFields', value)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* 预览信息 */}
        {showPreview && previewData && (
          <Card size="small" title={<><EyeOutlined /> 导出预览</>}>
            <Row gutter={[16, 8]}>
              <Col span={24}>
                <Text strong>{previewData.summary.title}</Text>
                <br />
                <Text type="secondary">导出时间: {previewData.summary.exportTime}</Text>
              </Col>
            </Row>
            <Divider />
            <Row gutter={[16, 8]}>
              {previewData.summary.stats.map((stat: unknown, index: number) => (
                <Col span={6} key={index}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">{stat.label}</Text>
                    <br />
                    <Text strong style={{ fontSize: '16px' }}>{stat.value}</Text>
                  </div>
                </Col>
              ))}
            </Row>
            <Divider />
            <Row gutter={[16, 8]}>
              <Col span={8}>
                <Text type="secondary">包含任务数: </Text>
                <Text strong>{previewData.summary.taskCount}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">导出工作表: </Text>
                <Text strong>{previewData.sheets.length}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">预估大小: </Text>
                <Text strong>{previewData.estimatedSize}</Text>
              </Col>
            </Row>
            <div style={{ marginTop: '12px' }}>
              <Text type="secondary">包含工作表: </Text>
              {previewData.sheets.map((sheet: string, index: number) => (
                <Tag key={index} style={{ margin: '2px' }}>{sheet}</Tag>
              ))}
            </div>
          </Card>
        )}

        {/* 空数据提示 */}
        {data && data.tasks.length === 0 && (
          <Alert
            message="暂无数据可导出"
            description="当前筛选条件下没有找到任务数据，请调整筛选条件后重试。"
            type="warning"
            showIcon
          />
        )}
      </div>
    </Modal>
  );
};