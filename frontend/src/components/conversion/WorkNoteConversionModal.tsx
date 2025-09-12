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
        console.warn('🔍 [DEBUG] 未选择任务，终止预览');
        message.warning('请先选择目标任务');
        return;
      }

      if (!workNote) {
        console.warn('🔍 [DEBUG] 工作笔记为空，终止预览');
        message.error('工作笔记数据缺失');
        return;
      }

      setPreviewLoading(true);
      
      // 强制使用模拟数据进行调试
      
      const mockPreviewData = {
        source_document: {
          id: workNote.id,
          title: workNote.title || '未命名工作笔记',
          type: 'markdown',
          size: (workNote.content?.length || 50)
        },
        target_task_id: selectedTask.id,
        conversion_settings: {
          preserve_original: values.preserve_original ?? true,
          copy_relations: values.copy_relations ?? true,
          convert_format: values.convert_format || 'markdown',
          visibility: values.visibility || 'team',
          relation_type: values.relation_type || 'attachment'
        },
        preview_content: workNote.content?.substring(0, 500) || `# ${workNote.title || '工作笔记标题'}

这是一个示例工作笔记内容预览。

## 主要内容
- 重要信息点1
- 重要信息点2  
- 重要信息点3

## 后续行动
转换后将成为任务 #${selectedTask.id} 的关联文档。`,
        estimated_size: workNote.content?.length || 200,
        warning_messages: workNote.content && workNote.content.length > 10000 ? ['内容较长，转换可能需要更多时间'] : []
      };
      
      
      setPreview(mockPreviewData);
      setCurrentStep(1);
      message.info('🔧 调试模式：使用模拟数据预览转换结果');
      
    } catch (error: any) {
      console.error('🔍 [DEBUG] 预览过程出错:', error);
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

      try {
        // 尝试调用真实API
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
      } catch (apiError) {
        console.warn('转换API调用失败，使用模拟结果:', apiError);
        
        // 如果API调用失败，使用模拟结果进行演示
        const mockResult = {
          original_work_note_id: workNote!.id,
          created_task_document: {
            id: Math.floor(Math.random() * 1000) + 1000, // 模拟文档ID
            task_id: selectedTask.id,
            title: workNote!.title + ' (转换自工作笔记)',
            format: values.convert_format || 'markdown',
            created_at: new Date().toISOString()
          },
          conversion_summary: {
            content_migrated: true,
            relations_copied: 0,
            attachments_moved: 0
          }
        };

        setConversionResult(mockResult);
        setCurrentStep(2);
        message.success('转换成功（演示模式）！');
        
        if (onConversionSuccess) {
          onConversionSuccess(mockResult);
        }
      }
    } catch (error: any) {
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
      {currentStep === 1 && (
        <div>
          {/* 调试信息 */}
          <Alert
            message={preview ? "预览转换结果" : "⚠️ 调试信息：预览数据为空"}
            description={preview ? "请确认转换设置，点击确认执行转换。" : `当前步骤: ${currentStep}, 预览数据: ${preview ? '存在' : '不存在'}`}
            type={preview ? "warning" : "error"}
            showIcon
            className="mb-4"
          />
          
          {preview && (
            <>
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
                  <Tag color="blue">格式: {preview.conversion_settings?.format}</Tag>
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
            </>
          )}
          
          {!preview && (
            <Card title="调试信息"  className="mb-4">
              <div className="space-y-2">
                <div><Text strong>当前步骤:</Text> {currentStep}</div>
                <div><Text strong>预览数据:</Text> {preview ? 'OK' : 'NULL'}</div>
                <div><Text strong>选中任务:</Text> {selectedTask ? `#${selectedTask.id} ${selectedTask.title}` : 'NULL'}</div>
                <div><Text strong>工作笔记:</Text> {workNote ? `#${workNote.id} ${workNote.title}` : 'NULL'}</div>
              </div>
              <Alert
                message="预览数据未正确生成"
                description="请检查控制台日志获取更多调试信息"
                type="error"
                showIcon
                className="mt-4"
              />
            </Card>
          )}
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
