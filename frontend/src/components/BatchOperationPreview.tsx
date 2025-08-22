/**
 * BatchOperationPreview - 批量操作预览组件
 * 
 * 用于显示批量更改父任务操作的预览信息，包括：
 * - 受影响的任务列表
 * - 目标父任务信息
 * - 层级结构变化预览
 * - 操作风险警告
 */

import React from 'react';
import {
  Alert,
  Tree,
  Typography,
  Space,
  Tag,
  Divider,
  Card,
  List,
  Badge,
  Tooltip,
  Spin,
  Result,
  Button
} from 'antd';
import {
  InfoCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  NodeIndexOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';

const { Title, Text, Paragraph } = Typography;

interface BatchOperationPreviewProps {
  selectedTasks: Task[];
  targetParent: Task | null;
  operation: 'changeParent';
  warnings?: string[];
  validationResult?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    apiResult?: any; // 保留完整的API响应用于更详细的展示
  };
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const BatchOperationPreview: React.FC<BatchOperationPreviewProps> = ({
  selectedTasks,
  targetParent,
  operation,
  warnings = [],
  validationResult,
  loading,
  error,
  onRetry
}) => {
  // Handle loading state
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>正在验证批量操作...</Text>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Result
        status="error"
        title="验证失败"
        subTitle={error}
        extra={
          onRetry && (
            <Button type="primary" onClick={onRetry}>
              重试
            </Button>
          )
        }
      />
    );
  }
  // 计算操作统计信息
  const operationStats = {
    totalTasks: selectedTasks.length,
    rootTasks: selectedTasks.filter(task => !task.parent_id).length,
    childTasks: selectedTasks.filter(task => task.parent_id).length,
    estimatedTime: Math.ceil(selectedTasks.length * 0.1) // 预估每个任务0.1秒
  };

  // 风险警告组件
  const RiskWarnings: React.FC<{ warnings: string[] }> = ({ warnings }) => {
    if (warnings.length === 0) return null;

    return (
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="操作风险提示"
        description={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {warnings.map((warning, index) => (
              <li key={index} style={{ marginBottom: 4 }}>
                {warning}
              </li>
            ))}
          </ul>
        }
        style={{ marginBottom: 16 }}
      />
    );
  };

  // 验证错误组件
  const ValidationErrors: React.FC<{ errors: string[] }> = ({ errors }) => {
    if (errors.length === 0) return null;

    return (
      <Alert
        type="error"
        showIcon
        icon={<ExclamationCircleOutlined />}
        message="验证失败"
        description={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {errors.map((error, index) => (
              <li key={index} style={{ marginBottom: 4 }}>
                {error}
              </li>
            ))}
          </ul>
        }
        style={{ marginBottom: 16 }}
      />
    );
  };

  // 构建层级结构预览数据
  const buildHierarchyPreview = () => {
    const treeData: any[] = [];
    
    if (targetParent) {
      // 显示目标父任务
      const parentNode = {
        title: (
          <Space>
            <NodeIndexOutlined />
            <Text strong>{targetParent.title}</Text>
            <Tag color="blue">父任务</Tag>
          </Space>
        ),
        key: `parent-${targetParent.id}`,
        children: selectedTasks.map(task => ({
          title: (
            <Space>
              <BranchesOutlined />
              <Text>{task.title}</Text>
              <Tag color="green">将移动至此</Tag>
              {task.parent_id && (
                <Tag color="orange">原有子任务</Tag>
              )}
            </Space>
          ),
          key: `task-${task.id}`
        }))
      };
      treeData.push(parentNode);
    } else {
      // 设置为根任务
      const rootNode = {
        title: (
          <Space>
            <NodeIndexOutlined />
            <Text strong>根级任务</Text>
            <Tag color="purple">顶级</Tag>
          </Space>
        ),
        key: 'root',
        children: selectedTasks.map(task => ({
          title: (
            <Space>
              <BranchesOutlined />
              <Text>{task.title}</Text>
              <Tag color="green">将设为根任务</Tag>
            </Space>
          ),
          key: `task-${task.id}`
        }))
      };
      treeData.push(rootNode);
    }

    return treeData;
  };

  return (
    <div>
      {/* 验证错误 */}
      {validationResult?.errors && validationResult.errors.length > 0 && (
        <ValidationErrors errors={validationResult.errors} />
      )}

      {/* 风险警告 */}
      <RiskWarnings warnings={[...warnings, ...(validationResult?.warnings || [])]} />

      {/* 操作概览 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          操作概览
        </Title>
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>操作类型：</Text>
            <Tag color="blue">批量更改父任务</Tag>
          </div>
          
          <div>
            <Text strong>目标父任务：</Text>
            {targetParent ? (
              <Space>
                <Text code>#{targetParent.id}</Text>
                <Text>{targetParent.title}</Text>
                <Tag color="blue">层级 {targetParent.task_level || 0}</Tag>
              </Space>
            ) : (
              <Tag color="purple">设置为根任务</Tag>
            )}
          </div>

          <div>
            <Text strong>受影响任务：</Text>
            <Badge count={operationStats.totalTasks} style={{ marginLeft: 8 }} />
          </div>
        </Space>
      </Card>

      {/* 任务列表 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
          受影响的任务列表
        </Title>
        
        <List
          size="small"
          dataSource={selectedTasks}
          renderItem={(task) => (
            <List.Item>
              <Space>
                <Text code>#{task.id}</Text>
                <Text>{task.title}</Text>
                {task.parent_id && (
                  <Tooltip title={`当前父任务ID: ${task.parent_id}`}>
<Tag color="orange">子任务</Tag>
                  </Tooltip>
                )}
<Tag color={task.status === 'completed' ? 'green' : task.status === 'in_progress' ? 'blue' : 'default'}>
                  {task.status === 'todo' ? '待开始' : 
                   task.status === 'in_progress' ? '进行中' :
                   task.status === 'completed' ? '已完成' : '已取消'}
                </Tag>
              </Space>
            </List.Item>
          )}
          style={{ maxHeight: 200, overflowY: 'auto' }}
        />
      </Card>

      {/* 层级结构预览 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
          操作后层级结构预览
        </Title>
        
        <Tree
          treeData={buildHierarchyPreview()}
          defaultExpandAll
          showLine
          showIcon={false}
          selectable={false}
        />
      </Card>

      {/* 操作统计 */}
      <Card size="small">
        <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
          操作统计信息
        </Title>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div>
            <Text type="secondary">总任务数：</Text>
            <Text strong>{operationStats.totalTasks}</Text>
          </div>
          
          <div>
            <Text type="secondary">预估时间：</Text>
            <Text strong>{operationStats.estimatedTime}秒</Text>
          </div>
          
          <div>
            <Text type="secondary">根任务：</Text>
            <Text strong>{operationStats.rootTasks}</Text>
          </div>
          
          <div>
            <Text type="secondary">子任务：</Text>
            <Text strong>{operationStats.childTasks}</Text>
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />
        
        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            📌 提示：操作将会更新所有选中任务的父子关系，请确认无误后执行。
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default BatchOperationPreview;