// @ts-nocheck
import React, { useState } from 'react';
import { Modal, Steps, Card, Typography} from 'antd';
import {
 
 InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface TimeManagementGuideProps {
  visible: boolean;
  onClose: () => void;
}

const TimeManagementGuide: React.FC<TimeManagementGuideProps> = ({ visible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '时间管理概览',
      icon: <InfoCircleOutlined />,
      content: (
        <Card>
          <Title level={4}>欢迎使用时间管理工作台！</Title>
          <Paragraph>
            这是一个专为提高工作效率设计的时间管理页面，集成了计时器、任务管理和布局自定义功能。
          </Paragraph>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Tag color="blue" icon={<ClockCircleOutlined />}>简化计时器</Tag>
              <span style={{ marginLeft: '8px' }}>专注的任务计时，支持暂停、恢复、完成</span>
            </div>
            <div>
              <Tag color="green" icon={<BranchesOutlined />}>我的任务</Tag>
              <span style={{ marginLeft: '8px' }}>树形结构显示项目和任务层级关系</span>
            </div>
            <div>
              <Tag color="purple" icon={<DragOutlined />}>拖拽布局</Tag>
              <span style={{ marginLeft: '8px' }}>完全自定义的工作台布局</span>
            </div>
          </Space>
        </Card>
      )
    },
    {
      title: '使用计时器',
      icon: <ClockCircleOutlined />,
      content: (
        <Card>
          <Title level={4}>简化的任务计时器</Title>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={5}>🚀 启动计时</Title>
              <Paragraph>
                1. 从"我的任务"树中选择要计时的任务<br/>
                2. 点击任务旁边的 <PlayCircleOutlined style={{ color: '#1890ff' }} /> 按钮<br/>
                3. 或者在其他页面启动计时，这里会自动同步
              </Paragraph>
            </div>
            <div>
              <Title level={5}>⏸️ 暂停/恢复</Title>
              <Paragraph>
                • 点击"暂停"按钮暂停计时<br/>
                • 点击"继续"按钮恢复计时<br/>
                • 支持键盘快捷键：<Tag>Space</Tag> 空格键
              </Paragraph>
            </div>
            <div>
              <Title level={5}>✅ 完成任务</Title>
              <Paragraph>
                • 点击"完成"按钮结束计时<br/>
                • 支持键盘快捷键：<Tag>Enter</Tag> 回车键<br/>
                • 系统会显示总耗时并记录到统计中
              </Paragraph>
            </div>
          </Space>
        </Card>
      )
    },
    {
      title: '我的任务树',
      icon: <BranchesOutlined />,
      content: (
        <Card>
          <Title level={4}>快速访问项目和任务</Title>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={5}>📂 项目层级</Title>
              <Paragraph>
                • 顶级节点显示项目名称和任务数量<br/>
                • 点击"进入项目"按钮快速跳转到项目页面<br/>
                • 展开/收起项目查看下属任务
              </Paragraph>
            </div>
            <div>
              <Title level={5}>📝 任务管理</Title>
              <Paragraph>
                • 支持多层任务嵌套（父任务-子任务）<br/>
                • 不同状态任务有不同的徽章标识<br/>
                • 点击任务名称跳转到任务详情
              </Paragraph>
            </div>
            <div>
              <Title level={5}>⚡ 快速操作</Title>
              <Paragraph>
                • <PlayCircleOutlined style={{ color: '#1890ff' }} /> 为"进行中"的任务快速启动计时<br/>
                • <ClockCircleOutlined style={{ color: '#52c41a' }} /> 正在计时的任务会显示"计时中"状态<br/>
                • 点击右上角刷新按钮更新任务状态
              </Paragraph>
            </div>
          </Space>
        </Card>
      )
    },
    {
      title: '自定义布局',
      icon: <DragOutlined />,
      content: (
        <Card>
          <Title level={4}>打造个性化工作台</Title>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={5}>🎛️ 开启拖拽模式</Title>
              <Paragraph>
                1. 点击右上角的拖拽模式开关<br/>
                2. 看到组件右上角出现 <span style={{ fontFamily: 'monospace', background: '#f0f0f0', padding: '2px 4px' }}>⋮⋮</span> 拖拽手柄<br/>
                3. 现在可以自由拖拽和调整组件了
              </Paragraph>
            </div>
            <div>
              <Title level={5}>📏 调整组件</Title>
              <Paragraph>
                • 拖拽组件到任意位置<br/>
                • 使用组件设置面板精确调整宽度和高度<br/>
                • 设置最小/最大尺寸限制<br/>
                • 启用/禁用自动高度
              </Paragraph>
            </div>
            <div>
              <Title level={5}>💾 保存设置</Title>
              <Paragraph>
                • 布局会自动保存到浏览器本地<br/>
                • 刷新页面后布局保持不变<br/>
                • 点击"重置布局"恢复默认设置<br/>
                • 完成后关闭拖拽模式即可正常使用
              </Paragraph>
            </div>
          </Space>
        </Card>
      )
    },
    {
      title: '高效工作技巧',
      icon: <QuestionCircleOutlined />,
      content: (
        <Card>
          <Title level={4}>提升工作效率的建议</Title>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={5}>💡 推荐工作流</Title>
              <Paragraph>
                1. 打开时间管理页面作为工作主界面<br/>
                2. 从"我的任务"树选择今日要完成的任务<br/>
                3. 使用简化计时器专注工作，适时暂停休息<br/>
                4. 查看统计数据了解工作效率
              </Paragraph>
            </div>
            <div>
              <Title level={5}>⌨️ 键盘快捷键</Title>
              <Paragraph>
                • <Tag>Space</Tag> 暂停/恢复计时器<br/>
                • <Tag>Enter</Tag> 完成当前任务<br/>
                • 鼠标悬停在计时器上可看到快捷键提示
              </Paragraph>
            </div>
            <div>
              <Title level={5}>📱 响应式设计</Title>
              <Paragraph>
                • 支持桌面端、平板和手机访问<br/>
                • 小屏幕下自动垂直堆叠布局<br/>
                • 计时器在移动设备上依然突出显示
              </Paragraph>
            </div>
            <div>
              <Title level={5}>🔄 实时同步</Title>
              <Paragraph>
                • 多个浏览器标签页间计时器状态实时同步<br/>
                • 在项目页面启动的计时器会在时间管理页面显示<br/>
                • 跨页面操作无缝衔接
              </Paragraph>
            </div>
          </Space>
        </Card>
      )
    }
  ];

  return (
    <Modal
      title="时间管理使用指南"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={
        <Space>
          <Button 
            disabled={currentStep === 0} 
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            上一步
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button 
              type="primary" 
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              下一步
            </Button>
          ) : (
            <Button type="primary" onClick={onClose}>
              开始使用
            </Button>
          )}
        </Space>
      }
    >
      <Steps current={currentStep} style={{ marginBottom: '24px' }}>
        {steps.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            icon={step.icon}
            onClick={() => setCurrentStep(index)}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </Steps>
      
      {steps[currentStep].content}
    </Modal>
  );
};

export default TimeManagementGuide;