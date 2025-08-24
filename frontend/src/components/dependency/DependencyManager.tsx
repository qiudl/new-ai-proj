import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  Tag,
  Tooltip,
  message,
  Popconfirm,
  Alert,
  Divider,
  Typography,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  DisconnectOutlined,
  SettingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  TaskDependency,
  CreateDependencyRequest,
  UpdateDependencyRequest,
  DependencyType,
  DependencyStrength,
  DependencyStatistics,
  DependencyValidation
} from '../../types/dependency';
import { Task } from '../../types/task';
import type { Project } from '../../types/project';
import DependencyService from '../../services/dependencyService';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface DependencyManagerProps {
  project: Project;
  tasks: Task[];
  onDependencyChange?: (dependencies: TaskDependency[]) => void;
}

const DependencyManager: React.FC<DependencyManagerProps> = ({
  project,
  tasks,
  onDependencyChange
}) => {
  // 状态管理
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [statistics, setStatistics] = useState<DependencyStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // 表单状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDependency, setEditingDependency] = useState<TaskDependency | null>(null);
  const [form] = Form.useForm();
  const [validationResult, setValidationResult] = useState<DependencyValidation | null>(null);

  // 任务映射
  const taskMap = React.useMemo(() => {
    return tasks.reduce((map, task) => {
      map[task.id] = task;
      return map;
    }, {} as Record<number, Task>);
  }, [tasks]);

  // 加载依赖关系列表
  const loadDependencies = useCallback(async () => {
    if (!project) return;

    setLoading(true);
    try {
      const [deps, stats] = await Promise.all([
        DependencyService.getDependencies(project.id),
        DependencyService.getDependencyStatistics(project.id)
      ]);
      
      setDependencies(deps);
      setStatistics(stats);
      onDependencyChange?.(deps);
    } catch (error) {
      message.error('加载依赖关系失败');
      console.error('加载依赖关系失败:', error);
    } finally {
      setLoading(false);
    }
  }, [project, onDependencyChange]);

  // 初始化加载
  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  // 依赖类型标签
  const getDependencyTypeTag = (type: DependencyType) => {
    const typeConfig = {
      [DependencyType.FINISH_TO_START]: { color: 'blue', text: '完成-开始 (FS)' },
      [DependencyType.START_TO_START]: { color: 'green', text: '开始-开始 (SS)' },
      [DependencyType.FINISH_TO_FINISH]: { color: 'orange', text: '完成-完成 (FF)' },
      [DependencyType.START_TO_FINISH]: { color: 'purple', text: '开始-完成 (SF)' }
    };

    const config = typeConfig[type];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 依赖强度标签
  const getDependencyStrengthTag = (strength: DependencyStrength) => {
    const strengthConfig = {
      [DependencyStrength.MANDATORY]: { color: 'red', text: '强制' },
      [DependencyStrength.PREFERRED]: { color: 'orange', text: '首选' },
      [DependencyStrength.OPTIONAL]: { color: 'default', text: '可选' }
    };

    const config = strengthConfig[strength];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 表格列配置
  const columns: ColumnsType<TaskDependency> = [
    {
      title: '前置任务',
      dataIndex: 'predecessor_id',
      key: 'predecessor_id',
      render: (id: number) => {
        const task = taskMap[id];
        return task ? (
          <Tooltip title={`ID: ${id}`}>
            <Text ellipsis style={{ maxWidth: 150 }}>
              {task.title}
            </Text>
          </Tooltip>
        ) : (
          <Text type="danger">任务不存在</Text>
        );
      }
    },
    {
      title: '依赖类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: DependencyType) => getDependencyTypeTag(type),
      filters: [
        { text: '完成-开始 (FS)', value: DependencyType.FINISH_TO_START },
        { text: '开始-开始 (SS)', value: DependencyType.START_TO_START },
        { text: '完成-完成 (FF)', value: DependencyType.FINISH_TO_FINISH },
        { text: '开始-完成 (SF)', value: DependencyType.START_TO_FINISH }
      ],
      onFilter: (value, record) => record.type === value
    },
    {
      title: '后续任务',
      dataIndex: 'successor_id',
      key: 'successor_id',
      render: (id: number) => {
        const task = taskMap[id];
        return task ? (
          <Tooltip title={`ID: ${id}`}>
            <Text ellipsis style={{ maxWidth: 150 }}>
              {task.title}
            </Text>
          </Tooltip>
        ) : (
          <Text type="danger">任务不存在</Text>
        );
      }
    },
    {
      title: '依赖强度',
      dataIndex: 'strength',
      key: 'strength',
      render: (strength: DependencyStrength) => getDependencyStrengthTag(strength),
      filters: [
        { text: '强制', value: DependencyStrength.MANDATORY },
        { text: '首选', value: DependencyStrength.PREFERRED },
        { text: '可选', value: DependencyStrength.OPTIONAL }
      ],
      onFilter: (value, record) => record.strength === value
    },
    {
      title: '滞后时间',
      dataIndex: 'lag_days',
      key: 'lag_days',
      render: (lagDays: number | undefined) => {
        if (lagDays === undefined || lagDays === 0) return '-';
        return (
          <Tag color={lagDays > 0 ? 'red' : 'green'}>
            {lagDays > 0 ? `+${lagDays}` : lagDays}天
          </Tag>
        );
      },
      sorter: (a, b) => (a.lag_days || 0) - (b.lag_days || 0)
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => (
        description ? (
          <Tooltip title={description}>
            <Text ellipsis>{description}</Text>
          </Tooltip>
        ) : '-'
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: TaskDependency) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditDependency(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除这个依赖关系吗？"
              onConfirm={() => handleDeleteDependency(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                danger
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: TaskDependency) => ({
      name: record.id.toString()
    })
  };

  // 打开创建/编辑模态框
  const handleCreateDependency = () => {
    setEditingDependency(null);
    setValidationResult(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditDependency = (dependency: TaskDependency) => {
    setEditingDependency(dependency);
    setValidationResult(null);
    form.setFieldsValue({
      predecessor_id: dependency.predecessor_id,
      successor_id: dependency.successor_id,
      type: dependency.type,
      strength: dependency.strength,
      lag_days: dependency.lag_days,
      description: dependency.description
    });
    setIsModalVisible(true);
  };

  // 验证依赖关系
  const validateDependency = async (values: CreateDependencyRequest) => {
    try {
      const validation = await DependencyService.validateDependencies(project.id, [values]);
      setValidationResult(validation);
      return validation.isValid;
    } catch (error) {
      message.error('验证依赖关系失败');
      return false;
    }
  };

  // 表单提交
  const handleSubmit = async (values: any) => {
    const isValid = await validateDependency(values);
    if (!isValid) return;

    try {
      if (editingDependency) {
        // 更新依赖关系
        await DependencyService.updateDependency(project.id, editingDependency.id, values);
        message.success('依赖关系更新成功');
      } else {
        // 创建依赖关系
        await DependencyService.createDependency(project.id, values);
        message.success('依赖关系创建成功');
      }

      setIsModalVisible(false);
      loadDependencies();
    } catch (error) {
      message.error(editingDependency ? '更新依赖关系失败' : '创建依赖关系失败');
      console.error('操作失败:', error);
    }
  };

  // 删除单个依赖关系
  const handleDeleteDependency = async (id: number) => {
    try {
      await DependencyService.deleteDependency(project.id, id);
      message.success('依赖关系删除成功');
      loadDependencies();
    } catch (error) {
      message.error('删除依赖关系失败');
      console.error('删除失败:', error);
    }
  };

  // 批量删除依赖关系
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的依赖关系');
      return;
    }

    try {
      const ids = selectedRowKeys.map(key => Number(key));
      await DependencyService.deleteDependenciesBatch(project.id, ids);
      message.success(`成功删除 ${selectedRowKeys.length} 个依赖关系`);
      setSelectedRowKeys([]);
      loadDependencies();
    } catch (error) {
      message.error('批量删除失败');
      console.error('批量删除失败:', error);
    }
  };

  // 检测循环依赖
  const handleCheckCircularDependencies = async () => {
    try {
      const result = await DependencyService.detectCircularDependencies(project.id);
      if (result.hasCircular) {
        Modal.warning({
          title: '发现循环依赖',
          content: (
            <div>
              <p>检测到 {result.cycles.length} 个循环依赖:</p>
              {result.cycles.map((cycle, index) => (
                <div key={index} style={{ marginBottom: 8 }}>
                  <Text code>{cycle.description}</Text>
                </div>
              ))}
            </div>
          ),
          width: 600
        });
      } else {
        message.success('没有发现循环依赖');
      }
    } catch (error) {
      message.error('检测循环依赖失败');
      console.error('检测失败:', error);
    }
  };

  // 优化依赖关系
  const handleOptimizeDependencies = async () => {
    try {
      const result = await DependencyService.optimizeDependencies(project.id);
      if (result.removedDependencies.length > 0) {
        Modal.info({
          title: '依赖关系优化完成',
          content: (
            <div>
              <p>优化结果:</p>
              <ul>
                <li>总计检查: {result.optimizationSummary.totalReviewed} 个依赖</li>
                <li>移除冗余: {result.optimizationSummary.redundantRemoved} 个</li>
                <li>解决冲突: {result.optimizationSummary.conflictsResolved} 个</li>
              </ul>
              {result.removedDependencies.length > 0 && (
                <div>
                  <p>移除的依赖关系:</p>
                  {result.removedDependencies.map(dep => (
                    <div key={dep.id} style={{ marginBottom: 4 }}>
                      <Text type="secondary">
                        {dep.predecessorTitle} → {dep.successorTitle} ({dep.reason})
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ),
          width: 600,
          onOk: loadDependencies
        });
      } else {
        message.success('依赖关系已经是最优状态');
      }
    } catch (error) {
      message.error('优化依赖关系失败');
      console.error('优化失败:', error);
    }
  };

  return (
    <div>
      {/* 统计信息 */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总依赖数"
                value={statistics.totalDependencies}
                prefix={<LinkOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="复杂任务"
                value={statistics.complexTasksCount}
                suffix="个"
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="孤立任务"
                value={statistics.orphanTasksCount}
                suffix="个"
                prefix={<DisconnectOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均滞后"
                value={statistics.avgLagDays}
                suffix="天"
                precision={1}
                prefix={<InfoCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主要内容卡片 */}
      <Card
        title={
          <Space>
            <LinkOutlined />
            <span>依赖关系管理</span>
            <Text type="secondary">({dependencies.length})</Text>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateDependency}
            >
              添加依赖
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadDependencies}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={handleCheckCircularDependencies}
            >
              检测循环
            </Button>
            <Button onClick={handleOptimizeDependencies}>
              优化依赖
            </Button>
          </Space>
        }
      >
        {/* 批量操作工具栏 */}
        {selectedRowKeys.length > 0 && (
          <Alert
            message={
              <Space>
                <span>已选择 {selectedRowKeys.length} 个依赖关系</span>
                <Button
                  size="small"
                  onClick={() => setSelectedRowKeys([])}
                >
                  取消选择
                </Button>
                <Popconfirm
                  title={`确定要删除选中的 ${selectedRowKeys.length} 个依赖关系吗？`}
                  onConfirm={handleBatchDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button size="small" danger>
                    批量删除
                  </Button>
                </Popconfirm>
              </Space>
            }
            type="info"
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setSelectedRowKeys([])}
          />
        )}

        {/* 依赖关系表格 */}
        <Table
          columns={columns}
          dataSource={dependencies}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          pagination={{
            total: dependencies.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `显示 ${range[0]}-${range[1]} 条记录，共 ${total} 条`
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 创建/编辑依赖关系模态框 */}
      <Modal
        title={editingDependency ? '编辑依赖关系' : '创建依赖关系'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="predecessor_id"
                label="前置任务"
                rules={[{ required: true, message: '请选择前置任务' }]}
              >
                <Select
                  placeholder="选择前置任务"
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                >
                  {tasks.map(task => (
                    <Option key={task.id} value={task.id}>
                      {task.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="successor_id"
                label="后续任务"
                rules={[{ required: true, message: '请选择后续任务' }]}
              >
                <Select
                  placeholder="选择后续任务"
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                >
                  {tasks.map(task => (
                    <Option key={task.id} value={task.id}>
                      {task.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="依赖类型"
                rules={[{ required: true, message: '请选择依赖类型' }]}
              >
                <Select placeholder="选择依赖类型">
                  <Option value={DependencyType.FINISH_TO_START}>
                    完成-开始 (FS)
                  </Option>
                  <Option value={DependencyType.START_TO_START}>
                    开始-开始 (SS)
                  </Option>
                  <Option value={DependencyType.FINISH_TO_FINISH}>
                    完成-完成 (FF)
                  </Option>
                  <Option value={DependencyType.START_TO_FINISH}>
                    开始-完成 (SF)
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="strength"
                label="依赖强度"
                initialValue={DependencyStrength.MANDATORY}
              >
                <Select>
                  <Option value={DependencyStrength.MANDATORY}>强制</Option>
                  <Option value={DependencyStrength.PREFERRED}>首选</Option>
                  <Option value={DependencyStrength.OPTIONAL}>可选</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="lag_days"
            label="滞后时间（天）"
            tooltip="正数表示延迟，负数表示提前"
          >
            <InputNumber
              placeholder="输入滞后天数"
              min={-365}
              max={365}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea
              placeholder="输入依赖关系的描述（可选）"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* 验证结果显示 */}
          {validationResult && !validationResult.isValid && (
            <Alert
              message="验证失败"
              description={
                <div>
                  {validationResult.errors.map((error, index) => (
                    <div key={index} style={{ marginBottom: 4 }}>
                      <Text type="danger">{error.message}</Text>
                    </div>
                  ))}
                </div>
              }
              type="error"
              style={{ marginBottom: 16 }}
            />
          )}

          {validationResult && validationResult.warnings.length > 0 && (
            <Alert
              message="注意事项"
              description={
                <div>
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index} style={{ marginBottom: 4 }}>
                      <Text type="warning">{warning.message}</Text>
                      {warning.suggestion && (
                        <div style={{ marginLeft: 16, fontSize: 12 }}>
                          <Text type="secondary">建议: {warning.suggestion}</Text>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              }
              type="warning"
              style={{ marginBottom: 16 }}
            />
          )}

          <Divider />

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                disabled={validationResult && !validationResult.isValid}
              >
                {editingDependency ? '更新' : '创建'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DependencyManager;