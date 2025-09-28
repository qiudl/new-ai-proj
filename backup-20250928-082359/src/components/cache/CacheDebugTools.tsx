/**
 * 缓存调试工具
 * 提供缓存浏览器、事件日志、性能分析等调试功能
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  Table,
  Input,
  Button,
  Space,
  Tag,
  Typography,
  Drawer,
  Descriptions,
  Alert,
  Tabs,
  Tree,
  Select,
  Switch,
  Modal,
  Form,
  message,
  Tooltip,
  Popconfirm,
  Timeline,
  Progress,
  Divider,
  Collapse
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  ClearOutlined,
  FilterOutlined,
  BugOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { DataNode } from 'antd/es/tree';
import dayjs from 'dayjs';
import { enhancedCacheManager } from '../../utils/enhancedCacheManager';
import { cacheEventSystem, CacheEvent } from '../../utils/cacheEventSystem';
import { useCacheEvents } from '../../hooks/useCacheState';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { TextArea } = Input;
const { Option } = Select;

interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  tags: string[];
  size: number;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
}

interface DebugFilter {
  keyPattern: string;
  eventType: CacheEvent['type'] | 'all';
  timeRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  tags: string[];
  source: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  width?: number;
}

export const CacheDebugTools: React.FC<Props> = ({
  visible,
  onClose,
  width = 1200
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState('browser');
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CacheEntry | null>(null);
  const [entryDetailVisible, setEntryDetailVisible] = useState(false);
  const [filter, setFilter] = useState<DebugFilter>({
    keyPattern: '',
    eventType: 'all',
    timeRange: null,
    tags: [],
    source: ''
  });
  
  // 事件日志
  const allEvents = useCacheEvents();
  const [selectedEvents, setSelectedEvents] = useState<CacheEvent[]>([]);
  
  // 性能分析
  const [performanceAnalysis, setPerformanceAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // 操作测试
  const [testForm] = Form.useForm();
  const [testResult, setTestResult] = useState<any>(null);
  
  // 引用
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 加载缓存条目
  const loadCacheEntries = async () => {
    setLoading(true);
    try {
      // 模拟获取缓存条目（实际需要从 enhancedCacheManager 获取）
      const stats = enhancedCacheManager.getStats();
      const mockEntries: CacheEntry[] = [
        {
          key: 'task:1:123',
          value: { id: 123, title: 'Sample Task' },
          ttl: 300000,
          tags: ['task', 'project:1'],
          size: 1024,
          createdAt: Date.now() - 60000,
          accessedAt: Date.now() - 5000,
          accessCount: 15
        },
        {
          key: 'project:1:summary',
          value: { projectId: 1, taskCount: 45 },
          ttl: 600000,
          tags: ['project', 'summary'],
          size: 512,
          createdAt: Date.now() - 300000,
          accessedAt: Date.now() - 10000,
          accessCount: 8
        },
        {
          key: 'user:456:preferences',
          value: { theme: 'dark', language: 'zh' },
          ttl: 86400000,
          tags: ['user', 'preferences'],
          size: 256,
          createdAt: Date.now() - 3600000,
          accessedAt: Date.now() - 60000,
          accessCount: 3
        }
      ];
      
      // 应用过滤器
      const filteredEntries = mockEntries.filter(entry => {
        if (filter.keyPattern && !entry.key.includes(filter.keyPattern)) return false;
        if (filter.tags.length > 0 && !filter.tags.some(tag => entry.tags.includes(tag))) return false;
        return true;
      });
      
      setCacheEntries(filteredEntries);
    } catch (error) {
      console.error('Failed to load cache entries:', error);
      message.error('加载缓存条目失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除缓存条目
  const deleteCacheEntry = async (key: string) => {
    try {
      await enhancedCacheManager.delete(key);
      message.success('删除成功');
      loadCacheEntries();
    } catch (error) {
      console.error('Failed to delete cache entry:', error);
      message.error('删除失败');
    }
  };

  // 清空所有缓存
  const clearAllCache = async () => {
    try {
      await enhancedCacheManager.clear();
      message.success('缓存已清空');
      loadCacheEntries();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      message.error('清空缓存失败');
    }
  };

  // 事件过滤
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      if (filter.eventType !== 'all' && event.type !== filter.eventType) return false;
      if (filter.keyPattern && !event.key.includes(filter.keyPattern)) return false;
      if (filter.source && !event.source?.includes(filter.source)) return false;
      if (filter.timeRange) {
        const eventTime = dayjs(event.timestamp);
        if (!eventTime.isBetween(filter.timeRange[0], filter.timeRange[1], null, '[]')) return false;
      }
      return true;
    });
  }, [allEvents, filter]);

  // 性能分析
  const runPerformanceAnalysis = async () => {
    setAnalyzing(true);
    try {
      const stats = enhancedCacheManager.getStats();
      const performanceMetrics = cacheEventSystem.getPerformanceMetrics();
      const realtimeStats = cacheEventSystem.getRealTimeStats(300000); // 最近5分钟
      
      const analysis = {
        overview: {
          hitRate: performanceMetrics.hitRate,
          avgResponseTime: performanceMetrics.avgResponseTime,
          totalOperations: stats.hits + stats.misses,
          errorRate: realtimeStats.recentErrors / Math.max(realtimeStats.recentOperations, 1) * 100
        },
        bottlenecks: [
          {
            type: 'Slow Response Time',
            severity: performanceMetrics.avgResponseTime > 500 ? 'high' : 'low',
            description: `平均响应时间: ${performanceMetrics.avgResponseTime}ms`,
            suggestion: '考虑优化数据获取逻辑或增加缓存时间'
          },
          {
            type: 'Low Hit Rate',
            severity: performanceMetrics.hitRate < 70 ? 'high' : 'low',
            description: `缓存命中率: ${performanceMetrics.hitRate.toFixed(1)}%`,
            suggestion: '检查缓存策略和TTL设置'
          },
          {
            type: 'Memory Usage',
            severity: stats.memoryUsageMB > 100 ? 'medium' : 'low',
            description: `内存使用: ${stats.memoryUsageMB}MB`,
            suggestion: '监控内存使用趋势，考虑设置内存限制'
          }
        ],
        hotKeys: performanceMetrics.hotKeys.slice(0, 10),
        recommendations: [
          '优化高频访问键的缓存策略',
          '考虑实现预加载机制',
          '定期清理过期和冷数据',
          '监控异常访问模式'
        ]
      };
      
      setPerformanceAnalysis(analysis);
    } catch (error) {
      console.error('Performance analysis failed:', error);
      message.error('性能分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  // 缓存操作测试
  const runCacheTest = async (values: any) => {
    try {
      const { operation, key, value, ttl } = values;
      let result;
      
      switch (operation) {
        case 'get':
          result = await enhancedCacheManager.get(key);
          break;
        case 'set':
          await enhancedCacheManager.set(key, JSON.parse(value), { ttl: ttl * 1000 });
          result = { success: true, message: '设置成功' };
          break;
        case 'delete':
          await enhancedCacheManager.delete(key);
          result = { success: true, message: '删除成功' };
          break;
        case 'has':
          result = await enhancedCacheManager.has(key);
          break;
        default:
          throw new Error('未知操作');
      }
      
      setTestResult({
        operation,
        key,
        result,
        timestamp: Date.now(),
        success: true
      });
      
      message.success('操作执行成功');
      if (operation === 'set' || operation === 'delete') {
        loadCacheEntries(); // 刷新缓存列表
      }
    } catch (error) {
      console.error('Cache operation failed:', error);
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      setTestResult({
        operation: values.operation,
        key: values.key,
        error: errorMessage,
        timestamp: Date.now(),
        success: false
      });
      message.error(errorMessage);
    }
  };

  // 初始化加载
  useEffect(() => {
    if (visible) {
      loadCacheEntries();
      
      // 设置自动刷新
      intervalRef.current = setInterval(loadCacheEntries, 10000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [visible, filter]);

  // 缓存浏览器标签页
  const CacheBrowser = () => {
    const columns = [
      {
        title: '缓存键',
        dataIndex: 'key',
        key: 'key',
        width: 300,
        render: (key: string) => (
          <Text code style={{ fontSize: '12px' }}>
            {key}
          </Text>
        ),
        sorter: (a: CacheEntry, b: CacheEntry) => a.key.localeCompare(b.key)
      },
      {
        title: '标签',
        dataIndex: 'tags',
        key: 'tags',
        width: 150,
        render: (tags: string[]) => (
          <Space wrap>
            {tags.map(tag => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        )
      },
      {
        title: '大小',
        dataIndex: 'size',
        key: 'size',
        width: 80,
        render: (size: number) => `${(size / 1024).toFixed(1)}KB`,
        sorter: (a: CacheEntry, b: CacheEntry) => a.size - b.size
      },
      {
        title: '访问次数',
        dataIndex: 'accessCount',
        key: 'accessCount',
        width: 100,
        sorter: (a: CacheEntry, b: CacheEntry) => a.accessCount - b.accessCount
      },
      {
        title: 'TTL',
        dataIndex: 'ttl',
        key: 'ttl',
        width: 100,
        render: (ttl: number) => {
          const seconds = Math.floor(ttl / 1000);
          if (seconds > 3600) return `${Math.floor(seconds / 3600)}h`;
          if (seconds > 60) return `${Math.floor(seconds / 60)}m`;
          return `${seconds}s`;
        }
      },
      {
        title: '最后访问',
        dataIndex: 'accessedAt',
        key: 'accessedAt',
        width: 120,
        render: (timestamp: number) => dayjs(timestamp).format('HH:mm:ss'),
        sorter: (a: CacheEntry, b: CacheEntry) => a.accessedAt - b.accessedAt
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_: any, record: CacheEntry) => (
          <Space>
            <Tooltip title="查看详情">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedEntry(record);
                  setEntryDetailVisible(true);
                }}
              />
            </Tooltip>
            <Popconfirm
              title="确定删除这个缓存条目吗？"
              onConfirm={() => deleteCacheEntry(record.key)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    ];

    return (
      <Card
        title="缓存浏览器"
        extra={
          <Space>
            <Input
              placeholder="搜索缓存键..."
              prefix={<SearchOutlined />}
              value={filter.keyPattern}
              onChange={(e) => setFilter(prev => ({ ...prev, keyPattern: e.target.value }))}
              style={{ width: 200 }}
            />
            <Button icon={<ReloadOutlined />} onClick={loadCacheEntries} loading={loading}>
              刷新
            </Button>
            <Popconfirm
              title="确定清空所有缓存吗？此操作不可恢复！"
              onConfirm={clearAllCache}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<ClearOutlined />}>
                清空缓存
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={cacheEntries}
          rowKey="key"
          loading={loading}
          size="small"
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 项`
          }}
          scroll={{ y: 400 }}
        />
      </Card>
    );
  };

  // 事件日志标签页
  const EventLogger = () => {
    const eventColumns = [
      {
        title: '时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 120,
        render: (timestamp: number) => dayjs(timestamp).format('HH:mm:ss.SSS')
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 80,
        render: (type: CacheEvent['type']) => {
          const colors = {
            hit: 'green',
            miss: 'orange', 
            set: 'blue',
            delete: 'red',
            invalidate: 'purple',
            cleanup: 'gray',
            get: 'cyan'
          };
          return <Tag color={colors[type]}>{type}</Tag>;
        }
      },
      {
        title: '键',
        dataIndex: 'key',
        key: 'key',
        render: (key: string) => (
          <Text code style={{ fontSize: '11px' }}>
            {key.length > 40 ? `${key.substring(0, 40)}...` : key}
          </Text>
        )
      },
      {
        title: '来源',
        dataIndex: 'source',
        key: 'source',
        width: 120
      },
      {
        title: '耗时',
        dataIndex: 'duration',
        key: 'duration',
        width: 80,
        render: (duration?: number) => {
          if (!duration) return '-';
          return (
            <Text style={{
              color: duration > 500 ? '#ff4d4f' : duration > 200 ? '#faad14' : '#52c41a'
            }}>
              {duration}ms
            </Text>
          );
        }
      },
      {
        title: '错误',
        dataIndex: 'error',
        key: 'error',
        width: 200,
        render: (error?: string) => error ? (
          <Text type="danger" style={{ fontSize: '11px' }}>
            {error.length > 30 ? `${error.substring(0, 30)}...` : error}
          </Text>
        ) : '-'
      }
    ];

    return (
      <Card
        title="事件日志"
        extra={
          <Space>
            <Select
              value={filter.eventType}
              onChange={(value) => setFilter(prev => ({ ...prev, eventType: value }))}
              style={{ width: 120 }}
            >
              <Option value="all">全部</Option>
              <Option value="hit">命中</Option>
              <Option value="miss">错过</Option>
              <Option value="set">设置</Option>
              <Option value="delete">删除</Option>
              <Option value="invalidate">失效</Option>
              <Option value="cleanup">清理</Option>
            </Select>
            <Input
              placeholder="过滤来源..."
              value={filter.source}
              onChange={(e) => setFilter(prev => ({ ...prev, source: e.target.value }))}
              style={{ width: 150 }}
            />
          </Space>
        }
      >
        <Table
          columns={eventColumns}
          dataSource={filteredEvents.slice(0, 500)} // 限制显示数量
          rowKey={(record) => `${record.timestamp}-${record.key}`}
          size="small"
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条事件`
          }}
          scroll={{ y: 400 }}
        />
      </Card>
    );
  };

  // 性能分析标签页
  const PerformanceAnalyzer = () => {
    if (!performanceAnalysis) {
      return (
        <Card title="性能分析">
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Button
              type="primary"
              size="large"
              icon={<ThunderboltOutlined />}
              onClick={runPerformanceAnalysis}
              loading={analyzing}
            >
              开始性能分析
            </Button>
          </div>
        </Card>
      );
    }

    const { overview, bottlenecks, hotKeys, recommendations } = performanceAnalysis;

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="性能概览">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={overview.hitRate}
                format={percent => `${percent}%`}
                strokeColor={overview.hitRate >= 70 ? '#52c41a' : '#ff4d4f'}
              />
              <div style={{ marginTop: '8px' }}>
                <Text strong>命中率</Text>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={Math.min((1000 - overview.avgResponseTime) / 10, 100)}
                format={() => `${overview.avgResponseTime}ms`}
                strokeColor={overview.avgResponseTime <= 200 ? '#52c41a' : '#faad14'}
              />
              <div style={{ marginTop: '8px' }}>
                <Text strong>响应时间</Text>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={Math.min((100 - overview.errorRate) * 10, 100)}
                format={() => `${overview.errorRate.toFixed(1)}%`}
                strokeColor={overview.errorRate <= 1 ? '#52c41a' : '#ff4d4f'}
              />
              <div style={{ marginTop: '8px' }}>
                <Text strong>错误率</Text>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={Math.min(overview.totalOperations / 10, 100)}
                format={() => overview.totalOperations}
                strokeColor="#1890ff"
              />
              <div style={{ marginTop: '8px' }}>
                <Text strong>总操作数</Text>
              </div>
            </div>
          </div>
        </Card>

        <Card title="性能瓶颈">
          <Timeline>
            {bottlenecks.map((bottleneck, index) => (
              <Timeline.Item
                key={index}
                color={bottleneck.severity === 'high' ? 'red' : bottleneck.severity === 'medium' ? 'orange' : 'green'}
                dot={bottleneck.severity === 'high' ? <WarningOutlined /> : <InfoCircleOutlined />}
              >
                <Text strong>{bottleneck.type}</Text>
                <br />
                <Text>{bottleneck.description}</Text>
                <br />
                <Text type="secondary">建议: {bottleneck.suggestion}</Text>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>

        <Card title="优化建议">
          <ul>
            {recommendations.map((rec, index) => (
              <li key={index}>
                <Text>{rec}</Text>
              </li>
            ))}
          </ul>
          <Button
            style={{ marginTop: '16px' }}
            onClick={runPerformanceAnalysis}
            loading={analyzing}
          >
            重新分析
          </Button>
        </Card>
      </Space>
    );
  };

  // 操作测试标签页
  const OperationTester = () => (
    <Card title="缓存操作测试">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <Form
            form={testForm}
            layout="vertical"
            onFinish={runCacheTest}
          >
            <Form.Item name="operation" label="操作类型" initialValue="get">
              <Select>
                <Option value="get">获取 (GET)</Option>
                <Option value="set">设置 (SET)</Option>
                <Option value="delete">删除 (DELETE)</Option>
                <Option value="has">检查存在 (HAS)</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="key"
              label="缓存键"
              rules={[{ required: true, message: '请输入缓存键' }]}
            >
              <Input placeholder="例如: task:1:123" />
            </Form.Item>
            
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.operation !== currentValues.operation
              }
            >
              {({ getFieldValue }) => {
                return getFieldValue('operation') === 'set' ? (
                  <>
                    <Form.Item
                      name="value"
                      label="值 (JSON格式)"
                      rules={[{ required: true, message: '请输入值' }]}
                    >
                      <TextArea
                        rows={4}
                        placeholder='{"id": 123, "title": "示例任务"}'
                      />
                    </Form.Item>
                    <Form.Item name="ttl" label="TTL (秒)" initialValue={300}>
                      <Input type="number" />
                    </Form.Item>
                  </>
                ) : null;
              }}
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />}>
                执行操作
              </Button>
            </Form.Item>
          </Form>
        </div>
        
        <div>
          <Title level={5}>执行结果</Title>
          {testResult ? (
            <Card size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="操作">
                  <Tag color={testResult.success ? 'green' : 'red'}>
                    {testResult.operation}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="键">
                  <Text code>{testResult.key}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="时间">
                  {dayjs(testResult.timestamp).format('HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="结果">
                  {testResult.success ? (
                    <pre style={{ fontSize: '12px', margin: 0 }}>
                      {JSON.stringify(testResult.result, null, 2)}
                    </pre>
                  ) : (
                    <Text type="danger">{testResult.error}</Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ) : (
            <Alert
              message="尚未执行任何操作"
              description="选择操作类型并填写参数后点击执行"
              type="info"
              showIcon
            />
          )}
        </div>
      </div>
    </Card>
  );

  // 条目详情模态框
  const EntryDetailModal = () => (
    <Modal
      title="缓存条目详情"
      open={entryDetailVisible}
      onCancel={() => setEntryDetailVisible(false)}
      footer={[
        <Button key="close" onClick={() => setEntryDetailVisible(false)}>
          关闭
        </Button>,
        <Popconfirm
          key="delete"
          title="确定删除这个缓存条目吗？"
          onConfirm={() => {
            if (selectedEntry) {
              deleteCacheEntry(selectedEntry.key);
              setEntryDetailVisible(false);
            }
          }}
        >
          <Button danger>删除</Button>
        </Popconfirm>
      ]}
      width={800}
    >
      {selectedEntry && (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="键" span={2}>
            <Text code>{selectedEntry.key}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="大小">
            {(selectedEntry.size / 1024).toFixed(1)} KB
          </Descriptions.Item>
          <Descriptions.Item label="访问次数">
            {selectedEntry.accessCount}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(selectedEntry.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="最后访问">
            {dayjs(selectedEntry.accessedAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="TTL">
            {Math.floor(selectedEntry.ttl / 1000)} 秒
          </Descriptions.Item>
          <Descriptions.Item label="标签">
            <Space wrap>
              {selectedEntry.tags.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="值" span={2}>
            <pre style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify(selectedEntry.value, null, 2)}
            </pre>
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );

  return (
    <Drawer
      title={
        <Space>
          <BugOutlined />
          缓存调试工具
        </Space>
      }
      placement="right"
      closable={true}
      onClose={onClose}
      open={visible}
      width={width}
      extra={
        <Button
          icon={<ExportOutlined />}
          onClick={() => {
            const debugData = {
              cacheEntries,
              recentEvents: filteredEvents.slice(0, 100),
              performanceAnalysis,
              timestamp: Date.now()
            };
            const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cache-debug-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          导出调试数据
        </Button>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="缓存浏览器" key="browser">
          <CacheBrowser />
        </TabPane>
        <TabPane tab="事件日志" key="events">
          <EventLogger />
        </TabPane>
        <TabPane tab="性能分析" key="performance">
          <PerformanceAnalyzer />
        </TabPane>
        <TabPane tab="操作测试" key="tester">
          <OperationTester />
        </TabPane>
      </Tabs>
      
      <EntryDetailModal />
    </Drawer>
  );
};

export default CacheDebugTools;