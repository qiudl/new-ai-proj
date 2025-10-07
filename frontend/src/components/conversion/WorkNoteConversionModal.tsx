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
  message,
  Steps
} from 'antd';
import {
  FileTextOutlined,
  SwapOutlined,
  SettingOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { 
  workNotesService, 
  WorkNote, 
  ConversionOptions, 
  ConvertToTaskDocumentRequest,
  ConversionResult
} from '../../services/workNotesService';
import { Task } from '../../types/task';
import WorkNoteTaskSelectionModal from '../WorkNoteTaskSelectionModal';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface WorkNoteConversionModalProps {
  visible: boolean;
  onClose: () => void;
  workNote: WorkNote | null;
  onConversionSuccess?: (result: ConversionResult) => void;
}

const WorkNoteConversionModal: React.FC<WorkNoteConversionModalProps> = ({
  visible,
  onClose,
  workNote,
  onConversionSuccess
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [taskSelectionVisible, setTaskSelectionVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);

  // 处理任务选择
  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    form.setFieldsValue({ target_task_id: task.id });
    setTaskSelectionVisible(false);
  };

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setPreview(null);
      setConversionResult(null);
      setSelectedTask(null);
      setTaskSelectionVisible(false);
      form.resetFields();
    }
  }, [visible, form]);

  // 默认转换选项
  const getDefaultOptions = (): ConversionOptions => ({
    preserve_original: true,
    copy_relations: true,
    convert_format: 'markdown',
    visibility: 'team',
    relation_type: 'attachment'
  });

  // 获取预览
  const handlePreview = async () => {
    try {
      const values = form.getFieldsValue();

      if (!selectedTask) {
        message.warning('请先选择目标任务');
        return;
      }

      if (!workNote) {
        message.error('工作笔记数据缺失');
        return;
      }

      setPreviewLoading(true);

      // 调用真实API获取预览
      const previewData = await workNotesService.getConversionPreview(workNote.id, {
        target_task_id: selectedTask.id,
        conversion_options: {
          preserve_original: values.preserve_original ?? true,
          copy_relations: values.copy_relations ?? true,
          convert_format: values.convert_format || 'markdown',
          visibility: values.visibility || 'team',
          relation_type: values.relation_type || 'attachment'
        }
      });

      setPreview(previewData);
      setCurrentStep(1);

    } catch (error: any) {
      console.error('获取预览失败:', error);
      message.error(error.message || '获取预览失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  // 执行转换
  const handleConvert = async () => {
    try {
      const values = form.getFieldsValue();
      if (!selectedTask) {
        message.warning('请先选择目标任务');
        return;
      }

      setLoading(true);

      // 调用真实API执行转换
      const result = await workNotesService.convertToTaskDocument(workNote!.id, {
        target_task_id: selectedTask.id,
        conversion_options: {
          ...getDefaultOptions(),
          ...values
        }
      });

      setConversionResult(result);
      setCurrentStep(2);
      message.success('转换成功！');

      if (onConversionSuccess) {
        onConversionSuccess(result);
      }
    } catch (error: any) {
      console.error('转换失败:', error);
      message.error(error.message || '转换失败');
    } finally {
      setLoading(false);
    }
  };

  // 关闭对话框
  const handleClose = () => {
    form.resetFields();
    setCurrentStep(0);
    setPreview(null);
    setConversionResult(null);
    setSelectedTask(null);
    setTaskSelectionVisible(false);
    onClose();
  };

  return (
    <Modal
      title="工作笔记转任务文档"
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={null}
      destroyOnHidden
    >
      <Steps current={currentStep} className="mb-6">
        <Step title="配置选项" icon={<SettingOutlined />} />
        <Step title="预览确认" icon={<EyeOutlined />} />
        <Step title="转换完成" icon={<CheckCircleOutlined />} />
      </Steps>

      {/* 步骤1：配置选项 */}
      {currentStep === 0 && (
        <div>
          <Alert
            message="将工作笔记转换为任务文档"
            description="选择目标任务和转换选项，工作笔记的内容和关联关系将被迁移到任务文档中。"
            type="info"
            showIcon
            className="mb-4"
          />

          <Card title="源工作笔记"  className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <Title level={5} className="mb-1">{workNote?.title}</Title>
                <Text type="secondary">
                  {workNote?.type.toUpperCase()} • {workNote?.status} • 
                  {workNote?.content ? `${workNote.content.length} 字符` : '无内容'}
                </Text>
              </div>
              <FileTextOutlined className="text-2xl text-blue-500" />
            </div>
          </Card>

          <Form
            form={form}
            layout="vertical"
            initialValues={getDefaultOptions()}
          >
            <Form.Item
              name="target_task_id"
              label="目标任务"
              rules={[{ required: true, message: '请选择目标任务' }]}
            >
              <div>
                {selectedTask ? (
                  <Card  style={{ marginBottom: 8, background: '#f6ffed', borderColor: '#b7eb8f' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Text strong style={{ color: '#389e0d' }}>#{selectedTask.id} {selectedTask.title}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          状态: {selectedTask.status} • 优先级: {selectedTask.priority || '无'}
                        </Text>
                      </div>
                      <Button 
                         
                        onClick={() => setTaskSelectionVisible(true)}
                      >
                        重新选择
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Button 
                    type="dashed" 
                    block
                    icon={<SearchOutlined />}
                    onClick={() => setTaskSelectionVisible(true)}
                  >
                    选择目标任务
                  </Button>
                )}
              </div>
            </Form.Item>

            <Divider />

            <Form.Item
              name="convert_format"
              label="转换格式"
            >
              <Select>
                <Option value="markdown">Markdown</Option>
                <Option value="txt">纯文本</Option>
                <Option value="html">HTML</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="visibility"
              label="可见性"
            >
              <Select>
                <Option value="private">私有</Option>
                <Option value="team">团队</Option>
                <Option value="public">公开</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="preserve_original"
              label="保留原工作笔记"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="copy_relations"
              label="复制关联关系"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Form>

          <div className="flex justify-end mt-6">
            <Space>
              <Button onClick={handleClose}>取消</Button>
              <Button 
                type="primary" 
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={previewLoading}
              >
                预览
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* 步骤2：预览确认 */}
      {currentStep === 1 && preview && (
        <div>
          <Alert
            message="预览转换结果"
            description="请确认转换设置，点击确认执行转换。"
            type="warning"
            showIcon
            className="mb-4"
          />

          <Card title="转换详情"  className="mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text strong>源文档:</Text>
                <br />
                <Text>{preview.source_document?.title}</Text>
                <br />
                <Text type="secondary">
                  {preview.source_document?.type} • {preview.source_document?.size} 字符
                </Text>
              </div>
              <div>
                <Text strong>目标任务:</Text>
                <br />
                <Text>任务 #{preview.target_task_id}</Text>
              </div>
            </div>
          </Card>

          <Card title="转换设置"  className="mb-4">
            <div className="flex flex-wrap gap-2">
              <Tag color="blue">格式: {preview.conversion_settings?.convert_format}</Tag>
              <Tag color="green">可见性: {preview.conversion_settings?.visibility}</Tag>
              <Tag color={preview.conversion_settings?.preserve_original ? 'orange' : 'red'}>
                {preview.conversion_settings?.preserve_original ? '保留原文档' : '删除原文档'}
              </Tag>
              <Tag color={preview.conversion_settings?.copy_relations ? 'cyan' : 'default'}>
                {preview.conversion_settings?.copy_relations ? '复制关联' : '不复制关联'}
              </Tag>
            </div>
          </Card>

          {preview.preview_content && (
            <Card title="内容预览"  className="mb-4">
              <Paragraph
                ellipsis={{ rows: 4, expandable: true }}
                className="bg-gray-50 p-3 rounded"
              >
                {preview.preview_content}
              </Paragraph>
            </Card>
          )}

          {preview.warning_messages && preview.warning_messages.length > 0 && (
            <Alert
              message="注意事项"
              description={
                <ul>
                  {preview.warning_messages.map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              }
              type="info"
              showIcon
              className="mb-4"
            />
          )}

          <div className="flex justify-between mt-6">
            <Button onClick={() => setCurrentStep(0)}>返回</Button>
            <Space>
              <Button onClick={handleClose}>取消</Button>
              <Button
                type="primary"
                icon={<SwapOutlined />}
                onClick={handleConvert}
                loading={loading}
              >
                确认转换
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* 步骤3：转换完成 */}
      {currentStep === 2 && conversionResult && (
        <div>
          <Alert
            message="转换成功完成！"
            description="工作笔记已成功转换为任务文档。"
            type="success"
            showIcon
            className="mb-4"
          />

          <Card title="转换结果"  className="mb-4">
            <div className="space-y-3">
              <div>
                <Text strong>任务文档ID:</Text> {conversionResult.created_task_document.id}
              </div>
              <div>
                <Text strong>关联任务:</Text> #{conversionResult.created_task_document.task_id}
              </div>
              <div>
                <Text strong>文档标题:</Text> {conversionResult.created_task_document.title}
              </div>
              <div>
                <Text strong>创建时间:</Text> {new Date(conversionResult.created_task_document.created_at).toLocaleString()}
              </div>
            </div>
          </Card>

          <Card title="转换摘要"  className="mb-4">
            <div className="flex flex-wrap gap-2">
              <Tag color="green" icon={<CheckCircleOutlined />}>
                内容已迁移
              </Tag>
              <Tag color="blue">
                复制了 {conversionResult.conversion_summary.relations_copied} 个关联
              </Tag>
              <Tag color="orange">
                移动了 {conversionResult.conversion_summary.attachments_moved} 个附件
              </Tag>
            </div>
          </Card>

          <div className="flex justify-end mt-6">
            <Button type="primary" onClick={handleClose}>
              完成
            </Button>
          </div>
        </div>
      )}
      
      {/* 任务选择对话框 */}
      <WorkNoteTaskSelectionModal
        visible={taskSelectionVisible}
        onClose={() => setTaskSelectionVisible(false)}
        onSelect={handleTaskSelect}
        selectedTaskId={selectedTask?.id}
        title="选择转换目标任务"
      />
    </Modal>
  );
};

export default WorkNoteConversionModal;
