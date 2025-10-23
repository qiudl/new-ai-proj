import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Select, Button, Space, Tooltip, Switch, Alert, Spin, message } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  DownloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  DisconnectOutlined,
  DragOutlined
} from '@ant-design/icons';
import * as d3 from 'd3';
import {
  DependencyGraph,
  DependencyGraphNode,
  DependencyGraphEdge,
  DependencyType,
  DependencyStrength,
  DependencyConfig,
  CreateDependencyRequest
} from '../../types/dependency';
import { Task } from '../../types/task';
import DependencyService from '../../services/dependencyService';
import DragDropDependencyCreator from './DragDropDependencyCreator';
import './DependencyGraphVisualization.css';

const { Option } = Select;

interface EnhancedDependencyGraphProps {
  project: { id: number; name?: string };
  tasks: Task[];
  onNodeClick?: (taskId: number) => void;
  onEdgeClick?: (dependencyId: number) => void;
  onDependencyCreated?: (dependency: CreateDependencyRequest) => void;
  config?: Partial<DependencyConfig>;
}

interface GraphConfig {
  width: number;
  height: number;
  zoom: number;
  centerX: number;
  centerY: number;
}

interface InteractionMode {
  mode: 'view' | 'create-dependency' | 'edit';
  description: string;
}

const INTERACTION_MODES: Record<string, InteractionMode> = {
  view: { mode: 'view', description: '查看模式 - 浏览依赖关系图' },
  createDependency: { mode: 'create-dependency', description: '创建依赖 - 拖拽创建任务依赖关系' },
  edit: { mode: 'edit', description: '编辑模式 - 编辑现有依赖关系' }
};

const EnhancedDependencyGraph: React.FC<EnhancedDependencyGraphProps> = ({
  project,
  tasks,
  onNodeClick,
  onEdgeClick,
  onDependencyCreated,
  config = {}
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 状态管理
  const [dependencyGraph, setDependencyGraph] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<number | null>(null);
  const [interactionMode, setInteractionMode] = useState<string>('view');
  
  const [graphConfig, setGraphConfig] = useState<GraphConfig>({
    width: 1000,
    height: 600,
    zoom: 1,
    centerX: 500,
    centerY: 300
  });

  // 可视化配置
  const [visualConfig, setVisualConfig] = useState<DependencyConfig>({
    showDependencyLines: true,
    showCriticalPath: true,
    highlightCriticalTasks: true,
    showFloatTimes: false,
    allowCrossDependencies: true,
    autoScheduleOnChange: false,
    defaultDependencyType: DependencyType.FINISH_TO_START,
    defaultDependencyStrength: DependencyStrength.MANDATORY,
    maxLagDays: 30,
    ...config
  });

  // D3图表相关状态
  const [simulation, setSimulation] = useState<d3.Simulation<DependencyGraphNode, undefined> | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 加载依赖关系图数据
  const loadDependencyGraph = useCallback(async () => {
    if (!project) return;

    setLoading(true);
    setError(null);

    try {
      const raw = await DependencyService.getDependencyGraph(project.id);

      // 规范化服务端返回的数据，确保类型与本地定义一致
      const mapType = (t: any): DependencyType => {
        switch (t) {
          case 'FS':
            return DependencyType.FINISH_TO_START;
          case 'SS':
            return DependencyType.START_TO_START;
          case 'FF':
            return DependencyType.FINISH_TO_FINISH;
          case 'SF':
            return DependencyType.START_TO_FINISH;
          default:
            return t as DependencyType;
        }
      };
      const mapStrength = (s: any): DependencyStrength => {
        switch (s) {
          case 'mandatory':
            return DependencyStrength.MANDATORY;
          case 'preferred':
            return DependencyStrength.PREFERRED;
          case 'optional':
            return DependencyStrength.OPTIONAL;
          default:
            return s as DependencyStrength;
        }
      };

      const graph: DependencyGraph = {
        nodes: (raw?.nodes || []).map((n: any) => ({
          ...n,
          startDate: n.startDate instanceof Date ? n.startDate : new Date(n.startDate),
          endDate: n.endDate instanceof Date ? n.endDate : new Date(n.endDate),
        })),
        edges: (raw?.edges || []).map((e: any) => ({
          ...e,
          type: mapType(e.type),
          strength: mapStrength(e.strength),
        })),
        criticalPath: raw?.criticalPath || [],
        projectDuration: raw?.projectDuration || 0,
      };

      setDependencyGraph(graph);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载依赖关系图失败');
    } finally {
      setLoading(false);
    }
  }, [project]);

  // 初始化加载
  useEffect(() => {
    loadDependencyGraph();
  }, [loadDependencyGraph]);

  // 计算节点样式
  const getNodeStyle = useCallback((node: DependencyGraphNode) => {
    const baseStyle = {
      fill: '#f0f2f5',
      stroke: '#d9d9d9',
      strokeWidth: 2,
      rx: 8,
      ry: 8
    };

    // 状态颜色
    const statusColors = {
      todo: '#1890ff',
      in_progress: '#fa8c16',
      completed: '#52c41a',
      cancelled: '#ff4d4f'
    };

    // 应用状态颜色
    if (statusColors[node.status as keyof typeof statusColors]) {
      baseStyle.fill = statusColors[node.status as keyof typeof statusColors] + '20';
      baseStyle.stroke = statusColors[node.status as keyof typeof statusColors];
    }

    // 关键路径高亮
    if (visualConfig.highlightCriticalTasks && node.isCritical) {
      baseStyle.fill = '#ff4d4f20';
      baseStyle.stroke = '#ff4d4f';
      baseStyle.strokeWidth = 3;
    }

    // 选中状态
    if (selectedNode === node.taskId) {
      baseStyle.fill = '#1890ff20';
      baseStyle.stroke = '#1890ff';
      baseStyle.strokeWidth = 4;
    }

    // 创建依赖模式下的样式
    if (interactionMode === 'createDependency') {
      baseStyle.stroke = '#52c41a';
      baseStyle.strokeWidth = 2;
    }

    return baseStyle;
  }, [visualConfig.highlightCriticalTasks, selectedNode, interactionMode]);

  // 计算边样式
  const getEdgeStyle = useCallback((edge: DependencyGraphEdge) => {
    const baseStyle = {
      stroke: '#d9d9d9',
      strokeWidth: 2,
      fill: 'none',
      markerEnd: 'url(#arrowhead)'
    };

    // 依赖类型样式
    const typeStyles = {
      [DependencyType.FINISH_TO_START]: { strokeDasharray: 'none' },
      [DependencyType.START_TO_START]: { strokeDasharray: '5,5' },
      [DependencyType.FINISH_TO_FINISH]: { strokeDasharray: '10,5' },
      [DependencyType.START_TO_FINISH]: { strokeDasharray: '15,5,5,5' }
    };

    // 依赖强度样式
    const strengthStyles = {
      [DependencyStrength.MANDATORY]: { stroke: '#1890ff', strokeWidth: 3 },
      [DependencyStrength.PREFERRED]: { stroke: '#fa8c16', strokeWidth: 2 },
      [DependencyStrength.OPTIONAL]: { stroke: '#d9d9d9', strokeWidth: 1 }
    };

    // 应用样式
    Object.assign(baseStyle, typeStyles[edge.type as DependencyType] || {});
    Object.assign(baseStyle, strengthStyles[edge.strength as DependencyStrength] || {});

    // 关键路径高亮
    if (visualConfig.showCriticalPath && edge.isCritical) {
      baseStyle.stroke = '#ff4d4f';
      baseStyle.strokeWidth = 4;
    }

    // 选中状态
    if (selectedEdge === edge.dependencyId) {
      baseStyle.stroke = '#722ed1';
      baseStyle.strokeWidth = 4;
    }

    return baseStyle;
  }, [visualConfig.showCriticalPath, selectedEdge]);

  // 初始化D3图表
  const initializeD3Graph = useCallback(() => {
    if (!dependencyGraph || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = graphConfig;

    // 清除之前的内容
    svg.selectAll('*').remove();

    // 创建主容器
    const container = svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('class', 'dependency-graph-container');

    // 定义箭头标记
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#666')
      .style('stroke', 'none');

    // 创建力导向模拟
    const sim = d3.forceSimulation(dependencyGraph.nodes as any)
      .force('link', d3.forceLink(dependencyGraph.edges)
        .id((d: any) => d.taskId)
        .distance(150)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    // 创建连线
    const links = container.selectAll('.dependency-edge')
      .data(dependencyGraph.edges)
      .enter()
      .append('path')
      .attr('class', 'dependency-edge')
      .attr('data-edge-id', (d: DependencyGraphEdge) => d.dependencyId)
      .style('stroke', (d: DependencyGraphEdge) => getEdgeStyle(d).stroke)
      .style('stroke-width', (d: DependencyGraphEdge) => getEdgeStyle(d).strokeWidth)
.style('stroke-dasharray', (d: DependencyGraphEdge) => (getEdgeStyle(d) as any).strokeDasharray)
      .style('fill', 'none')
      .style('marker-end', 'url(#arrowhead)')
      .style('cursor', 'pointer')
      .on('click', (event: any, d: DependencyGraphEdge) => {
        event.stopPropagation();
        setSelectedEdge(d.dependencyId);
        onEdgeClick?.(d.dependencyId);
      });

    // 创建节点
    const nodes = container.selectAll('.dependency-node')
      .data(dependencyGraph.nodes)
      .enter()
      .append('g')
      .attr('class', 'dependency-node')
      .attr('data-node-id', (d: DependencyGraphNode) => d.taskId)
      .style('cursor', interactionMode === 'createDependency' ? 'crosshair' : 'pointer')
      .call(d3.drag<any, any>()
        .on('start', (event: any, d: any) => {
          if (interactionMode !== 'view') return; // 只在查看模式下允许正常拖拽
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          setIsDragging(true);
        })
        .on('drag', (event: any, d: any) => {
          if (interactionMode !== 'view') return;
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event: any, d: any) => {
          if (interactionMode !== 'view') return;
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
          setIsDragging(false);
        }));

    // 添加节点矩形
    nodes.append('rect')
      .attr('width', (d: DependencyGraphNode) => d.width)
      .attr('height', (d: DependencyGraphNode) => d.height)
      .attr('x', (d: DependencyGraphNode) => -d.width / 2)
      .attr('y', (d: DependencyGraphNode) => -d.height / 2)
      .style('fill', (d: DependencyGraphNode) => getNodeStyle(d).fill)
      .style('stroke', (d: DependencyGraphNode) => getNodeStyle(d).stroke)
      .style('stroke-width', (d: DependencyGraphNode) => getNodeStyle(d).strokeWidth)
      .style('rx', 8)
      .style('ry', 8);

    // 添加节点文本
    nodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .style('pointer-events', 'none')
      .text((d: DependencyGraphNode) => {
        const maxLength = Math.floor(d.width / 8);
        return d.title.length > maxLength 
          ? d.title.substring(0, maxLength - 3) + '...' 
          : d.title;
      });

    // 添加状态指示器
    nodes.append('circle')
      .attr('cx', (d: DependencyGraphNode) => d.width / 2 - 8)
      .attr('cy', (d: DependencyGraphNode) => -d.height / 2 + 8)
      .attr('r', 4)
      .style('fill', (d: DependencyGraphNode) => {
        const statusColors = {
          todo: '#1890ff',
          in_progress: '#fa8c16',
          completed: '#52c41a',
          cancelled: '#ff4d4f'
        };
        return statusColors[d.status as keyof typeof statusColors] || '#d9d9d9';
      });

    // 关键路径指示器
    nodes.filter((d: DependencyGraphNode) => d.isCritical && visualConfig.highlightCriticalTasks)
      .append('rect')
      .attr('x', (d: DependencyGraphNode) => -d.width / 2 - 2)
      .attr('y', (d: DependencyGraphNode) => -d.height / 2 - 2)
      .attr('width', (d: DependencyGraphNode) => d.width + 4)
      .attr('height', (d: DependencyGraphNode) => d.height + 4)
      .style('fill', 'none')
      .style('stroke', '#ff4d4f')
      .style('stroke-width', 2)
      .style('stroke-dasharray', '5,5')
      .style('rx', 10)
      .style('ry', 10);

    // 节点点击事件
    nodes.on('click', (event: any, d: DependencyGraphNode) => {
      event.stopPropagation();
      if (interactionMode === 'view') {
        setSelectedNode(d.taskId);
        onNodeClick?.(d.taskId);
      }
    });

    // 更新位置的函数
    const updatePositions = () => {
      links.attr('d', (d: any) => {
        const source = d.source;
        const target = d.target;
        return `M${source.x},${source.y}L${target.x},${target.y}`;
      });

      nodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    };

    // 监听模拟更新
    sim.on('tick', updatePositions);

setSimulation(sim as unknown as d3.Simulation<DependencyGraphNode, undefined>);

    // 缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setGraphConfig(prev => ({
          ...prev,
          zoom: event.transform.k,
          centerX: event.transform.x,
          centerY: event.transform.y
        }));
      });

    if (interactionMode === 'view') {
      svg.call(zoom as any);
    }

    // 清除选择事件
    svg.on('click', () => {
      if (interactionMode === 'view') {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    });

  }, [dependencyGraph, graphConfig, visualConfig, getNodeStyle, getEdgeStyle, onNodeClick, onEdgeClick, interactionMode]);

  // D3图表初始化
  useEffect(() => {
    initializeD3Graph();
  }, [initializeD3Graph]);

  // 响应式调整
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setGraphConfig(prev => ({
          ...prev,
          width: clientWidth,
          height: Math.max(clientHeight, 400)
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 控制面板操作
  const handleZoomIn = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(
        d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
        1.5
      );
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(
        d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
        1 / 1.5
      );
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(
        d3.zoom<SVGSVGElement, unknown>().transform as any,
        d3.zoomIdentity
      );
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const handleExport = async () => {
    if (!project) return;

    try {
      const blob = await DependencyService.exportDependencies(project.id, {
        format: 'PDF',
        includeTaskDetails: true,
        includeCriticalPath: true,
        includeStatistics: true
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}-依赖关系图.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 处理依赖关系创建
  const handleDependencyCreated = useCallback((dependency: CreateDependencyRequest) => {
    loadDependencyGraph(); // 重新加载图表
    onDependencyCreated?.(dependency);
    message.success('依赖关系创建成功');
  }, [loadDependencyGraph, onDependencyCreated]);

  // 统计信息
  const statistics = useMemo(() => {
    if (!dependencyGraph) return null;

    return {
      totalNodes: dependencyGraph.nodes.length,
      totalEdges: dependencyGraph.edges.length,
      criticalPathLength: dependencyGraph.criticalPath.length,
      projectDuration: dependencyGraph.projectDuration
    };
  }, [dependencyGraph]);

  if (loading) {
    return (
      <Card title="增强依赖关系图">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="加载依赖关系图...">
            <div style={{ minHeight: '100px' }} />
          </Spin>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="增强依赖关系图">
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button  onClick={loadDependencyGraph}>
              重试
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      {/* 交互模式选择 */}
      <Card  style={{ marginBottom: 16 }}>
        <Space>
          <span>交互模式:</span>
          <Select
            value={interactionMode}
            onChange={setInteractionMode}
            style={{ width: 200 }}
          >
            <Option value="view">
              <Space>
                <InfoCircleOutlined />
                查看模式
              </Space>
            </Option>
            <Option value="createDependency">
              <Space>
                <DragOutlined />
                创建依赖
              </Space>
            </Option>
          </Select>
          
          {interactionMode !== 'view' && (
            <Alert
              message={INTERACTION_MODES[interactionMode]?.description}
              type="info"
              showIcon
              style={{ marginLeft: 16 }}
            />
          )}
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <span>增强依赖关系图</span>
            {statistics && (
              <Tooltip title={`节点: ${statistics.totalNodes}, 连线: ${statistics.totalEdges}, 关键路径: ${statistics.criticalPathLength}个任务, 项目工期: ${statistics.projectDuration}天`}>
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
              </Tooltip>
            )}
          </Space>
        }
        extra={
          <Space>
            <Switch
              checked={visualConfig.showCriticalPath}
              onChange={(checked) => setVisualConfig(prev => ({ ...prev, showCriticalPath: checked }))}
              checkedChildren="关键路径"
              unCheckedChildren="关键路径"
            />
            <Switch
              checked={visualConfig.highlightCriticalTasks}
              onChange={(checked) => setVisualConfig(prev => ({ ...prev, highlightCriticalTasks: checked }))}
              checkedChildren="高亮关键任务"
              unCheckedChildren="高亮关键任务"
            />
            <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
            <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
            <Button icon={<ReloadOutlined />} onClick={handleResetZoom} />
            <Button icon={<FullscreenOutlined />} onClick={handleFullscreen} />
            <Button icon={<DownloadOutlined />} onClick={handleExport} />
            <Button icon={<SettingOutlined />} onClick={loadDependencyGraph} />
          </Space>
        }
      >
        <div
          ref={containerRef}
          className="dependency-graph-container"
          style={{ 
            width: '100%', 
            height: '600px', 
            border: '1px solid #f0f0f0',
            borderRadius: '6px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
          
          {/* 拖拽创建依赖功能覆盖层 */}
          {interactionMode === 'createDependency' && dependencyGraph && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
              <DragDropDependencyCreator
                project={project}
                tasks={tasks}
                dependencyGraph={dependencyGraph}
                onDependencyCreated={handleDependencyCreated}
                onGraphUpdate={loadDependencyGraph}
              />
            </div>
          )}
        </div>

        {selectedNode && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={`已选择任务: ${dependencyGraph?.nodes.find(n => n.taskId === selectedNode)?.title}`}
              type="info"
              closable
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}

        {selectedEdge && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={`已选择依赖关系: ID ${selectedEdge}`}
              type="info"
              closable
              onClose={() => setSelectedEdge(null)}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default EnhancedDependencyGraph;