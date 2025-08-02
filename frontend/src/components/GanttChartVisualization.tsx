/**
 * Gantt Chart and Dependency Visualization Component
 * 
 * This component provides a comprehensive Gantt chart interface with dependency
 * visualization, critical path analysis, and resource conflict detection.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Select,
  Switch,
  DatePicker,
  Slider,
  Alert,
  Badge,
  Tag,
  Tooltip,
  Collapse,
  List,
  Progress,
  Statistic,
  Timeline,
  Divider
} from 'antd';
import {
  BarChartOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  FullscreenOutlined,
  SettingOutlined,
  FileExcelOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

import { Task } from '../types/task';
import {
  ganttChartService,
  GanttTask,
  TaskDependency,
  GanttConfig,
  CriticalPath,
  ResourceConflict,
  ProgressStats
} from '../services/ganttChartService';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface GanttChartVisualizationProps {
  tasks: Task[];
  projectId?: number;
  height?: number;
  showControls?: boolean;
  onTaskSelect?: (taskId: number) => void;
  onDependencyUpdate?: (dependencies: TaskDependency[]) => void;
}

interface ViewState {
  ganttTasks: GanttTask[];
  dependencies: TaskDependency[];
  criticalPath: CriticalPath | null;
  resourceConflicts: ResourceConflict[];
  progressStats: ProgressStats;
  config: GanttConfig;
}

const PRIORITY_COLORS = {
  low: '#1890ff',
  medium: '#faad14',
  high: '#ff4d4f'
};

const STATUS_COLORS = {
  todo: '#d9d9d9',
  in_progress: '#1890ff',
  completed: '#52c41a',
  cancelled: '#ff4d4f'
};

export const GanttChartVisualization: React.FC<GanttChartVisualizationProps> = ({
  tasks,
  projectId,
  height = 600,
  showControls = true,
  onTaskSelect,
  onDependencyUpdate
}) => {
  const [viewState, setViewState] = useState<ViewState>({
    ganttTasks: [],
    dependencies: [],
    criticalPath: null,
    resourceConflicts: [],
    progressStats: {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0,
      progressPercentage: 0,
      scheduleVariance: 0
    },
    config: {
      timeScale: 'day',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      workingDays: [1, 2, 3, 4, 5],
      holidays: [],
      showDependencies: true,
      showCriticalPath: true,
      autoSchedule: true,
      zoomLevel: 3
    }
  });

  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const chartRef = useRef<HTMLDivElement>(null);

  // 初始化和更新甘特图数据
  const updateGanttData = async () => {
    setLoading(true);
    try {
      // 设置任务数据
      ganttChartService.setTasks(tasks);
      ganttChartService.updateConfig(viewState.config);

      // 生成甘特图数据
      const ganttTasks = ganttChartService.convertToGanttTasks();
      const dependencies = ganttChartService.generateDependencies();
      const criticalPath = ganttChartService.calculateCriticalPath();
      const resourceConflicts = ganttChartService.detectResourceConflicts();
      const progressStats = ganttChartService.calculateProgressStats();

      setViewState(prev => ({
        ...prev,
        ganttTasks,
        dependencies,
        criticalPath,
        resourceConflicts,
        progressStats
      }));

      // 通知父组件依赖关系更新
      if (onDependencyUpdate) {
        onDependencyUpdate(dependencies);
      }

    } catch (error) {
      console.error('更新甘特图数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 更新配置
  const updateConfig = (newConfig: Partial<GanttConfig>) => {
    setViewState(prev => ({
      ...prev,
      config: { ...prev.config, ...newConfig }
    }));
  };

  // 任务点击处理
  const handleTaskClick = (taskId: number) => {
    if (onTaskSelect) {
      onTaskSelect(taskId);
    }
    
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // 渲染甘特图任务条
  const renderGanttBar = (task: GanttTask, index: number) => {
    const isSelected = selectedTasks.has(task.id);
    const isCritical = viewState.criticalPath?.tasks.includes(task.id);
    const totalDays = Math.ceil((viewState.config.endDate.getTime() - viewState.config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const taskStartDays = Math.ceil((task.startDate.getTime() - viewState.config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const taskWidth = (task.duration / totalDays) * 100;
    const taskLeft = (taskStartDays / totalDays) * 100;

    return (
      <div
        key={task.id}
        className={`gantt-task-row ${isSelected ? 'selected' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '40px',
          borderBottom: '1px solid #f0f0f0',
          paddingLeft: `${task.level * 20}px`
        }}
      >
        {/* 任务信息区域 */}
        <div style={{ width: '300px', padding: '0 8px' }}>
          <Space>
            <Text 
              strong={isCritical}
              style={{ 
                color: isCritical ? '#ff4d4f' : undefined,
                cursor: 'pointer'
              }}
              onClick={() => handleTaskClick(task.id)}
            >
              {task.title}
            </Text>
            <Tag color={PRIORITY_COLORS[task.priority]} size="small">
              {task.priority}
            </Tag>
            <Tag color={STATUS_COLORS[task.status]} size="small">
              {task.status}
            </Tag>
            {task.warning && (
              <Tooltip title={task.warning}>
                <WarningOutlined style={{ color: '#faad14' }} />
              </Tooltip>
            )}
            {task.isMilestone && (
              <Tooltip title="里程碑">
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              </Tooltip>
            )}
          </Space>
        </div>

        {/* 甘特图区域 */}
        <div style={{ flex: 1, position: 'relative', height: '30px' }}>
          <div
            style={{
              position: 'absolute',
              left: `${Math.max(0, taskLeft)}%`,
              width: `${Math.min(taskWidth, 100 - taskLeft)}%`,
              height: '20px',
              backgroundColor: task.color,
              border: isCritical ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: isSelected ? 0.8 : 1,
              transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => handleTaskClick(task.id)}
          >
            {/* 进度条 */}
            <div
              style={{
                width: `${task.progress}%`,
                height: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '3px'
              }}
            />
            
            {/* 任务文本 */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '4px',
                transform: 'translateY(-50%)',
                fontSize: '11px',
                color: 'white',
                fontWeight: 'bold',
                textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
              }}
            >
              {task.isMilestone ? '◆' : `${task.progress}%`}
            </div>
          </div>

          {/* 依赖关系线 */}
          {viewState.config.showDependencies && 
           viewState.dependencies
             .filter(dep => dep.toTaskId === task.id)
             .map(dep => renderDependencyLine(dep, index))
          }
        </div>

        {/* 时间信息 */}
        <div style={{ width: '200px', padding: '0 8px', fontSize: '12px' }}>
          <div>{dayjs(task.startDate).format('MM/DD')} - {dayjs(task.endDate).format('MM/DD')}</div>
          <div style={{ color: '#666' }}>{task.duration}天 / {task.estimatedHours}h</div>
        </div>
      </div>
    );
  };

  // 渲染依赖关系线
  const renderDependencyLine = (dependency: TaskDependency, toTaskIndex: number) => {
    if (!dependency.isValid) return null;

    const fromTask = viewState.ganttTasks.find(t => t.id === dependency.fromTaskId);
    if (!fromTask) return null;

    // 简化的依赖线渲染（实际应该计算精确位置）
    return (
      <div
        key={`dep-${dependency.fromTaskId}-${dependency.toTaskId}`}
        style={{
          position: 'absolute',
          top: '-20px',
          left: '10px',
          width: '20px',
          height: '2px',
          backgroundColor: dependency.isValid ? '#1890ff' : '#ff4d4f',
          zIndex: 10
        }}
      />
    );
  };

  // 渲染时间刻度
  const renderTimeScale = () => {
    const { startDate, endDate, timeScale } = viewState.config;
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const intervals = [];

    for (let i = 0; i <= days; i += timeScale === 'week' ? 7 : timeScale === 'month' ? 30 : 1) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      intervals.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${(i / days) * 100}%`,
            top: 0,
            borderLeft: '1px solid #d9d9d9',
            height: '100%',
            paddingLeft: '4px',
            fontSize: '11px',
            color: '#666'
          }}
        >
          {dayjs(date).format(timeScale === 'month' ? 'MM/DD' : 'MM/DD')}
        </div>
      );
    }

    return (
      <div style={{ position: 'relative', height: '30px', backgroundColor: '#fafafa' }}>
        {intervals}
      </div>
    );
  };

  // 导出功能
  const exportToExcel = () => {
    // 这里可以实现导出到Excel的功能
    console.log('导出甘特图数据到Excel');
  };

  // 全屏切换
  const toggleFullscreen = () => {
    if (chartRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        chartRef.current.requestFullscreen();
      }
    }
  };

  // 组件初始化
  useEffect(() => {
    if (tasks.length > 0) {
      updateGanttData();
    }
  }, [tasks, viewState.config]);

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>甘特图 & 依赖关系可视化</span>
          {viewState.progressStats.totalTasks > 0 && (
            <Badge count={viewState.progressStats.totalTasks} style={{ backgroundColor: '#52c41a' }} />
          )}
        </Space>
      }
      extra={
        showControls && (
          <Space>
            <Button size="small" icon={<ReloadOutlined />} onClick={updateGanttData} loading={loading}>
              刷新
            </Button>
            <Button size="small" icon={<FileExcelOutlined />} onClick={exportToExcel}>
              导出
            </Button>
            <Button size="small" icon={<FullscreenOutlined />} onClick={toggleFullscreen}>
              全屏
            </Button>
          </Space>
        )
      }
    >
      {/* 控制面板 */}
      {showControls && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>时间范围</Text>
              <RangePicker
                size="small"
                value={[dayjs(viewState.config.startDate), dayjs(viewState.config.endDate)]}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    updateConfig({
                      startDate: dates[0].toDate(),
                      endDate: dates[1].toDate()
                    });
                  }
                }}
              />
            </Space>
          </Col>
          <Col span={4}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>时间刻度</Text>
              <Select
                size="small"
                value={viewState.config.timeScale}
                onChange={(value) => updateConfig({ timeScale: value })}
                style={{ width: '100%' }}
              >
                <Option value="day">天</Option>
                <Option value="week">周</Option>
                <Option value="month">月</Option>
              </Select>
            </Space>
          </Col>
          <Col span={4}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>缩放级别</Text>
              <Slider
                min={1}
                max={5}
                value={viewState.config.zoomLevel}
                onChange={(value) => updateConfig({ zoomLevel: value })}
              />
            </Space>
          </Col>
          <Col span={6}>
            <Space direction="vertical" size="small">
              <Space>
                <Switch
                  size="small"
                  checked={viewState.config.showDependencies}
                  onChange={(checked) => updateConfig({ showDependencies: checked })}
                />
                <Text>显示依赖关系</Text>
              </Space>
              <Space>
                <Switch
                  size="small"
                  checked={viewState.config.showCriticalPath}
                  onChange={(checked) => updateConfig({ showCriticalPath: checked })}
                />
                <Text>显示关键路径</Text>
              </Space>
            </Space>
          </Col>
          <Col span={4}>
            <Space direction="vertical" size="small">
              <Space>
                <Switch
                  size="small"
                  checked={viewState.config.autoSchedule}
                  onChange={(checked) => updateConfig({ autoSchedule: checked })}
                />
                <Text>自动调度</Text>
              </Space>
            </Space>
          </Col>
        </Row>
      )}

      {/* 进度统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Statistic
            title="总任务数"
            value={viewState.progressStats.totalTasks}
            prefix={<BarChartOutlined />}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title="完成进度"
            value={viewState.progressStats.progressPercentage}
            suffix="%"
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title="逾期任务"
            value={viewState.progressStats.overdueTasks}
            prefix={<WarningOutlined />}
            valueStyle={{ color: viewState.progressStats.overdueTasks > 0 ? '#ff4d4f' : undefined }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title="预估工时"
            value={viewState.progressStats.totalEstimatedHours}
            suffix="h"
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title="实际工时"
            value={viewState.progressStats.totalActualHours}
            suffix="h"
            precision={1}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title="进度偏差"
            value={viewState.progressStats.scheduleVariance}
            suffix="天"
            valueStyle={{ color: viewState.progressStats.scheduleVariance > 0 ? '#ff4d4f' : '#52c41a' }}
          />
        </Col>
      </Row>

      {/* 警告信息 */}
      {viewState.resourceConflicts.length > 0 && (
        <Alert
          message="发现资源冲突"
          description={`检测到 ${viewState.resourceConflicts.length} 个资源分配冲突，可能影响项目进度`}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 甘特图主体 */}
      <div
        ref={chartRef}
        style={{
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          height: `${height}px`,
          overflow: 'auto'
        }}
      >
        {/* 时间刻度 */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', backgroundColor: 'white' }}>
            <div style={{ width: '300px', padding: '8px', borderRight: '1px solid #d9d9d9' }}>
              <Text strong>任务名称</Text>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              {renderTimeScale()}
            </div>
            <div style={{ width: '200px', padding: '8px', borderLeft: '1px solid #d9d9d9' }}>
              <Text strong>时间信息</Text>
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        <div>
          {viewState.ganttTasks.map((task, index) => renderGanttBar(task, index))}
        </div>

        {loading && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            zIndex: 1000
          }}>
            <SyncOutlined spin style={{ fontSize: '24px' }} />
          </div>
        )}
      </div>

      {/* 详细信息面板 */}
      <Collapse style={{ marginTop: 16 }}>
        <Panel header="关键路径分析" key="critical-path">
          {viewState.criticalPath ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>关键路径包含 {viewState.criticalPath.tasks.length} 个任务，总工期 {viewState.criticalPath.totalDuration} 天</Text>
              <Timeline>
                {viewState.criticalPath.tasks.map(taskId => {
                  const task = viewState.ganttTasks.find(t => t.id === taskId);
                  return task ? (
                    <Timeline.Item key={taskId} color="red">
                      <Text strong>{task.title}</Text> ({task.duration}天)
                    </Timeline.Item>
                  ) : null;
                })}
              </Timeline>
            </Space>
          ) : (
            <Text type="secondary">无关键路径数据</Text>
          )}
        </Panel>

        <Panel header="资源冲突详情" key="resource-conflicts">
          {viewState.resourceConflicts.length > 0 ? (
            <List
              dataSource={viewState.resourceConflicts}
              renderItem={(conflict) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text>{conflict.assigneeName}</Text>
                        <Tag color={conflict.severity === 'high' ? 'red' : conflict.severity === 'medium' ? 'orange' : 'blue'}>
                          {conflict.severity}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <Text>冲突任务: {conflict.conflictingTasks.join(', ')}</Text>
                        <br />
                        <Text type="secondary">{conflict.suggestion}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary">无资源冲突</Text>
          )}
        </Panel>

        <Panel header="依赖关系列表" key="dependencies">
          {viewState.dependencies.length > 0 ? (
            <List
              size="small"
              dataSource={viewState.dependencies}
              renderItem={(dep) => {
                const fromTask = viewState.ganttTasks.find(t => t.id === dep.fromTaskId);
                const toTask = viewState.ganttTasks.find(t => t.id === dep.toTaskId);
                return (
                  <List.Item>
                    <Space>
                      <Text>{fromTask?.title || `任务${dep.fromTaskId}`}</Text>
                      <ApartmentOutlined />
                      <Text>{toTask?.title || `任务${dep.toTaskId}`}</Text>
                      <Tag color={dep.isValid ? 'green' : 'red'}>
                        {dep.isValid ? '有效' : '冲突'}
                      </Tag>
                      {dep.conflictReason && (
                        <Text type="secondary">({dep.conflictReason})</Text>
                      )}
                    </Space>
                  </List.Item>
                );
              }}
            />
          ) : (
            <Text type="secondary">无依赖关系</Text>
          )}
        </Panel>
      </Collapse>
    </Card>
  );
};

export default GanttChartVisualization;