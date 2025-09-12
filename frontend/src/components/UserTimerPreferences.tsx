// UserTimerPreferences - 用户计时器偏好设置组件
// 任务#243: 前端通用组件开发 - 用户偏好设置界面
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Switch,
  Slider,
  Button,
  Space,
  Divider,
  Typography,
  Row,
  Col,
  Tag,
  Tooltip,
  Modal,
  Alert,
  Tabs,
  InputNumber,
  Radio,
  Collapse,
  notification,
  Badge
} from 'antd';
import {
  SettingOutlined,
  BellOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  ReloadOutlined,
  ImportOutlined,
  ExportOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  GlobalOutlined,
  SecurityScanOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { unifiedTimerService } from '../services/unifiedTimerService';
import type { TaskType } from '../types/timer';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

// 用户偏好设置接口
interface UserTimerPreferences {
  // 基础设置
  default_category: string;
  default_task_type: TaskType;
  default_duration_minutes: number;
  auto_start_on_create: boolean;
  auto_stop_others: boolean;
  
  // 通知设置
  notification_enabled: boolean;
  sound_enabled: boolean;
  break_reminders: boolean;
  daily_goal_reminders: boolean;
  notification_sound: string;
  
  // 番茄钟设置
  pomodoro_work_minutes: number;
  pomodoro_short_break: number;
  pomodoro_long_break: number;
  pomodoro_cycles_before_long_break: number;
  auto_start_breaks: boolean;
  auto_start_next_session: boolean;
  
  // 智能功能设置
  enable_auto_inference: boolean;
  inference_confidence_threshold: number;
  enable_smart_suggestions: boolean;
  enable_context_learning: boolean;
  auto_categorize: boolean;
  
  // 界面设置
  preferred_timer_view: 'compact' | 'normal' | 'expanded';
  show_progress_bar: boolean;
  show_estimated_time: boolean;
  show_suggestions_panel: boolean;
  theme_mode: 'light' | 'dark' | 'auto';
  
  // 数据和隐私
  data_collection_enabled: boolean;
  anonymous_analytics: boolean;
  export_data_format: 'json' | 'csv' | 'excel';
  backup_frequency: 'never' | 'daily' | 'weekly' | 'monthly';
  
  // 高级设置
  idle_detection_minutes: number;
  auto_pause_on_idle: boolean;
  keyboard_shortcuts_enabled: boolean;
  experimental_features: boolean;
  debug_mode: boolean;
}

interface UserTimerPreferencesProps {
  visible?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  initialTab?: string;
}

export const UserTimerPreferences: React.FC<UserTimerPreferencesProps> = ({
  visible = true,
  onClose,
  embedded = false,
  initialTab = 'basic'
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserTimerPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 加载用户偏好设置
  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const response = await unifiedTimerService.getUserPreferences();
      if (response.success && response.data) {
        const prefs = response.data as UserTimerPreferences;
        setPreferences(prefs);
        form.setFieldsValue(prefs);
      }
    } catch (error) {
      notification.error({
        message: '加载设置失败',
        description: '无法加载用户偏好设置，请稍后重试'
      });
    } finally {
      setLoading(false);
    }
  }, [form]);

  // 保存用户偏好设置
  const savePreferences = async (values: UserTimerPreferences) => {
    setSaving(true);
    try {
      const response = await unifiedTimerService.updateUserPreferences(values);
      if (response.success) {
        setPreferences(values);
        setHasChanges(false);
        notification.success({
          message: '设置已保存',
          description: '您的偏好设置已成功保存'
        });
      } else {
        throw new Error(response.error || '保存失败');
      }
    } catch (error) {
      notification.error({
        message: '保存失败',
        description: error instanceof Error ? error.message : '保存设置时发生错误'
      });
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认设置
  const resetToDefaults = () => {
    const defaultPreferences: UserTimerPreferences = {
      // 基础设置
      default_category: '工作',
      default_task_type: 'project_task',
      default_duration_minutes: 25,
      auto_start_on_create: false,
      auto_stop_others: false,
      
      // 通知设置
      notification_enabled: true,
      sound_enabled: true,
      break_reminders: true,
      daily_goal_reminders: false,
      notification_sound: 'default',
      
      // 番茄钟设置
      pomodoro_work_minutes: 25,
      pomodoro_short_break: 5,
      pomodoro_long_break: 15,
      pomodoro_cycles_before_long_break: 4,
      auto_start_breaks: false,
      auto_start_next_session: false,
      
      // 智能功能设置
      enable_auto_inference: true,
      inference_confidence_threshold: 0.7,
      enable_smart_suggestions: true,
      enable_context_learning: true,
      auto_categorize: true,
      
      // 界面设置
      preferred_timer_view: 'normal',
      show_progress_bar: true,
      show_estimated_time: true,
      show_suggestions_panel: true,
      theme_mode: 'auto',
      
      // 数据和隐私
      data_collection_enabled: true,
      anonymous_analytics: true,
      export_data_format: 'json',
      backup_frequency: 'weekly',
      
      // 高级设置
      idle_detection_minutes: 5,
      auto_pause_on_idle: true,
      keyboard_shortcuts_enabled: true,
      experimental_features: false,
      debug_mode: false
    };

    form.setFieldsValue(defaultPreferences);
    setHasChanges(true);
    setShowResetConfirm(false);
    
    notification.info({
      message: '已重置为默认设置',
      description: '请点击保存按钮应用更改'
    });
  };

  // 导出设置
  const exportSettings = () => {
    if (!preferences) return;
    
    const dataStr = JSON.stringify(preferences, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timer-preferences-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    notification.success({
      message: '设置已导出',
      description: '您的偏好设置已导出为JSON文件'
    });
  };

  // 导入设置
  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const importedPrefs = JSON.parse(text) as UserTimerPreferences;
        form.setFieldsValue(importedPrefs);
        setHasChanges(true);
        notification.success({
          message: '设置已导入',
          description: '请检查导入的设置并点击保存'
        });
      } catch (error) {
        notification.error({
          message: '导入失败',
          description: '文件格式不正确或内容有误'
        });
      }
    };
    input.click();
  };

  // 监听表单变化
  const handleFormChange = () => {
    setHasChanges(true);
  };

  // 提交表单
  const handleSubmit = (values: UserTimerPreferences) => {
    savePreferences(values);
  };

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // 基础设置标签页
  const renderBasicSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="默认设置" >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item
              name="default_category"
              label="默认分类"
              tooltip="新建计时器时的默认分类"
            >
              <Select placeholder="选择默认分类">
                <Option value="工作">工作</Option>
                <Option value="学习">学习</Option>
                <Option value="开发">开发</Option>
                <Option value="会议">会议</Option>
                <Option value="写作">写作</Option>
                <Option value="设计">设计</Option>
                <Option value="其他">其他</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="default_task_type"
              label="默认任务类型"
              tooltip="新建计时器时的默认任务类型"
            >
              <Select placeholder="选择任务类型">
                <Option value="project_task">项目任务</Option>
                <Option value="personal_task">个人任务</Option>
                <Option value="quick_timer">快速计时</Option>
                <Option value="pomodoro">番茄钟</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="default_duration_minutes"
              label="默认时长（分钟）"
              tooltip="新建计时器时的默认时长"
            >
              <InputNumber min={5} max={480} placeholder="25" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="行为设置" >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item
            name="auto_start_on_create"
            label="创建后自动开始"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="auto_stop_others_default"
            label="启动新计时器时自动停止其他计时器（默认）"
            tooltip="关闭后默认并行计时；可在开始按钮下拉菜单或快速开始中临时覆盖"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="auto_pause_on_idle"
            label="空闲时自动暂停"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>
      </Card>

      <Card title="空闲检测" >
        <Form.Item
          name="idle_detection_minutes"
          label="空闲检测时间（分钟）"
          tooltip="超过此时间无活动时视为空闲"
        >
          <Slider
            min={1}
            max={30}
            marks={{
              1: '1分',
              5: '5分',
              10: '10分',
              15: '15分',
              30: '30分'
            }}
          />
        </Form.Item>
      </Card>
    </Space>
  );

  // 通知设置标签页
  const renderNotificationSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="通知开关" >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item
            name="notification_enabled"
            label="启用通知"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="sound_enabled"
            label="启用提示音"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="break_reminders"
            label="休息提醒"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="daily_goal_reminders"
            label="每日目标提醒"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>
      </Card>

      <Card title="提示音设置" >
        <Form.Item
          name="notification_sound"
          label="通知提示音"
        >
          <Radio.Group>
            <Radio value="default">默认</Radio>
            <Radio value="gentle">轻柔</Radio>
            <Radio value="classic">经典</Radio>
            <Radio value="modern">现代</Radio>
            <Radio value="none">静音</Radio>
          </Radio.Group>
        </Form.Item>
      </Card>
    </Space>
  );

  // 番茄钟设置标签页
  const renderPomodoroSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="番茄钟时长设置" >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Form.Item
              name="pomodoro_work_minutes"
              label="工作时长（分钟）"
            >
              <InputNumber min={15} max={60} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="pomodoro_short_break"
              label="短休息（分钟）"
            >
              <InputNumber min={3} max={15} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="pomodoro_long_break"
              label="长休息（分钟）"
            >
              <InputNumber min={10} max={30} />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item
          name="pomodoro_cycles_before_long_break"
          label="长休息前的循环次数"
        >
          <Slider
            min={2}
            max={8}
            marks={{
              2: '2次',
              4: '4次',
              6: '6次',
              8: '8次'
            }}
          />
        </Form.Item>
      </Card>

      <Card title="自动化设置" >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item
            name="auto_start_breaks"
            label="自动开始休息"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="auto_start_next_session"
            label="自动开始下一番茄钟"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>
      </Card>
    </Space>
  );

  // 智能功能设置标签页
  const renderAISettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="智能推断" >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item
            name="enable_auto_inference"
            label="启用智能推断"
            tooltip="自动推断任务类型和分类"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="inference_confidence_threshold"
            label="推断置信度阈值"
            tooltip="低于此阈值的推断将不会自动应用"
          >
            <Slider
              min={0.5}
              max={0.95}
              step={0.05}
              marks={{
                0.5: '50%',
                0.7: '70%',
                0.85: '85%',
                0.95: '95%'
              }}
              tipFormatter={(value) => `${Math.round((value || 0) * 100)}%`}
            />
          </Form.Item>
        </Space>
      </Card>

      <Card title="智能建议" >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item
            name="enable_smart_suggestions"
            label="启用智能建议"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="enable_context_learning"
            label="上下文学习"
            tooltip="学习您的工作模式以提供更准确的建议"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="auto_categorize"
            label="自动分类"
            tooltip="根据任务标题自动分类"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>
      </Card>
    </Space>
  );

  // 界面设置标签页
  const renderUISettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="显示设置" >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item
              name="preferred_timer_view"
              label="首选计时器视图"
            >
              <Select>
                <Option value="compact">紧凑</Option>
                <Option value="normal">普通</Option>
                <Option value="expanded">展开</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="theme_mode"
              label="主题模式"
            >
              <Select>
                <Option value="light">浅色</Option>
                <Option value="dark">深色</Option>
                <Option value="auto">自动</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item
            name="show_progress_bar"
            label="显示进度条"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="show_estimated_time"
            label="显示预估时间"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="show_suggestions_panel"
            label="显示建议面板"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="keyboard_shortcuts_enabled"
            label="启用键盘快捷键"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>
      </Card>
    </Space>
  );

  // 数据和隐私设置标签页
  const renderDataPrivacySettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="数据收集" >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item
            name="data_collection_enabled"
            label="启用数据收集"
            tooltip="收集使用数据以改进产品体验"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="anonymous_analytics"
            label="匿名分析数据"
            tooltip="收集匿名化的使用统计数据"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>
      </Card>

      <Card title="数据导出和备份" >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item
              name="export_data_format"
              label="导出格式"
            >
              <Select>
                <Option value="json">JSON</Option>
                <Option value="csv">CSV</Option>
                <Option value="excel">Excel</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="backup_frequency"
              label="备份频率"
            >
              <Select>
                <Option value="never">从不</Option>
                <Option value="daily">每日</Option>
                <Option value="weekly">每周</Option>
                <Option value="monthly">每月</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Space>
  );

  // 高级设置标签页
  const renderAdvancedSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Alert
        message="高级设置"
        description="这些设置面向高级用户，请谨慎修改"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Card title="实验性功能" >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item
            name="experimental_features"
            label="启用实验性功能"
            tooltip="启用正在开发中的新功能"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="debug_mode"
            label="调试模式"
            tooltip="启用调试信息和日志"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>
      </Card>
    </Space>
  );

  const renderContent = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      onValuesChange={handleFormChange}
      initialValues={preferences || {}}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
        style={{ minHeight: 500 }}
        items={[
          {
            key: 'basic',
            label: (<span><SettingOutlined />基础设置</span>),
            children: renderBasicSettings(),
          },
          {
            key: 'notifications',
            label: (<span><BellOutlined />通知设置</span>),
            children: renderNotificationSettings(),
          },
          {
            key: 'pomodoro',
            label: (<span><ClockCircleOutlined />番茄钟</span>),
            children: renderPomodoroSettings(),
          },
          {
            key: 'ai',
            label: (
              <span>
                <BulbOutlined />
                智能功能
                <Badge count="AI"  color="#52c41a" style={{ marginLeft: 4 }} />
              </span>
            ),
            children: renderAISettings(),
          },
          {
            key: 'ui',
            label: (<span><GlobalOutlined />界面设置</span>),
            children: renderUISettings(),
          },
          {
            key: 'privacy',
            label: (<span><SecurityScanOutlined />数据隐私</span>),
            children: renderDataPrivacySettings(),
          },
          {
            key: 'advanced',
            label: (<span><ExperimentOutlined />高级设置</span>),
            children: renderAdvancedSettings(),
          }
        ]}
      />

      <Divider />
      
      <Row justify="space-between" align="middle">
        <Col>
          <Space>
            <Button 
              icon={<ImportOutlined />} 
              onClick={importSettings}
            >
              导入设置
            </Button>
            <Button 
              icon={<ExportOutlined />} 
              onClick={exportSettings}
              disabled={!preferences}
            >
              导出设置
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => setShowResetConfirm(true)}
            >
              重置默认
            </Button>
          </Space>
        </Col>
        
        <Col>
          <Space>
            {!embedded && onClose && (
              <Button onClick={onClose}>
                取消
              </Button>
            )}
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={saving}
              disabled={!hasChanges}
            >
              保存设置
            </Button>
          </Space>
        </Col>
      </Row>
    </Form>
  );

  if (embedded) {
    return (
      <div style={{ padding: 16 }}>
        {loading ? (
          <Card loading={true} title="加载设置中..." />
        ) : (
          renderContent()
        )}
        
        {/* 重置确认对话框 */}
        <Modal
          title="重置为默认设置"
          open={showResetConfirm}
          onOk={resetToDefaults}
          onCancel={() => setShowResetConfirm(false)}
          okText="确认重置"
          cancelText="取消"
        >
          <Paragraph>
            确定要将所有设置重置为默认值吗？此操作不可撤销。
          </Paragraph>
        </Modal>
      </div>
    );
  }

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          用户偏好设置
          {hasChanges && <Badge status="processing" text="有未保存的更改" />}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      destroyOnHidden
    >
      {loading ? (
        <Card loading={true} title="加载设置中..." />
      ) : (
        renderContent()
      )}
      
      {/* 重置确认对话框 */}
      <Modal
        title="重置为默认设置"
        open={showResetConfirm}
        onOk={resetToDefaults}
        onCancel={() => setShowResetConfirm(false)}
        okText="确认重置"
        cancelText="取消"
      >
        <Paragraph>
          确定要将所有设置重置为默认值吗？此操作不可撤销。
        </Paragraph>
      </Modal>
    </Modal>
  );
};

export default UserTimerPreferences;