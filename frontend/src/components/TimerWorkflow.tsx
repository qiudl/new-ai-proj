import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Steps, 
  Button, 
  Select, 
  InputNumber, 
  Switch, 
  Form, 
  Space, 
  Modal, 
  List, 
  Typography, 
  Progress,
  Tooltip,
  Tag,
  message,
  Divider,
  Alert,
  Input
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  BulbOutlined,
  FireOutlined,
  CoffeeOutlined,
  BellOutlined
} from '@ant-design/icons';
import TimerService from '../services/timerService';
import NotificationService from '../services/notificationService';
import { Task } from '../types/task';
import { TaskOption } from '../types/timer';

const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;

interface WorkflowStep {
  id: string;
  title: string;
  taskId?: number;
  taskTitle?: string;
  duration: number; // in minutes
  breakAfter: boolean;
  breakDuration: number; // in minutes
  completed: boolean;
  startTime?: Date;
  endTime?: Date;
}

interface TimerWorkflowProps {
  tasks?: Task[];
  onWorkflowUpdate?: (isActive: boolean, currentStep?: WorkflowStep) => void;
}

const TimerWorkflow: React.FC<TimerWorkflowProps> = ({ tasks = [], onWorkflowUpdate }) => {
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isWorkflowActive, setIsWorkflowActive] = useState(false);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [workflowProgress, setWorkflowProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [availableTasks, setAvailableTasks] = useState<TaskOption[]>([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [form] = Form.useForm();

  // Predefined workflow templates
  const workflowTemplates = {
    pomodoro: {
      name: 'Pomodoro 专注法',
      description: '25分钟专注 + 5分钟休息',
      steps: [
        { duration: 25, breakAfter: true, breakDuration: 5 },
        { duration: 25, breakAfter: true, breakDuration: 5 },
        { duration: 25, breakAfter: true, breakDuration: 5 },
        { duration: 25, breakAfter: true, breakDuration: 15 }
      ]
    },
    deepWork: {
      name: '深度工作法',
      description: '90分钟深度专注 + 20分钟休息',
      steps: [
        { duration: 90, breakAfter: true, breakDuration: 20 },
        { duration: 90, breakAfter: true, breakDuration: 20 }
      ]
    },
    sprint: {
      name: '敏捷冲刺',
      description: '45分钟工作 + 15分钟休息',
      steps: [
        { duration: 45, breakAfter: true, breakDuration: 15 },
        { duration: 45, breakAfter: true, breakDuration: 15 },
        { duration: 45, breakAfter: false, breakDuration: 0 }
      ]
    }
  };

  // Load available tasks
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const taskOptions = await TimerService.getAvailableTasks();
        setAvailableTasks(taskOptions);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    };

    loadTasks();
  }, []);

  // Workflow timer effect
  useEffect(() => {
    if (!isWorkflowActive || workflow.length === 0) return;

    const interval = setInterval(() => {
      const currentStep = workflow[currentStepIndex];
      if (!currentStep || currentStep.completed) return;

      const now = Date.now();
      const stepStartTime = currentStep.startTime?.getTime() || now;
      const targetDuration = isBreakTime ? currentStep.breakDuration : currentStep.duration;
      const elapsedTime = (now - stepStartTime) / (1000 * 60); // in minutes

      const remaining = Math.max(0, targetDuration - elapsedTime);
      setTimeRemaining(remaining);

      // Update overall progress
      const totalSteps = workflow.length;
      const completedSteps = workflow.filter(s => s.completed).length;
      const currentProgress = ((completedSteps + (1 - remaining / targetDuration)) / totalSteps) * 100;
      setWorkflowProgress(Math.min(100, currentProgress));

      // Check if current step/break is completed
      if (remaining <= 0) {
        completeCurrentStep();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorkflowActive, currentStepIndex, isBreakTime, workflow]);

  // Complete current step
  const completeCurrentStep = async () => {
    const currentStep = workflow[currentStepIndex];
    if (!currentStep) return;

    if (isBreakTime) {
      // Break completed, move to next step
      setIsBreakTime(false);
      await NotificationService.notifyMilestone('休息结束', '请开始下一个工作阶段', 0);
      
      if (currentStepIndex < workflow.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        // Workflow completed
        completeWorkflow();
      }
    } else {
      // Work step completed
      const updatedWorkflow = [...workflow];
      updatedWorkflow[currentStepIndex] = {
        ...currentStep,
        completed: true,
        endTime: new Date()
      };
      setWorkflow(updatedWorkflow);

      await NotificationService.notifyMilestone(
        '工作阶段完成',
        `${currentStep.taskTitle || '任务'} 完成`,
        currentStep.duration
      );

      if (currentStep.breakAfter) {
        // Start break
        setIsBreakTime(true);
        await NotificationService.notifyMilestone('休息时间', '请适当休息', 0);
      } else {
        // No break, move to next step
        if (currentStepIndex < workflow.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
        } else {
          completeWorkflow();
        }
      }
    }
  };

  // Complete entire workflow
  const completeWorkflow = async () => {
    setIsWorkflowActive(false);
    setWorkflowProgress(100);
    
    await NotificationService.notifyTimerStop(
      '工作流程完成',
      `总计 ${workflow.length} 个阶段`
    );

    message.success('恭喜！工作流程已完成');
    
    if (onWorkflowUpdate) {
      onWorkflowUpdate(false);
    }
  };

  // Start workflow
  const startWorkflow = async () => {
    if (workflow.length === 0) {
      message.warning('请先设置工作流程');
      setShowSetupModal(true);
      return;
    }

    setIsWorkflowActive(true);
    setCurrentStepIndex(0);
    setIsBreakTime(false);
    setWorkflowProgress(0);

    // Mark start time for first step
    const updatedWorkflow = [...workflow];
    updatedWorkflow[0] = {
      ...updatedWorkflow[0],
      startTime: new Date()
    };
    setWorkflow(updatedWorkflow);

    await NotificationService.notifyTimerStart(`工作流程开始: ${workflow[0].taskTitle || '第一阶段'}`);
    message.success('工作流程已开始');

    if (onWorkflowUpdate) {
      onWorkflowUpdate(true, workflow[0]);
    }
  };

  // Stop workflow
  const stopWorkflow = () => {
    Modal.confirm({
      title: '确认停止工作流程？',
      content: '当前进度将会丢失',
      onOk: () => {
        setIsWorkflowActive(false);
        setIsBreakTime(false);
        setWorkflowProgress(0);
        
        if (onWorkflowUpdate) {
          onWorkflowUpdate(false);
        }
        
        message.info('工作流程已停止');
      }
    });
  };

  // Setup workflow from template
  const setupFromTemplate = (templateKey: keyof typeof workflowTemplates) => {
    const template = workflowTemplates[templateKey];
    const newWorkflow: WorkflowStep[] = template.steps.map((step, index) => ({
      id: `step_${index}`,
      title: `阶段 ${index + 1}`,
      duration: step.duration,
      breakAfter: step.breakAfter,
      breakDuration: step.breakDuration,
      completed: false
    }));

    setWorkflow(newWorkflow);
    form.setFieldsValue({ workflow: newWorkflow });
  };

  // Custom workflow setup
  const handleFormSubmit = (values: any) => {
    const { workflow: formWorkflow } = values;
    setWorkflow(formWorkflow);
    setShowSetupModal(false);
    message.success('工作流程设置完成');
  };

  const currentStep = workflow[currentStepIndex];
  const isInProgress = isWorkflowActive && currentStep && !currentStep.completed;

  return (
    <Card
      title={
        <Space>
          <FireOutlined />
          <span>智能工作流</span>
          <Tag color={isWorkflowActive ? 'processing' : 'default'}>
            {isWorkflowActive ? (isBreakTime ? '休息中' : '工作中') : '待机'}
          </Tag>
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => setShowSetupModal(true)}
            size="small"
          >
            设置
          </Button>
          {!isWorkflowActive ? (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={startWorkflow}
              disabled={workflow.length === 0}
            >
              开始
            </Button>
          ) : (
            <Button
              danger
              icon={<PauseCircleOutlined />}
              onClick={stopWorkflow}
            >
              停止
            </Button>
          )}
        </Space>
      }
      className="timer-workflow-card"
    >
      {/* Progress Overview */}
      {workflow.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Text strong>总体进度</Text>
            <Text>{Math.round(workflowProgress)}%</Text>
          </div>
          <Progress 
            percent={workflowProgress} 
            status={isWorkflowActive ? 'active' : 'normal'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>
      )}

      {/* Current Step Info */}
      {isInProgress && (
        <Alert
          message={
            <Space>
              {isBreakTime ? <CoffeeOutlined /> : <ClockCircleOutlined />}
              <span>
                {isBreakTime ? '休息时间' : `正在进行: ${currentStep.taskTitle || currentStep.title}`}
              </span>
            </Space>
          }
          description={
            <div>
              <Text>剩余时间: {Math.ceil(timeRemaining)} 分钟</Text>
              <Progress 
                percent={((isBreakTime ? currentStep.breakDuration : currentStep.duration) - timeRemaining) / (isBreakTime ? currentStep.breakDuration : currentStep.duration) * 100}
                size="small"
                showInfo={false}
                strokeColor={isBreakTime ? '#52c41a' : '#1890ff'}
                style={{ marginTop: '8px' }}
              />
            </div>
          }
          type={isBreakTime ? 'success' : 'info'}
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Workflow Steps */}
      {workflow.length > 0 ? (
        <Steps
          current={currentStepIndex}
          direction="vertical"
          size="small"
        >
          {workflow.map((step, index) => (
            <Step
              key={step.id}
              title={step.taskTitle || step.title}
              description={
                <Space direction="vertical" size="small">
                  <Text type="secondary">
                    工作 {step.duration} 分钟
                    {step.breakAfter && ` + 休息 ${step.breakDuration} 分钟`}
                  </Text>
                  {step.completed && (
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      已完成
                    </Tag>
                  )}
                </Space>
              }
              status={
                step.completed ? 'finish' :
                index === currentStepIndex ? 'process' : 'wait'
              }
              icon={
                step.completed ? <CheckCircleOutlined /> :
                index === currentStepIndex && isBreakTime ? <CoffeeOutlined /> :
                index === currentStepIndex ? <ClockCircleOutlined /> : 
                undefined
              }
            />
          ))}
        </Steps>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <BulbOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
          <Title level={4} type="secondary">尚未设置工作流程</Title>
          <Text type="secondary">点击"设置"按钮创建您的专属工作流程</Text>
        </div>
      )}

      {/* Setup Modal */}
      <Modal
        title="设置工作流程"
        open={showSetupModal}
        onCancel={() => setShowSetupModal(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: '24px' }}>
          <Title level={5}>选择模板</Title>
          <Space wrap>
            {Object.entries(workflowTemplates).map(([key, template]) => (
              <Card
                key={key}
                size="small"
                hoverable
                onClick={() => setupFromTemplate(key as keyof typeof workflowTemplates)}
                style={{ width: 200, cursor: 'pointer' }}
              >
                <Card.Meta
                  title={template.name}
                  description={template.description}
                />
              </Card>
            ))}
          </Space>
        </div>

        <Divider />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{ workflow: [] }}
        >
          <Form.List name="workflow">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <Title level={5}>自定义工作流程</Title>
                  <Button type="dashed" onClick={() => add()} icon={<BulbOutlined />}>
                    添加阶段
                  </Button>
                </div>

                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: '8px' }}>
                    <Space align="baseline" wrap>
                      <Form.Item
                        {...restField}
                        name={[name, 'title']}
                        label="阶段名称"
                        rules={[{ required: true, message: '请输入阶段名称' }]}
                      >
                        <Input placeholder="阶段名称" />
                      </Form.Item>
                      
                      <Form.Item
                        {...restField}
                        name={[name, 'taskId']}
                        label="关联任务"
                      >
                        <Select placeholder="选择任务" style={{ width: 200 }} allowClear>
                          {availableTasks.map(task => (
                            <Option key={task.id} value={task.id}>
                              {task.title}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'duration']}
                        label="工作时长(分钟)"
                        rules={[{ required: true, message: '请输入时长' }]}
                      >
                        <InputNumber min={1} max={180} />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'breakAfter']}
                        label="休息"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'breakDuration']}
                        label="休息时长(分钟)"
                      >
                        <InputNumber min={1} max={60} />
                      </Form.Item>

                      <Button type="link" danger onClick={() => remove(name)}>
                        删除
                      </Button>
                    </Space>
                  </Card>
                ))}
              </>
            )}
          </Form.List>

          <Form.Item style={{ marginTop: '24px' }}>
            <Space>
              <Button type="primary" htmlType="submit">
                保存工作流程
              </Button>
              <Button onClick={() => setShowSetupModal(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TimerWorkflow;