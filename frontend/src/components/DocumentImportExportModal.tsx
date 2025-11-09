/**
 * 文档导入导出模态框组件
 * 提供用户友好的导入导出界面
 */

import React, { useState, useRef } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Select,
  Upload,
  Button,
  Progress,
  Table,
  Alert,
  Space,
  Checkbox,
  Input,
  Typography,
  Divider,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Tag
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import { Document, DocumentListItem } from '../types/document';
import {
  documentImportExport,
  ExportFormat,
  ExportOptions,
  ImportOptions,
  ImportResult
} from '../utils/documentImportExport';

const { Text, Title } = Typography;
const { Option } = Select;

interface DocumentImportExportModalProps {
  visible: boolean;
  onCancel: () => void;
  documents: (Document | DocumentListItem)[];
  selectedDocuments?: (Document | DocumentListItem)[];
  onImportSuccess?: (result: ImportResult) => void;
  onExportComplete?: () => void;
}

const DocumentImportExportModal: React.FC<DocumentImportExportModalProps> = ({
  visible,
  onCancel,
  documents,
  selectedDocuments = [],
  onImportSuccess,
  onExportComplete
}) => {
  // 导出状态
  const [exportForm] = Form.useForm();
  const [exportLoading, setExportLoading] = useState(false);
  
  // 导入状态
  const [importForm] = Form.useForm();
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  
  // 选项卡状态
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // 导出功能
  const handleExport = async () => {
    try {
      setExportLoading(true);
      const values = await exportForm.validateFields();
      
      const exportDocuments = values.scope === 'selected' && selectedDocuments.length > 0
        ? selectedDocuments
        : documents;

      if (exportDocuments.length === 0) {
        message.warning('没有可导出的文档');
        return;
      }

      const options: ExportOptions = {
        format: values.format,
        fields: values.fields,
        filename: values.filename,
        includeHeader: values.includeHeader,
        dateFormat: values.dateFormat,
        encoding: values.encoding
      };

      const success = await documentImportExport.exportDocuments(exportDocuments, options);
      
      if (success) {
        message.success(`成功导出 ${exportDocuments.length} 个文档`);
        onExportComplete?.();
      }
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请检查数据格式');
    } finally {
      setExportLoading(false);
    }
  };

  // 导入功能
  const handleImport = async () => {
    try {
      setImportLoading(true);
      setImportProgress(0);
      setImportResult(null);
      
      const values = await importForm.validateFields();
      
      if (fileList.length === 0) {
        message.error('请选择要导入的文件');
        return;
      }

      const file = fileList[0].originFileObj as File;
      
      const options: ImportOptions = {
        format: values.format,
        validateData: values.validateData,
      };

      const result = await documentImportExport.importDocuments(file, options);
      setImportResult(result);
      
      if (result.success > 0) {
        message.success(`成功导入 ${result.success} 个文档`);
        onImportSuccess?.(result);
      }
      
      if (result.failed > 0) {
        message.warning(`导入完成，但有 ${result.failed} 个文档失败`);
      }
      
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败，请检查文件格式');
    } finally {
      setImportLoading(false);
      setImportProgress(0);
    }
  };

  // 上传配置
  const uploadProps: UploadProps = {
    maxCount: 1,
    beforeUpload: (file) => {
      // 验证文件类型
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv',
        'application/json'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        message.error('不支持的文件格式，请选择 Excel、CSV 或 JSON 文件');
        return false;
      }
      
      // 验证文件大小（10MB）
      if (file.size > 10 * 1024 * 1024) {
        message.error('文件大小不能超过 10MB');
        return false;
      }
      
      return false; // 阻止自动上传
    },
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
      setImportResult(null); // 清除之前的导入结果
    },
    onRemove: () => {
      setImportResult(null);
    }
  };

  // 渲染导出表单
  const renderExportForm = () => (
    <Form
      form={exportForm}
      layout="vertical"
      initialValues={{
        scope: selectedDocuments.length > 0 ? 'selected' : 'all',
        format: 'excel',
        fields: ['title', 'description', 'type', 'status', 'owner_name', 'updated_at'],
        includeHeader: true,
        dateFormat: 'formatted',
        encoding: 'utf-8'
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="scope"
            label="导出范围"
            rules={[{ required: true, message: '请选择导出范围' }]}
          >
            <Select getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}>
              <Option value="all">全部文档 ({documents.length})</Option>
              {selectedDocuments.length > 0 && (
                <Option value="selected">选中文档 ({selectedDocuments.length})</Option>
              )}
            </Select>
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12}>
          <Form.Item
            name="format"
            label="导出格式"
            rules={[{ required: true, message: '请选择导出格式' }]}
          >
            <Select getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}>
              {documentImportExport.getSupportedExportFormats().map(format => (
                <Option key={format.value} value={format.value}>
                  <Space>
                    {format.value === 'excel' && <FileExcelOutlined />}
                    {format.value === 'pdf' && <FilePdfOutlined />}
                    {format.value !== 'excel' && format.value !== 'pdf' && <FileTextOutlined />}
                    {format.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="fields"
        label="导出字段"
        rules={[{ required: true, message: '请选择要导出的字段' }]}
      >
        <Checkbox.Group>
          <Row>
            <Col span={8}>
              <Checkbox value="id">ID</Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="title">标题</Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="description">描述</Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="type">类型</Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="status">状态</Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="owner_name">所有者</Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="created_at">创建时间</Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="updated_at">更新时间</Checkbox>
            </Col>
            <Col span={8}>
              <Checkbox value="tags">标签</Checkbox>
            </Col>
          </Row>
        </Checkbox.Group>
      </Form.Item>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Form.Item name="filename" label="文件名（可选）">
            <Input placeholder="不填写将使用默认文件名" />
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12}>
          <Form.Item name="dateFormat" label="日期格式">
            <Select getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}>
              <Option value="formatted">格式化 (2024-01-01)</Option>
              <Option value="timestamp">时间戳</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="includeHeader" valuePropName="checked">
        <Checkbox>包含表头</Checkbox>
      </Form.Item>
    </Form>
  );

  // 渲染导入表单
  const renderImportForm = () => (
    <Form
      form={importForm}
      layout="vertical"
      initialValues={{
        format: 'excel',
        skipDuplicates: true,
        validateData: true,
        batchSize: 100
      }}
    >
      <Form.Item
        name="format"
        label="文件格式"
        rules={[{ required: true, message: '请选择文件格式' }]}
      >
        <Select>
          {documentImportExport.getSupportedImportFormats().map(format => (
            <Option key={format.value} value={format.value}>
              <Space>
                <FileExcelOutlined />
                {format.label}
              </Space>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {format.description}
              </Text>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="file"
        label="选择文件"
        rules={[{ required: true, message: '请选择要导入的文件' }]}
      >
        <Upload {...uploadProps} fileList={fileList}>
          <Button icon={<UploadOutlined />}>
            选择文件
          </Button>
        </Upload>
      </Form.Item>

      {fileList.length > 0 && (
        <Alert
          message="文件信息"
          description={
            <div>
              <Text>文件名: {fileList[0].name}</Text><br />
              <Text>大小: {((fileList[0].size || 0) / 1024 / 1024).toFixed(2)} MB</Text>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Title level={5}>导入选项</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Form.Item name="skipDuplicates" valuePropName="checked">
            <Checkbox>跳过重复项</Checkbox>
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12}>
          <Form.Item name="validateData" valuePropName="checked">
            <Checkbox>验证数据格式</Checkbox>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="batchSize"
        label="批处理大小"
        help="每批处理的记录数，较小的值会更稳定但速度较慢"
      >
        <Select>
          <Option value={50}>50</Option>
          <Option value={100}>100</Option>
          <Option value={200}>200</Option>
          <Option value={500}>500</Option>
        </Select>
      </Form.Item>

      {importLoading && (
        <div style={{ marginTop: 16 }}>
          <Text>导入进度:</Text>
          <Progress 
            percent={importProgress} 
            status={importProgress === 100 ? "success" : "active"}
            style={{ marginTop: 8 }}
          />
        </div>
      )}
    </Form>
  );

  // 渲染导入结果
  const renderImportResult = () => {
    if (!importResult) return null;

    const { success, failed, errors, duplicates } = importResult;
    const total = success + failed + duplicates;

    return (
      <Card title="导入结果" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Statistic
              title="总计"
              value={total}
              prefix={<InfoCircleOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="成功"
              value={success ? 1 : 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="失败"
              value={failed}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="重复"
              value={duplicates}
              valueStyle={{ color: '#d46b08' }}
              prefix={<InfoCircleOutlined />}
            />
          </Col>
        </Row>

        {errors.length > 0 && (
          <>
            <Divider />
            <Title level={5}>错误详情</Title>
            <Table
              
              pagination={{ pageSize: 5, showSizeChanger: false }}
              dataSource={errors}
              columns={[
                {
                  title: '行号',
                  dataIndex: 'row',
                  key: 'row',
                  width: 60
                },
                {
                  title: '错误信息',
                  dataIndex: 'error',
                  key: 'error'
                },
                {
                  title: '数据',
                  dataIndex: 'data',
                  key: 'data',
                  render: (data) => (
                    <Text code style={{ fontSize: '12px' }}>
                      {JSON.stringify(data).substring(0, 50)}...
                    </Text>
                  )
                }
              ]}
            />
          </>
        )}
      </Card>
    );
  };

  return (
    <Modal
      title="文档导入导出"
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
      destroyOnClose
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={(key) => setActiveTab(key as 'export' | 'import')}
        style={{ minHeight: '400px' }}
        items={[
          {
            key: 'export',
            label: (
              <span>
                <DownloadOutlined />
                导出文档
              </span>
            ),
            children: (
              <div style={{ padding: '16px 0' }}>
                <Alert
                  message="导出说明"
                  description="选择要导出的文档范围、格式和字段，系统将生成相应格式的文件供下载。"
                  type="info"
                  showIcon
                  style={{ marginBottom: 24 }}
                />
                
                {renderExportForm()}
                
                <div style={{ textAlign: 'right', marginTop: 24 }}>
                  <Space>
                    <Button onClick={onCancel}>
                      取消
                    </Button>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      loading={exportLoading}
                      onClick={handleExport}
                    >
                      开始导出
                    </Button>
                  </Space>
                </div>
              </div>
            )
          },
          {
            key: 'import',
            label: (
              <span>
                <UploadOutlined />
                导入文档
              </span>
            ),
            children: (
              <div style={{ padding: '16px 0' }}>
                <Alert
                  message="导入说明"
                  description="支持 Excel、CSV、JSON 格式文件导入。请确保文件包含必要的字段（如标题），系统会自动验证和处理数据。"
                  type="info"
                  showIcon
                  style={{ marginBottom: 24 }}
                />
                
                {renderImportForm()}
                {renderImportResult()}
                
                <div style={{ textAlign: 'right', marginTop: 24 }}>
                  <Space>
                    <Button onClick={onCancel}>
                      取消
                    </Button>
                    <Button
                      type="primary"
                      icon={<UploadOutlined />}
                      loading={importLoading}
                      disabled={fileList.length === 0}
                      onClick={handleImport}
                    >
                      开始导入
                    </Button>
                  </Space>
                </div>
              </div>
            )
          }
        ]}
      />
    </Modal>
  );
};

export default DocumentImportExportModal;