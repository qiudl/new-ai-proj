import React, { useState } from 'react';
import { Modal, Button, Steps, Typography, Space, Tag } from 'antd';
import { DatabaseOutlined, SettingOutlined, DownloadOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface AllFieldsTableGuideProps {
  visible: boolean;
  onClose: () => void;
}

const AllFieldsTableGuide: React.FC<AllFieldsTableGuideProps> = ({ visible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '功能概览',
      content: (
        <div>
          <Title level={4}>全字段任务列表功能</Title>
          <Paragraph>
            全字段任务列表是一个强大的任务管理工具，让您可以在一个页面内查看所有任务的完整信息。
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>✅ 显示所有任务字段（固定字段 + 自定义字段）</div>
            <div>✅ 列的显示/隐藏控制</div>
            <div>✅ 高级过滤和搜索功能</div>
            <div>✅ 批量操作支持</div>
            <div>✅ 数据导出功能</div>
            <div>✅ 响应式设计</div>
          </Space>
        </div>
      )
    },
    {
      title: '表格结构',
      content: (
        <div>
          <Title level={4}>表格布局说明</Title>
          <Space direction="vertical" style={{ width: '100%', gap: '16px' }}>
            <div>
              <Tag color="blue">固定列区域（左侧）</Tag>
              <Paragraph style={{ marginTop: '8px' }}>
                包含选择框、任务ID、任务标题、状态等核心字段，始终可见。
              </Paragraph>
            </div>
            <div>
              <Tag color="green">动态列区域（中间）</Tag>
              <Paragraph style={{ marginTop: '8px' }}>
                包含项目、负责人、时间等标准字段，可以控制显示/隐藏。
              </Paragraph>
            </div>
            <div>
              <Tag color="orange">自定义字段区域（右侧）</Tag>
              <Paragraph style={{ marginTop: '8px' }}>
                显示优先级、标签、工时、进度等自定义字段，支持水平滚动。
              </Paragraph>
            </div>
            <div>
              <Tag color="red">操作列（右侧固定）</Tag>
              <Paragraph style={{ marginTop: '8px' }}>
                包含查看、编辑、删除等操作按钮，始终可见。
              </Paragraph>
            </div>
          </Space>
        </div>
      )
    },
    {
      title: '列管理',
      content: (
        <div>
          <Title level={4}>列显示控制</Title>
          <Paragraph>
            点击右上角的 <SettingOutlined /> "列设置" 按钮可以：
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>🔍 查看所有可用的列</div>
            <div>👁️ 控制列的显示和隐藏</div>
            <div>🏷️ 识别自定义字段（带有蓝色标签）</div>
            <div>💾 设置会保存在浏览器中</div>
          </Space>
          <Paragraph style={{ marginTop: '16px' }}>
            <Text strong>提示：</Text> 您可以根据工作需要，只显示关心的字段，提高工作效率。
          </Paragraph>
        </div>
      )
    },
    {
      title: '过滤和搜索',
      content: (
        <div>
          <Title level={4}>强大的过滤功能</Title>
          <Space direction="vertical" style={{ width: '100%', gap: '12px' }}>
            <div>
              <Text strong>🔍 文本搜索：</Text>
              <Text>在任务标题中搜索关键词</Text>
            </div>
            <div>
              <Text strong>📊 状态筛选：</Text>
              <Text>多选任务状态进行过滤</Text>
            </div>
            <div>
              <Text strong>📁 项目筛选：</Text>
              <Text>选择特定项目查看任务</Text>
            </div>
            <div>
              <Text strong>📅 日期范围：</Text>
              <Text>按截止时间范围筛选任务</Text>
            </div>
          </Space>
          <Paragraph style={{ marginTop: '16px' }}>
            设置好筛选条件后，点击"应用筛选"按钮生效。
          </Paragraph>
        </div>
      )
    },
    {
      title: '数据导出',
      content: (
        <div>
          <Title level={4}>导出功能</Title>
          <Paragraph>
            点击右上角的 <DownloadOutlined /> "导出" 按钮可以：
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>📄 导出为CSV格式文件</div>
            <div>📊 包含当前显示的所有列</div>
            <div>🔍 导出当前筛选结果</div>
            <div>📅 文件名包含导出日期</div>
          </Space>
          <Paragraph style={{ marginTop: '16px' }}>
            <Text strong>注意：</Text> 导出的数据会根据您当前的列设置和筛选条件确定。
          </Paragraph>
        </div>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <DatabaseOutlined style={{ color: '#1890ff' }} />
          <span>全字段任务列表使用指南</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep(currentStep - 1)}>
              上一步
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
              下一步
            </Button>
          )}
        </Space>
      }
      width={600}
    >
      <Steps current={currentStep} size="small" style={{ marginBottom: '24px' }}>
        {steps.map((step, index) => (
          <Steps.Step key={index} title={step.title} />
        ))}
      </Steps>
      
      <div style={{ minHeight: '300px' }}>
        {steps[currentStep].content}
      </div>
    </Modal>
  );
};

export default AllFieldsTableGuide;