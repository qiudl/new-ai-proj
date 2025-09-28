import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, message, Button, Space, Tooltip, Modal, Form, Select, Alert, Input } from 'antd';
import {
  PlusOutlined,
  LinkOutlined,
  DisconnectOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import * as d3 from 'd3';
import {
  DependencyGraph,
  DependencyGraphNode,
  DependencyGraphEdge,
  DependencyType,
  DependencyStrength,
  CreateDependencyRequest
} from '../../types/dependency';
import { Task } from '../../types/task';
import DependencyService from '../../services/dependencyService';
import './DependencyGraphVisualization.css';

const { Option } = Select;

interface DragDropDependencyCreatorProps {
  project: { id: number; name?: string };
  tasks: Task[];
  dependencyGraph: DependencyGraph;
  onDependencyCreated?: (dependency: CreateDependencyRequest) => void;
  onGraphUpdate?: () => void;
}

interface DragState {
  isDragging: boolean;
  sourceNode: DependencyGraphNode | null;
  targetNode: DependencyGraphNode | null;
  dragLine: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null;
}

interface CreateDependencyModalData {
  visible: boolean;
  sourceTask: Task | null;
  targetTask: Task | null;
  suggestedType: DependencyType;
}

const DragDropDependencyCreator: React.FC<DragDropDependencyCreatorProps> = ({
  project,
  tasks,
  dependencyGraph,
  onDependencyCreated,
  onGraphUpdate
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 状态管理
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sourceNode: null,
    targetNode: null,
    dragLine: null
  });
  
  const [createModal, setCreateModal] = useState<CreateDependencyModalData>({
    visible: false,
    sourceTask: null,
    targetTask: null,
    suggestedType: DependencyType.FINISH_TO_START
  });
  
  const [form] = Form.useForm();
  const [dragMode, setDragMode] = useState<boolean>(false);

  // 任务映射
  const taskMap = React.useMemo(() => {
    return tasks.reduce((map, task) => {
      map[task.id] = task;
      return map;
    }, {} as Record<number, Task>);
  }, [tasks]);

  // 获取节点位置
  const getNodePosition = useCallback((node: DependencyGraphNode) => {
    const svg = d3.select(svgRef.current);
    const nodeElement = svg.select(`[data-node-id="${node.taskId}"]`).node() as SVGGElement;
    if (nodeElement) {
      const transform = d3.select(nodeElement).attr('transform');
      const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
      if (match) {
        return {
          x: parseFloat(match[1]),
          y: parseFloat(match[2])
        };
      }
    }
    return { x: node.x || 0, y: node.y || 0 };
  }, []);

  // 智能推荐依赖类型
  const suggestDependencyType = useCallback((sourceTask: Task, targetTask: Task): DependencyType => {
    // 基于任务状态和时间的智能推荐
    if (sourceTask.status === 'completed' && targetTask.status === 'todo') {
      return DependencyType.FINISH_TO_START;
    }
    
    const sourceStartRaw = (sourceTask as any).start_date || sourceTask.due_date || sourceTask.created_at;
    const targetStartRaw = (targetTask as any).start_date || targetTask.due_date || targetTask.created_at;
    if (sourceStartRaw && targetStartRaw) {
      const sourceStart = new Date(sourceStartRaw);
      const targetStart = new Date(targetStartRaw);
      
      // 如果两个任务开始时间相近，建议同时开始
      if (Math.abs(sourceStart.getTime() - targetStart.getTime()) < 24 * 60 * 60 * 1000) {
        return DependencyType.START_TO_START;
      }
    }
    
    return DependencyType.FINISH_TO_START;
  }, []);

  // 检查是否可以创建依赖关系
  const canCreateDependency = useCallback((sourceId: number, targetId: number): {
    canCreate: boolean;
    reason?: string;
  } => {
    if (sourceId === targetId) {
      return { canCreate: false, reason: '不能创建自依赖关系' };
    }

    // 检查是否已存在相同的依赖关系
    const existingDependency = dependencyGraph.edges.find(
      edge => edge.source === sourceId && edge.target === targetId
    );
    
    if (existingDependency) {
      return { canCreate: false, reason: '依赖关系已存在' };
    }

    // 检查是否会造成循环依赖（简单检查）
    const wouldCreateCycle = dependencyGraph.edges.some(
      edge => edge.source === targetId && edge.target === sourceId
    );
    
    if (wouldCreateCycle) {
      return { canCreate: false, reason: '会造成循环依赖' };
    }

    return { canCreate: true };
  }, [dependencyGraph]);

  // 开始拖拽
  const handleDragStart = useCallback((event: MouseEvent, node: DependencyGraphNode) => {
    if (!dragMode) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const position = getNodePosition(node);
    
    setDragState({
      isDragging: true,
      sourceNode: node,
      targetNode: null,
      dragLine: {
        x1: position.x,
        y1: position.y,
        x2: position.x,
        y2: position.y
      }
    });

    // 添加视觉反馈
    const svg = d3.select(svgRef.current);
    svg.select(`[data-node-id="${node.taskId}"]`)
      .classed('drag-source', true);
  }, [dragMode, getNodePosition]);

  // 拖拽移动
  const handleDragMove = useCallback((event: MouseEvent) => {
    if (!dragState.isDragging || !dragState.sourceNode) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setDragState(prev => ({
      ...prev,
      dragLine: prev.dragLine ? {
        ...prev.dragLine,
        x2: x,
        y2: y
      } : null
    }));

    // 检查是否悬停在目标节点上
    const targetNode = dependencyGraph.nodes.find(node => {
      const position = getNodePosition(node);
      const distance = Math.sqrt(
        Math.pow(x - position.x, 2) + Math.pow(y - position.y, 2)
      );
      return distance < 50 && node.taskId !== dragState.sourceNode!.taskId;
    });

    if (targetNode) {
      // 高亮目标节点
      const svg = d3.select(svgRef.current);
      svg.selectAll('.drag-target').classed('drag-target', false);
      svg.select(`[data-node-id="${targetNode.taskId}"]`)
        .classed('drag-target', true);
        
      setDragState(prev => ({ ...prev, targetNode }));
    } else {
      const svg = d3.select(svgRef.current);
      svg.selectAll('.drag-target').classed('drag-target', false);
      setDragState(prev => ({ ...prev, targetNode: null }));
    }
  }, [dragState.isDragging, dragState.sourceNode, dependencyGraph.nodes, getNodePosition]);

  // 结束拖拽
  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging || !dragState.sourceNode) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.drag-source, .drag-target').classed('drag-source drag-target', false);

    if (dragState.targetNode) {
      const sourceTask = taskMap[dragState.sourceNode.taskId];
      const targetTask = taskMap[dragState.targetNode.taskId];

      if (sourceTask && targetTask) {
        const { canCreate, reason } = canCreateDependency(sourceTask.id, targetTask.id);
        
        if (canCreate) {
          const suggestedType = suggestDependencyType(sourceTask, targetTask);
          
          setCreateModal({
            visible: true,
            sourceTask,
            targetTask,
            suggestedType
          });

          form.setFieldsValue({
            type: suggestedType,
            strength: DependencyStrength.MANDATORY,
            lag_days: 0
          });
        } else {
          message.warning(reason || '无法创建依赖关系');
        }
      }
    }

    setDragState({
      isDragging: false,
      sourceNode: null,
      targetNode: null,
      dragLine: null
    });
  }, [dragState, taskMap, canCreateDependency, suggestDependencyType, form]);

  // 绑定全局鼠标事件
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => handleDragMove(event);
    const handleMouseUp = () => handleDragEnd();

    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  // 绑定节点拖拽事件
  useEffect(() => {
    if (!svgRef.current || !dependencyGraph) return;

    const svg = d3.select(svgRef.current);
    
    // 为每个节点绑定拖拽事件
    svg.selectAll('.dependency-node')
      .on('mousedown', function(event: any, d: any) {
        if (dragMode) {
          handleDragStart(event as MouseEvent, d as DependencyGraphNode);
        }
      });

  }, [dependencyGraph, dragMode, handleDragStart]);

  // 创建依赖关系
  const handleCreateDependency = async (values: any) => {
    if (!createModal.sourceTask || !createModal.targetTask) return;

    try {
      const dependencyData: CreateDependencyRequest = {
        predecessor_id: createModal.sourceTask.id,
        successor_id: createModal.targetTask.id,
        type: values.type,
        strength: values.strength,
        lag_days: values.lag_days || 0,
        description: values.description || ''
      };

      await DependencyService.createDependency(project.id, dependencyData);
      
      message.success('依赖关系创建成功');
      setCreateModal({
        visible: false,
        sourceTask: null,
        targetTask: null,
        suggestedType: DependencyType.FINISH_TO_START
      });
      
      onDependencyCreated?.(dependencyData);
      onGraphUpdate?.();
      
    } catch (error) {
      message.error('创建依赖关系失败');
      console.error('创建依赖关系失败:', error);
    }
  };

  // 取消创建
  const handleCancelCreate = () => {
    setCreateModal({
      visible: false,
      sourceTask: null,
      targetTask: null,
      suggestedType: DependencyType.FINISH_TO_START
    });
    form.resetFields();
  };

  return (
    <div>
      {/* 控制面板 */}
      <Card  style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type={dragMode ? 'primary' : 'default'}
            icon={<LinkOutlined />}
            onClick={() => setDragMode(!dragMode)}
          >
            {dragMode ? '退出拖拽模式' : '进入拖拽模式'}
          </Button>
          
          {dragMode && (
            <Alert
              message="拖拽模式已开启"
              description="从源任务拖拽到目标任务可创建依赖关系"
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginLeft: 16 }}
            />
          )}
        </Space>
      </Card>

      {/* SVG 覆盖层用于绘制拖拽线 */}
      {dragState.isDragging && dragState.dragLine && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <svg style={{ width: '100%', height: '100%' }}>
            <defs>
              <marker
                id="drag-arrowhead"
                viewBox="-0 -5 10 10"
                refX="8"
                refY="0"
                orient="auto"
                markerWidth="8"
                markerHeight="8"
              >
                <path
                  d="M 0,-5 L 10 ,0 L 0,5"
                  fill="#1890ff"
                  stroke="none"
                />
              </marker>
            </defs>
            <line
              x1={dragState.dragLine.x1}
              y1={dragState.dragLine.y1}
              x2={dragState.dragLine.x2}
              y2={dragState.dragLine.y2}
              stroke="#1890ff"
              strokeWidth="3"
              strokeDasharray="5,5"
              markerEnd="url(#drag-arrowhead)"
            />
          </svg>
        </div>
      )}

      {/* 创建依赖关系模态框 */}
      <Modal
        title="创建任务依赖关系"
        open={createModal.visible}
        onCancel={handleCancelCreate}
        footer={null}
        width={600}
      >
        {createModal.sourceTask && createModal.targetTask && (
          <div style={{ marginBottom: 24 }}>
            <Alert
              message="依赖关系预览"
              description={
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>前置任务:</strong> {createModal.sourceTask.title}
                  </div>
                  <div>
                    <strong>后续任务:</strong> {createModal.targetTask.title}
                  </div>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateDependency}
          autoComplete="off"
        >
          <Form.Item
            name="type"
            label="依赖类型"
            rules={[{ required: true, message: '请选择依赖类型' }]}
          >
            <Select placeholder="选择依赖类型">
              <Option value={DependencyType.FINISH_TO_START}>
                完成-开始 (FS) - 前置任务完成后才能开始后续任务
              </Option>
              <Option value={DependencyType.START_TO_START}>
                开始-开始 (SS) - 两个任务同时开始
              </Option>
              <Option value={DependencyType.FINISH_TO_FINISH}>
                完成-完成 (FF) - 两个任务同时完成
              </Option>
              <Option value={DependencyType.START_TO_FINISH}>
                开始-完成 (SF) - 前置任务开始后才能完成后续任务
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="strength"
            label="依赖强度"
            initialValue={DependencyStrength.MANDATORY}
          >
            <Select>
              <Option value={DependencyStrength.MANDATORY}>
                强制 - 必须遵守的依赖关系
              </Option>
              <Option value={DependencyStrength.PREFERRED}>
                首选 - 建议遵守的依赖关系
              </Option>
              <Option value={DependencyStrength.OPTIONAL}>
                可选 - 灵活的依赖关系
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="lag_days"
            label="滞后时间（天）"
            tooltip="正数表示延迟，负数表示提前"
          >
            <Select placeholder="选择滞后时间" allowClear>
              <Option value={-5}>提前5天</Option>
              <Option value={-3}>提前3天</Option>
              <Option value={-1}>提前1天</Option>
              <Option value={0}>无滞后</Option>
              <Option value={1}>延迟1天</Option>
              <Option value={3}>延迟3天</Option>
              <Option value={5}>延迟5天</Option>
              <Option value={7}>延迟1周</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              placeholder="输入依赖关系的描述（可选）"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCancelCreate}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建依赖关系
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <style>{`
        .drag-source {
          filter: drop-shadow(0 4px 12px rgba(24, 144, 255, 0.4));
          stroke: #1890ff !important;
          stroke-width: 3 !important;
        }
        
        .drag-target {
          filter: drop-shadow(0 4px 12px rgba(82, 196, 26, 0.4));
          stroke: #52c41a !important;
          stroke-width: 3 !important;
          animation: targetPulse 1s ease-in-out infinite alternate;
        }
        
        @keyframes targetPulse {
          from {
            opacity: 0.8;
          }
          to {
            opacity: 1;
          }
        }
        
        .dependency-node.drag-mode {
          cursor: crosshair;
        }
        
        .dependency-node.drag-mode:hover {
          filter: drop-shadow(0 2px 8px rgba(24, 144, 255, 0.3));
          transform: scale(1.05);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default DragDropDependencyCreator;