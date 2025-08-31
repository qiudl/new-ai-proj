import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Switch,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  Divider,
  Card,
  Tag,
  Spin,
  message,
  Steps,
  Progress,
  List,
  Checkbox,
  Row,
  Col,
  Tooltip,
  notification
} from 'antd';
import {
  FileTextOutlined,
  SwapOutlined,
  SettingOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons';
import { 
  workNotesService, 
  WorkNote, 
  ConversionOptions, 
  ConvertToTaskDocumentRequest,
  ConversionResult
} from '../../services/workNotesService';
import { TaskService } from '../../services/taskService';
import { Task } from '../../types/task';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface BatchConversionItem {
  id: number;
  title: string;
  content?: string;  // 修改为可选，与 WorkNote 保持一致
  description?: string;
  status: 'draft' | 'published' | 'archived' | 'template';
  visibility: 'private' | 'team' | 'public';
  tags?: string[];  // 修改为可选，与 WorkNote 保持一致
  is_template: boolean;
  type: string;
  owner_id: number;
  version: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  conversionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: ConversionResult;
}

interface BatchWorkNoteConversionModalProps {
  visible: boolean;
  onClose: () => void;
  workNotes: WorkNote[];
  onConversionSuccess?: (results: ConversionResult[]) => void;
}

const BatchWorkNoteConversionModal: React.FC<BatchWorkNoteConversionModalProps> = ({
  visible,
  onClose,
  workNotes = [],
  onConversionSuccess
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [batchItems, setBatchItems] = useState<BatchConversionItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [results, setResults] = useState<ConversionResult[]>([]);

  // 加载任务列表
  const loadTasks = async () => {
    try {
      const response = await TaskService.getAllTasks({
        status: 'in_progress' as any,
        page_size: 100
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  useEffect(() => {
    if (visible && workNotes.length > 0) {
      loadTasks();
      setCurrentStep(0);
      
      // 初始化批量转换项目
      const items: BatchConversionItem[] = workNotes.map(note => ({
        ...note,
        conversionStatus: 'pending' as const
      }));
      
      setBatchItems(items);
      setSelectedItems(items.map(item => item.id));
      setConversionProgress(0);
      setCompletedCount(0);
      setFailedCount(0);
      setResults([]);
      
      form.resetFields();
      form.setFieldsValue({
        conversion_options: {
          preserve_original: true,
          copy_relations: true,
          convert_format: 'markdown',
          visibility: 'team',
          relation_type: 'attachment'
        }
      });
    }
  }, [visible, workNotes, form]);

  // 默认转换选项
  const getDefaultOptions = (): ConversionOptions => ({
    preserve_original: true,
    copy_relations: true,
    convert_format: 'markdown',
    visibility: 'team',
    relation_type: 'attachment'
  });

  // 处理选择/取消选择
  const handleItemSelect = (itemId: number, checked: boolean) => {
    setSelectedItems(prev => 
      checked 
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? batchItems.map(item => item.id) : []);
  };

  // 执行批量转换
  const handleBatchConversion = async () => {
    const values = form.getFieldsValue();
    
    if (!values.target_task_id) {
      message.warning('请选择目标任务');
      return;
    }

    if (selectedItems.length === 0) {
      message.warning('请选择要转换的工作笔记');
      return;
    }

    setLoading(true);
    setCurrentStep(2);
    setConversionProgress(0);
    setCompletedCount(0);
    setFailedCount(0);
    setResults([]);

    const selectedWorkNotes = batchItems.filter(item => selectedItems.includes(item.id));
    const totalItems = selectedWorkNotes.length;
    let processedCount = 0;
    const conversionResults: ConversionResult[] = [];

    try {
      // 更新所有选中项目的状态为处理中
      setBatchItems(prev => prev.map(item => 
        selectedItems.includes(item.id) 
          ? { ...item, conversionStatus: 'processing' as const }
          : item
      ));

      // 逐一处理每个工作笔记
      for (const item of selectedWorkNotes) {
        try {
          const conversionOptions: ConversionOptions = {
            ...getDefaultOptions(),
            ...values.conversion_options
          };

          const request: ConvertToTaskDocumentRequest = {
            target_task_id: values.target_task_id,
            conversion_options: conversionOptions
          };

          const result = await workNotesService.convertToTaskDocument(item.id, request);
          
          // 更新该项目状态为完成
          setBatchItems(prev => prev.map(prevItem => 
            prevItem.id === item.id 
              ? { ...prevItem, conversionStatus: 'completed' as const, result }
              : prevItem
          ));

          conversionResults.push(result);
          setCompletedCount(prev => prev + 1);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '转换失败';
          
          // 更新该项目状态为失败
          setBatchItems(prev => prev.map(prevItem => 
            prevItem.id === item.id 
              ? { ...prevItem, conversionStatus: 'failed' as const, error: errorMessage }
              : prevItem
          ));

          setFailedCount(prev => prev + 1);
          console.error(`Failed to convert work note ${item.id}:`, error);
        }

        processedCount++;
        setConversionProgress(Math.round((processedCount / totalItems) * 100));
      }

      setResults(conversionResults);

      // 显示结果通知
      if (conversionResults.length > 0 && failedCount === 0) {
        notification.success({
          message: '批量转换成功',
          description: `成功转换 ${conversionResults.length} 个工作笔记为任务文档`,
          duration: 3,
        });
      } else if (conversionResults.length > 0 && failedCount > 0) {
        notification.warning({
          message: '部分转换成功',
          description: `成功转换 ${conversionResults.length} 个，失败 ${failedCount} 个`,
          duration: 5,
        });
      } else {
        notification.error({
          message: '批量转换失败',
          description: '所有工作笔记转换失败，请检查配置并重试',
          duration: 5,
        });
      }

      // 调用成功回调
      if (onConversionSuccess && conversionResults.length > 0) {
        onConversionSuccess(conversionResults);
      }

    } catch (error) {
      console.error('Batch conversion error:', error);
      message.error('批量转换过程中出现错误');
    } finally {
      setLoading(false);
    }
  };

  // 重置对话框
  const handleClose = () => {
    setCurrentStep(0);
    setLoading(false);
    setBatchItems([]);
    setSelectedItems([]);
    setConversionProgress(0);
    setCompletedCount(0);
    setFailedCount(0);
    setResults([]);
    form.resetFields();
    onClose();
  };

  // 步骤定义
  const steps = [
    {
      title: '选择笔记',
      icon: <FileTextOutlined />,
      description: '确认要转换的工作笔记'
    },
    {
      title: '配置转换',
      icon: <SettingOutlined />,
      description: '设置转换参数和目标任务'
    },
    {
      title: '执行转换',
      icon: <SwapOutlined />,
      description: '批量转换工作笔记为任务文档'
    }
  ];

  // 获取状态图标
  const getStatusIcon = (status: BatchConversionItem['conversionStatus']) => {
    switch (status) {
      case 'pending':
        return <InfoCircleOutlined style={{ color: '#faad14' }} />;
      case 'processing':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <Alert
              message="选择要转换的工作笔记"
              description={`共 ${workNotes.length} 个工作笔记可供选择，已选择 ${selectedItems.length} 个`}
              type="info"
              style={{ marginBottom: 16 }}
              action={
                <Space>
                  <Button 
                    size="small" 
                    type="primary" 
                    ghost
                    onClick={() => handleSelectAll(true)}
                  >
                    全选
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => handleSelectAll(false)}
                  >
                    清空
                  </Button>
                </Space>
              }
            />
            
            <List
              size="small"
              dataSource={batchItems}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                    />
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 16, color: '#1890ff' }} />}
                    title={
                      <Space>
                        <Text strong>#{item.id}</Text>
                        <Text>{item.title}</Text>
                        {item.is_template && <Tag color="gold">模板</Tag>}
                      </Space>
                    }
                    description={
                      <Space>
                        <Tag color={item.status === 'published' ? 'green' : 'orange'}>
                          {item.status}
                        </Tag>
                        <Tag color={item.visibility === 'public' ? 'green' : 'blue'}>
                          {item.visibility}
                        </Tag>
                        {item.tags && item.tags.length > 0 && (
                          <Text type="secondary">
                            标签: {item.tags.join(', ')}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
              style={{ maxHeight: 400, overflowY: 'auto' }}
            />
          </div>
        );

      case 1:
        return (
          <Form form={form} layout="vertical">
            <Alert
              message="配置批量转换参数"
              description={`将为 ${selectedItems.length} 个工作笔记统一应用以下转换设置`}
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name="target_task_id"
              label="目标任务"
              rules={[{ required: true, message: '请选择目标任务' }]}
            >
              <Select
                placeholder="选择要关联的任务"
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)
                    ?.toLowerCase()
                    ?.includes(input.toLowerCase())
                }
              >
                {tasks.map(task => (
                  <Option key={task.id} value={task.id}>
                    #{task.id} - {task.title}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="additional_instructions"
              label="转换说明"
            >
              <Input.TextArea
                placeholder="为批量转换添加统一的说明（可选）"
                rows={3}
              />
            </Form.Item>

            <Divider>转换选项</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['conversion_options', 'preserve_original']}
                  label="保留原工作笔记"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['conversion_options', 'copy_relations']}
                  label="复制关联关系"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['conversion_options', 'convert_format']}
                  label="转换格式"
                >
                  <Select>
                    <Option value="markdown">Markdown</Option>
                    <Option value="html">HTML</Option>
                    <Option value="text">纯文本</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['conversion_options', 'visibility']}
                  label="文档可见性"
                >
                  <Select>
                    <Option value="private">私有</Option>
                    <Option value="team">团队</Option>
                    <Option value="public">公开</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name={['conversion_options', 'relation_type']}
              label="关联关系类型"
            >
              <Select>
                <Option value="main">主文档</Option>
                <Option value="attachment">附件</Option>
                <Option value="reference">参考</Option>
              </Select>
            </Form.Item>
          </Form>
        );

      case 2:
        return (
          <div>
            <Alert
              message={
                loading 
                  ? "正在执行批量转换..." 
                  : `批量转换完成 - 成功: ${completedCount}, 失败: ${failedCount}`
              }
              type={loading ? "info" : (failedCount === 0 ? "success" : "warning")}
              style={{ marginBottom: 16 }}
            />

            <Progress 
              percent={conversionProgress}
              status={loading ? "active" : (failedCount === 0 ? "success" : "exception")}
              style={{ marginBottom: 16 }}
              format={() => `${completedCount + failedCount}/${selectedItems.length}`}
            />

            <List
              size="small"
              dataSource={batchItems.filter(item => selectedItems.includes(item.id))}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={getStatusIcon(item.conversionStatus)}
                    title={
                      <Space>
                        <Text strong>#{item.id}</Text>
                        <Text>{item.title}</Text>
                        {item.conversionStatus === 'completed' && item.result && (
                          <Tag color="green">转换成功</Tag>
                        )}
                      </Space>
                    }
                    description={
                      item.error ? (
                        <Text type="danger">{item.error}</Text>
                      ) : item.conversionStatus === 'completed' ? (
                        <Text type="success">转换成功</Text>
                      ) : item.conversionStatus === 'processing' ? (
                        <Text type="secondary">转换中...</Text>
                      ) : (
                        <Text type="secondary">等待转换</Text>
                      )
                    }
                  />
                </List.Item>
              )}
              style={{ maxHeight: 400, overflowY: 'auto' }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <AppstoreAddOutlined />
          <span>批量转换为任务文档</span>
          <Tag color="blue">{workNotes.length} 个工作笔记</Tag>
        </Space>
      }
      visible={visible}
      onCancel={handleClose}
      width={800}
      footer={
        <Space>
          <Button onClick={handleClose}>
            取消
          </Button>
          {currentStep > 0 && (
            <Button
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={loading}
            >
              上一步
            </Button>
          )}
          {currentStep < 2 && (
            <Button
              type="primary"
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={currentStep === 0 && selectedItems.length === 0}
            >
              下一步
            </Button>
          )}
          {currentStep === 1 && (
            <Button
              type="primary"
              onClick={handleBatchConversion}
              loading={loading}
              disabled={selectedItems.length === 0}
            >
              开始批量转换
            </Button>
          )}
        </Space>
      }
      destroyOnClose
      maskClosable={false}
    >
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 24 }}
        items={steps}
      />

      <Spin spinning={loading}>
        {renderStepContent()}
      </Spin>
    </Modal>
  );
};

export default BatchWorkNoteConversionModal;