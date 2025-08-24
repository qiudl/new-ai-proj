import React from 'react';
import { Progress, Tooltip, Space, Tag } from 'antd';
import { useProgress, getProgressColor } from '../hooks/useProgress';
import { LoadingOutlined } from '@ant-design/icons';

interface MiniProgressBarProps {
  taskId: number;
  showPercentage?: boolean;
  showStatus?: boolean;
  width?: number | string;
  height?: number;
  className?: string;
}

/**
 * Compact progress bar for inline display in task lists
 */
export const MiniProgressBar: React.FC<MiniProgressBarProps> = ({
  taskId,
  showPercentage = true,
  showStatus = false,
  width = 100,
  height = 6,
  className,
}) => {
  const { data: progressData, isLoading } = useProgress('task', taskId, {
    useCache: true,
  });

  if (isLoading) {
    return (
      <div className={className} style={{ width, display: 'inline-flex', alignItems: 'center' }}>
        <LoadingOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
      </div>
    );
  }

  if (!progressData) {
    return null;
  }

  const progress = Math.round(progressData.progress);
  const progressColor = getProgressColor(progress);

  const progressBar = (
    <div 
      style={{ 
        width,
        height,
        background: '#f0f0f0',
        borderRadius: height / 2,
        overflow: 'hidden',
        display: 'inline-block',
        verticalAlign: 'middle'
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: progressColor,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );

  const content = (
    <Space size={4} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <Tooltip 
        title={
          <div>
            <div>进度: {progress}%</div>
            <div>方式: {progressData.method_used}</div>
            {progressData.breakdown && progressData.breakdown.length > 0 && (
              <div>包含 {progressData.breakdown.length} 个子项</div>
            )}
          </div>
        }
      >
        {progressBar}
      </Tooltip>
      
      {showPercentage && (
        <span style={{ fontSize: 12, color: '#595959', minWidth: 30 }}>
          {progress}%
        </span>
      )}
      
      {showStatus && progressData.method_used && (
        <Tag style={{ fontSize: 10, margin: 0 }}>
          {progressData.method_used}
        </Tag>
      )}
    </Space>
  );

  return <div className={className}>{content}</div>;
};

/**
 * Simple static progress bar without API call
 */
export const StaticMiniProgressBar: React.FC<{
  progress: number;
  showPercentage?: boolean;
  width?: number | string;
  height?: number;
  color?: string;
  className?: string;
}> = ({
  progress,
  showPercentage = true,
  width = 100,
  height = 6,
  color,
  className,
}) => {
  const displayProgress = Math.round(Math.max(0, Math.min(100, progress)));
  const progressColor = color || getProgressColor(displayProgress);

  return (
    <Space size={4} className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <div 
        style={{ 
          width,
          height,
          background: '#f0f0f0',
          borderRadius: height / 2,
          overflow: 'hidden',
          display: 'inline-block',
        }}
      >
        <div
          style={{
            width: `${displayProgress}%`,
            height: '100%',
            background: progressColor,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      
      {showPercentage && (
        <span style={{ fontSize: 12, color: '#595959', minWidth: 30 }}>
          {displayProgress}%
        </span>
      )}
    </Space>
  );
};
