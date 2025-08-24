import React, { useState } from 'react';
import { Card, Progress, Button, Tooltip, Space, Tag, Spin, Alert, Descriptions, Collapse } from 'antd';
import { 
  ReloadOutlined, 
  InfoCircleOutlined, 
  BarChartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  WarningOutlined 
} from '@ant-design/icons';
import { useProgress, useRecomputeProgress, formatProgress, getProgressColor } from '../hooks/useProgress';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const { Panel } = Collapse;

interface TaskProgressDisplayProps {
  taskId: number;
  projectId?: number;
  showBreakdown?: boolean;
  showInputs?: boolean;
  compact?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export const TaskProgressDisplay: React.FC<TaskProgressDisplayProps> = ({
  taskId,
  projectId,
  showBreakdown = true,
  showInputs = false,
  compact = false,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
  className,
}) => {
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Determine what to include in the query
  const include = [
    showBreakdown && 'children',
    showInputs && 'formula',
  ].filter(Boolean).join(',');

  // Fetch progress data
  const { 
    data: progressData, 
    isLoading, 
    error, 
    refetch 
  } = useProgress('task', taskId, {
    include,
    useCache: !manualRefreshing,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Recompute mutation
  const recomputeMutation = useRecomputeProgress();

  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    try {
      await recomputeMutation.mutateAsync({
        entityType: 'task',
        id: taskId,
        recursive: false,
        persistSnapshot: true,
      });
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  if (isLoading && !progressData) {
    return (
      <div className={className} style={{ textAlign: 'center', padding: '20px' }}>
        <Spin tip="加载进度数据..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        className={className}
        message="加载失败"
        description="无法加载进度数据，请稍后重试"
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => refetch()}>
            重试
          </Button>
        }
      />
    );
  }

  if (!progressData) {
    return null;
  }

  const progress = Math.round(progressData.progress);
  const progressColor = getProgressColor(progress);
  const isCompleted = progress >= 100;

  // Compact mode - just the progress bar
  if (compact) {
    return (
      <div className={className}>
        <Tooltip title={`进度: ${progress}% - ${progressData.method_used}`}>
          <Progress 
            percent={progress} 
            strokeColor={progressColor}
            size="small"
            format={() => `${progress}%`}
          />
        </Tooltip>
      </div>
    );
  }

  // Full display mode
  return (
    <Card
      className={className}
      title={
        <Space>
          <BarChartOutlined />
          <span>任务进度</span>
          {autoRefresh && (
            <Tag icon={<SyncOutlined spin />} color="processing">
              自动刷新
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="手动刷新">
            <Button
              type="text"
              icon={<ReloadOutlined spin={manualRefreshing} />}
              onClick={handleManualRefresh}
              loading={manualRefreshing}
            />
          </Tooltip>
        </Space>
      }
    >
      {/* Main Progress */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <span style={{ fontWeight: 500, fontSize: 16 }}>完成进度</span>
            {isCompleted && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          </Space>
          <span style={{ fontSize: 20, fontWeight: 'bold', color: progressColor }}>
            {progress}%
          </span>
        </div>
        
        <Progress
          percent={progress}
          strokeColor={progressColor}
          strokeWidth={12}
          showInfo={false}
        />

        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <Space size="small">
            <Tag>{progressData.method_used}</Tag>
            <Tooltip title="最后更新时间">
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                <ClockCircleOutlined /> {formatDistanceToNow(new Date(progressData.updated_at), { addSuffix: true, locale: zhCN })}
              </span>
            </Tooltip>
          </Space>
        </div>
      </div>

      {/* Breakdown Section */}
      {showBreakdown && progressData.breakdown && progressData.breakdown.length > 0 && (
        <Collapse ghost defaultActiveKey={['breakdown']}>
          <Panel 
            header={
              <Space>
                <span>子任务进度明细</span>
                <Tag>{progressData.breakdown.length} 项</Tag>
              </Space>
            } 
            key="breakdown"
          >
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {progressData.breakdown.map((item) => {
                const itemProgress = Math.round(item.progress);
                const itemColor = getProgressColor(itemProgress, item.status);
                
                return (
                  <div key={item.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Space>
                        <span style={{ fontWeight: 500 }}>{item.title || `任务 #${item.id}`}</span>
                        <Tag color={item.status === 'completed' ? 'success' : 'default'} style={{ fontSize: 10 }}>
                          {item.status}
                        </Tag>
                      </Space>
                      <Space size="small">
                        <Tooltip title={`权重: ${item.weight}`}>
                          <Tag style={{ fontSize: 10 }}>权重 {item.weight}</Tag>
                        </Tooltip>
                        <span style={{ fontWeight: 500, color: itemColor }}>
                          {itemProgress}%
                        </span>
                      </Space>
                    </div>
                    <Progress
                      percent={itemProgress}
                      strokeColor={itemColor}
                      size="small"
                      showInfo={false}
                    />
                    {item.method && (
                      <div style={{ marginTop: 2 }}>
                        <Tag style={{ fontSize: 10 }}>{item.method}</Tag>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </Collapse>
      )}

      {/* Inputs/Config Section */}
      {showInputs && progressData.inputs && (
        <Collapse ghost>
          <Panel 
            header={
              <Space>
                <InfoCircleOutlined />
                <span>计算参数</span>
              </Space>
            } 
            key="inputs"
          >
            <Descriptions size="small" column={1}>
              {progressData.inputs.weight_by && (
                <Descriptions.Item label="权重字段">
                  {progressData.inputs.weight_by}
                </Descriptions.Item>
              )}
              {progressData.inputs.excluded_status && progressData.inputs.excluded_status.length > 0 && (
                <Descriptions.Item label="排除状态">
                  {progressData.inputs.excluded_status.join(', ')}
                </Descriptions.Item>
              )}
              {progressData.inputs.task_count !== undefined && (
                <Descriptions.Item label="任务数量">
                  {progressData.inputs.task_count}
                </Descriptions.Item>
              )}
              {progressData.config_version && (
                <Descriptions.Item label="配置版本">
                  v{progressData.config_version}
                </Descriptions.Item>
              )}
            </Descriptions>

            {progressData.inputs.status_map && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8, fontSize: 12, color: '#8c8c8c' }}>状态映射：</div>
                <Space wrap>
                  {Object.entries(progressData.inputs.status_map).map(([status, value]) => (
                    <Tag key={status} style={{ fontSize: 11 }}>
                      {status}: {value}%
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </Panel>
        </Collapse>
      )}

      {/* Warning for blocked tasks */}
      {progressData.breakdown?.some(item => item.status === 'blocked') && (
        <Alert
          message="存在被阻塞的子任务"
          description="部分子任务处于阻塞状态，可能影响整体进度"
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};
