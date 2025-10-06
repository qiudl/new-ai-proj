import React from 'react';
import { Steps } from 'antd';
import { RobotOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { GenerationStep } from '../types';

interface StepIndicatorProps {
  current: GenerationStep;
}

/**
 * 步骤指示器组件
 */
const StepIndicator: React.FC<StepIndicatorProps> = ({ current }) => {
  return (
    <Steps
      current={current - 1}
      style={{ marginBottom: 24 }}
      items={[
        {
          title: '选择模型',
          description: '选择AI模型和模板',
          icon: <RobotOutlined />,
        },
        {
          title: '预览文档',
          description: 'AI生成文档内容',
          icon: <EyeOutlined />,
        },
        {
          title: '编辑完善',
          description: '编辑和保存文档',
          icon: <EditOutlined />,
        },
      ]}
    />
  );
};

export default StepIndicator;
