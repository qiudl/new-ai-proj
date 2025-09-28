import React from 'react';
import { Card, Typography } from 'antd';
import { GeneratedSubTask } from '../types/aiTaskGenerator';

const { Title } = Typography;

interface AIGenerationHistoryProps {
  showDetailedView?: boolean;
  projectId?: number;
  onReuse?: (history: unknown, tasks: GeneratedSubTask[]) => Promise<void>;
  onSaveAsTemplate?: (history: unknown, templateName: string) => void;
}

/**
 * AI生成历史组件
 * 临时占位符组件
 */
const AIGenerationHistory: React.FC<AIGenerationHistoryProps> = ({ 
  showDetailedView = false, 
  projectId, 
  onReuse, 
  onSaveAsTemplate 
}) => {
  return (
    <Card>
      <Title level={4}>AI生成历史</Title>
      <p>此组件正在开发中...</p>
      {showDetailedView && <p>详细视图模式</p>}
    </Card>
  );
};

export default AIGenerationHistory;
