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
            全字段任务列表是一个强大的任务管理工具，集成了现代化的数据管理功能，让您可以高效地管理和查看所有任务信息。
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>✅ 显示所有任务字段（固定字段 + 自定义字段）</div>
            <div>✅ 列拖拽排序和显示/隐藏控制</div>
            <div>✅ 高级筛选器和搜索功能</div>
            <div>✅ 个人视图配置保存和管理</div>
            <div>✅ Excel/CSV双格式导出</div>
            <div>✅ 自动刷新数据</div>
            <div>✅ 批量操作支持</div>
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
      title: '视图管理',
      content: (
        <div>
          <Title level={4}>个人视图配置</Title>
          <Paragraph>
            视图管理功能让您可以保存和切换不同的表格配置：
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>💾 <Text strong>保存视图：</Text> 保存当前的列设置和筛选条件</div>
            <div>🔄 <Text strong>切换视图：</Text> 快速切换不同的工作场景配置</div>
            <div>⭐ <Text strong>默认视图：</Text> 设置页面加载时的默认配置</div>
            <div>📋 <Text strong>复制视图：</Text> 基于现有视图创建新配置</div>
            <div>🗑️ <Text strong>删除视图：</Text> 移除不需要的视图配置</div>
          </Space>
          <Paragraph style={{ marginTop: '16px' }}>
            <Text strong>使用技巧：</Text> 为不同的工作任务创建专门的视图，如"今日待办"、"项目概览"、"进度跟踪"等。
          </Paragraph>
        </div>
      )
    },
    {
      title: '高级筛选',
      content: (
        <div>
          <Title level={4}>高级筛选器</Title>
          <Paragraph>
            高级筛选器提供强大的数据筛选能力：
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>🔍 <Text strong>多条件筛选：</Text> 同时设置多个筛选条件</div>
            <div>⚙️ <Text strong>逻辑操作符：</Text> 支持"且(AND)"和"或(OR)"逻辑连接</div>
            <div>📝 <Text strong>智能操作符：</Text> 根据字段类型提供合适的比较方式</div>
            <div>📅 <Text strong>日期筛选：</Text> 支持日期范围和时间比较</div>
            <div>🔢 <Text strong>数值筛选：</Text> 支持大于、小于、等于等数值比较</div>
            <div>🏷️ <Text strong>预览功能：</Text> 实时预览筛选条件的可读性描述</div>
          </Space>
          <Paragraph style={{ marginTop: '16px' }}>
            <Text strong>示例：</Text> "状态 等于 进行中 且 优先级 等于 高 且 截止时间 早于 明天"
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
            支持多种格式的数据导出：
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>📗 <Text strong>Excel格式：</Text> 包含样式、多工作表、元数据信息</div>
            <div>📄 <Text strong>CSV格式：</Text> 轻量级格式，适合数据分析</div>
            <div>📊 <Text strong>智能内容：</Text> 状态中文化、日期格式统一</div>
            <div>🔍 <Text strong>筛选结果：</Text> 导出当前筛选和视图的数据</div>
            <div>📅 <Text strong>时间戳：</Text> 文件名自动包含导出时间</div>
          </Space>
          <Paragraph style={{ marginTop: '16px' }}>
            <Text strong>Excel特色：</Text> 包含任务数据工作表和导出信息工作表，方便数据追溯。
          </Paragraph>
        </div>
      )
    },
    {
      title: '实时更新',
      content: (
        <div>
          <Title level={4}>自动刷新数据</Title>
          <Paragraph>
            自动刷新功能确保数据始终保持最新：
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>🔄 <Text strong>定时刷新：</Text> 可配置的自动刷新间隔</div>
            <div>🔔 <Text strong>手动刷新：</Text> 随时手动更新数据</div>
            <div>⚙️ <Text strong>性能控制：</Text> 可调节刷新频率</div>
            <div>🛡️ <Text strong>缓存优化：</Text> 智能缓存减少不必要请求</div>
          </Space>
          <Paragraph style={{ marginTop: '16px' }}>
            <Text strong>刷新模式：</Text> 
            <Space>
              <span>🔄 自动刷新</span>
              <span>✋ 手动刷新</span>
              <span>⏸️ 暂停刷新</span>
            </Space>
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
      destroyOnHidden
    >
      <Steps current={currentStep}  style={{ marginBottom: '24px' }}>
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