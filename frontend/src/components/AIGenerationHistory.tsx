import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  message,
  Tooltip,
  Input,
  Select,
  DatePicker,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Empty,
  Divider
} from 'antd';
import {
  HistoryOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  StarOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SaveOutlined,
  BookOutlined
} from '@ant-design/icons';
// Using any for table columns to avoid type conflicts
// import type { ColumnsType } from 'antd/lib/table';
import { TaskGenerationHistory, GeneratedSubTask } from '../types/aiTaskGenerator';
import { AIProvider, AI_PROVIDER_INFO } from '../types/ai';
import GeneratedTasksList from './GeneratedTasksList';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface AIGenerationHistoryProps {
  projectId?: number;
  onReuse?: (history: TaskGenerationHistory, tasks: GeneratedSubTask[]) => void;
  onSaveAsTemplate?: (history: TaskGenerationHistory, templateName: string) => void;
  className?: string;
}

interface GenerationTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string;
  complexity: 'simple' | 'detailed';
  maxTasks: number;
  createdAt: Date;
  usageCount: number;
  lastUsed?: Date;
  tags: string[];
  isPublic: boolean;
}

interface HistoryFilters {
  provider?: AIProvider;
  dateRange?: [Date, Date];
  minQuality?: number;
  success?: boolean;
  keyword?: string;
}

// 模拟历史数据存储
class HistoryStorage {
  private static STORAGE_KEY = 'ai_generation_history';
  private static TEMPLATE_KEY = 'ai_generation_templates';

  static getHistory(): TaskGenerationHistory[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    } catch (error) {
      console.error('读取历史记录失败:', error);
      return [];
    }
  }

  static saveHistory(history: TaskGenerationHistory[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }

  static addHistory(history: TaskGenerationHistory): void {
    const existing = this.getHistory();
    existing.unshift(history); // 最新的在前面
    
    // 保持最多100条记录
    if (existing.length > 100) {
      existing.splice(100);
    }
    
    this.saveHistory(existing);
  }

  static deleteHistory(id: string): void {
    const existing = this.getHistory();
    const filtered = existing.filter(item => item.id !== id);
    this.saveHistory(filtered);
  }

  static clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static getTemplates(): GenerationTemplate[] {
    try {
      const data = localStorage.getItem(this.TEMPLATE_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return parsed.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        lastUsed: item.lastUsed ? new Date(item.lastUsed) : undefined
      }));
    } catch (error) {
      console.error('读取模板失败:', error);
      return [];
    }
  }

  static saveTemplate(template: GenerationTemplate): void {
    const existing = this.getTemplates();
    const index = existing.findIndex(t => t.id === template.id);
    
    if (index >= 0) {
      existing[index] = template;
    } else {
      existing.unshift(template);
    }
    
    try {
      localStorage.setItem(this.TEMPLATE_KEY, JSON.stringify(existing));
    } catch (error) {
      console.error('保存模板失败:', error);
    }
  }

  static deleteTemplate(id: string): void {
    const existing = this.getTemplates();
    const filtered = existing.filter(item => item.id !== id);
    
    try {
      localStorage.setItem(this.TEMPLATE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('删除模板失败:', error);
    }
  }
}

const AIGenerationHistory: React.FC<AIGenerationHistoryProps> = ({
  projectId,
  onReuse,
  onSaveAsTemplate,
  className = ''
}) => {
  const [history, setHistory] = useState<TaskGenerationHistory[]>([]);
  const [templates, setTemplates] = useState<GenerationTemplate[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<TaskGenerationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [activeTab, setActiveTab] = useState<'history' | 'templates'>('history');
  
  // 详情模态框
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<TaskGenerationHistory | null>(null);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedSubTask[]>([]);
  
  // 模板保存模态框
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateTags, setTemplateTags] = useState<string[]>([]);
  const [templateIsPublic, setTemplateIsPublic] = useState(false);

  // 加载数据
  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const historyData = HistoryStorage.getHistory();
      const templatesData = HistoryStorage.getTemplates();
      
      // 如果指定了项目ID，只显示该项目的记录
      const filteredHistoryData = projectId 
        ? historyData.filter(item => item.parentTaskId === projectId)
        : historyData;
      
      setHistory(filteredHistoryData);
      setTemplates(templatesData);
      setFilteredHistory(filteredHistoryData);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 应用过滤器
  const applyFilters = useCallback(() => {
    let filtered = [...history];

    if (filters.provider) {
      filtered = filtered.filter(item => item.usedProvider === filters.provider);
    }

    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      filtered = filtered.filter(item => 
        item.timestamp >= start && item.timestamp <= end
      );
    }

    if (filters.minQuality !== undefined) {
      filtered = filtered.filter(item => item.quality >= filters.minQuality!);
    }

    if (filters.success !== undefined) {
      filtered = filtered.filter(item => item.success === filters.success);
    }

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter(item =>
        item.keywords.toLowerCase().includes(keyword) ||
        item.parentTaskTitle.toLowerCase().includes(keyword)
      );
    }

    setFilteredHistory(filtered);
  }, [history, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // 查看详情
  const handleViewDetail = (record: TaskGenerationHistory) => {
    setSelectedHistory(record);
    
    // 模拟获取生成的任务（实际应该从API获取）
    const mockTasks: GeneratedSubTask[] = Array.from({ length: record.generatedCount }, (_, i) => ({
      title: `任务 ${i + 1}`,
      description: `基于"${record.keywords}"生成的第${i + 1}个子任务`,
      priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
      estimatedHours: Math.floor(Math.random() * 8) + 1,
      status: 'todo' as const,
      custom_fields: {
        tags: ['AI生成', record.usedProvider],
        ai_generated: true,
        generation_id: record.id,
        confidence_score: 75 + Math.floor(Math.random() * 20)
      }
    }));
    
    setGeneratedTasks(mockTasks);
    setDetailModalVisible(true);
  };

  // 复用历史记录
  const handleReuse = (record: TaskGenerationHistory) => {
    if (onReuse) {
      onReuse(record, generatedTasks);
      message.success('已复用历史生成配置');
    }
  };

  // 保存为模板
  const handleSaveAsTemplate = (record: TaskGenerationHistory) => {
    setSelectedHistory(record);
    setTemplateName(`模板_${record.parentTaskTitle}_${new Date().toLocaleDateString()}`);
    setTemplateDescription(`基于"${record.keywords}"的任务生成模板`);
    setTemplateModalVisible(true);
  };

  // 确认保存模板
  const confirmSaveTemplate = () => {
    if (!selectedHistory || !templateName.trim()) {
      message.warning('请输入模板名称');
      return;
    }

    const template: GenerationTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: templateName.trim(),
      description: templateDescription.trim(),
      keywords: selectedHistory.keywords,
      complexity: 'detailed', // 默认复杂度
      maxTasks: selectedHistory.generatedCount,
      createdAt: new Date(),
      usageCount: 0,
      tags: templateTags,
      isPublic: templateIsPublic
    };

    HistoryStorage.saveTemplate(template);
    setTemplates(prev => [template, ...prev]);
    
    if (onSaveAsTemplate) {
      onSaveAsTemplate(selectedHistory, templateName);
    }

    message.success('模板保存成功');
    setTemplateModalVisible(false);
    resetTemplateForm();
  };

  // 重置模板表单
  const resetTemplateForm = () => {
    setTemplateName('');
    setTemplateDescription('');
    setTemplateTags([]);
    setTemplateIsPublic(false);
  };

  // 删除历史记录
  const handleDeleteHistory = (id: string) => {
    HistoryStorage.deleteHistory(id);
    setHistory(prev => prev.filter(item => item.id !== id));
    message.success('历史记录已删除');
  };

  // 删除模板
  const handleDeleteTemplate = (id: string) => {
    HistoryStorage.deleteTemplate(id);
    setTemplates(prev => prev.filter(item => item.id !== id));
    message.success('模板已删除');
  };

  // 导出历史记录
  const handleExportHistory = () => {
    try {
      const dataStr = JSON.stringify(filteredHistory, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `ai_generation_history_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      message.success('历史记录导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  // 历史记录表格列定义
  const historyColumns: any[] = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (timestamp: Date) => (
        <div>
          <div>{timestamp.toLocaleDateString()}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {timestamp.toLocaleTimeString()}
          </Text>
        </div>
      ),
      sorter: (a: TaskGenerationHistory, b: TaskGenerationHistory) => a.timestamp.getTime() - b.timestamp.getTime(),
      defaultSortOrder: 'descend'
    },
    {
      title: '父任务',
      dataIndex: 'parentTaskTitle',
      key: 'parentTaskTitle',
      ellipsis: true,
      render: (title: string) => (
        <Tooltip title={title}>
          <Text strong>{title}</Text>
        </Tooltip>
      )
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      key: 'keywords',
      ellipsis: true,
      render: (keywords: string) => (
        <Tooltip title={keywords}>
          <Text type="secondary">{keywords}</Text>
        </Tooltip>
      )
    },
    {
      title: 'AI提供商',
      dataIndex: 'usedProvider',
      key: 'usedProvider',
      width: 120,
      render: (provider: AIProvider) => {
        const colorMap: Record<AIProvider, string> = {
          openai: 'green',
          claude: 'blue',
          deepseek: 'purple'
        };
        return (
          <Tag color={colorMap[provider] || 'default'}>
            {AI_PROVIDER_INFO[provider]?.name || provider}
          </Tag>
        );
      },
      filters: [
        { text: 'DeepSeek', value: 'deepseek' },
        { text: 'Claude', value: 'claude' },
        { text: 'OpenAI', value: 'openai' }
      ],
      onFilter: (value: string | number | boolean, record: TaskGenerationHistory) => record.usedProvider === value
    },
    {
      title: '生成结果',
      key: 'result',
      width: 150,
      render: (_: any, record: TaskGenerationHistory) => (
        <Space direction="vertical" size={0}>
          <div>
            <Text strong>{record.generatedCount}</Text>
            <Text type="secondary"> 个任务</Text>
          </div>
          <div>
            <Text strong style={{ color: record.quality >= 80 ? '#52c41a' : record.quality >= 60 ? '#faad14' : '#ff4d4f' }}>
              {record.quality}分
            </Text>
            <Text type="secondary"> 质量</Text>
          </div>
        </Space>
      )
    },
    {
      title: '成本',
      key: 'cost',
      width: 100,
      render: (_: any, record: TaskGenerationHistory) => (
        <Space direction="vertical" size={0}>
          <div>
            <Text strong>¥{record.cost.toFixed(4)}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.tokensUsed}T
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (success: boolean) => (
        <Tag color={success ? 'success' : 'error'}>
          {success ? '成功' : '失败'}
        </Tag>
      ),
      filters: [
        { text: '成功', value: true },
        { text: '失败', value: false }
      ],
      onFilter: (value: string | number | boolean, record: TaskGenerationHistory) => record.success === value
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: TaskGenerationHistory) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {record.success && (
            <>
              <Tooltip title="复用配置">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleReuse(record)}
                />
              </Tooltip>
              <Tooltip title="保存为模板">
                <Button
                  type="text"
                  size="small"
                  icon={<BookOutlined />}
                  onClick={() => handleSaveAsTemplate(record)}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="删除">
            <Popconfirm
              title="确定删除这条历史记录吗？"
              onConfirm={() => handleDeleteHistory(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // 模板表格列定义
  const templateColumns: any[] = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: GenerationTemplate) => (
        <div>
          <Text strong>{name}</Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      key: 'keywords',
      ellipsis: true
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space wrap>
          {tags.map(tag => (
            <Tag key={tag} color="blue">{tag}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
      render: (count: number) => (
        <Text strong>{count}</Text>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: Date) => date.toLocaleDateString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: GenerationTemplate) => (
        <Space size="small">
          <Tooltip title="使用模板">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                // TODO: 实现模板使用逻辑
                message.info('模板使用功能待实现');
              }}
            />
          </Tooltip>
          <Tooltip title="删除模板">
            <Popconfirm
              title="确定删除这个模板吗？"
              onConfirm={() => handleDeleteTemplate(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // 统计数据
  const stats = React.useMemo(() => {
    const totalGenerations = history.length;
    const successfulGenerations = history.filter(h => h.success).length;
    const totalTasks = history.reduce((sum, h) => sum + h.generatedCount, 0);
    const totalCost = history.reduce((sum, h) => sum + h.cost, 0);
    const avgQuality = history.length > 0 ? 
      history.reduce((sum, h) => sum + h.quality, 0) / history.length : 0;

    return {
      totalGenerations,
      successfulGenerations,
      successRate: totalGenerations > 0 ? (successfulGenerations / totalGenerations * 100) : 0,
      totalTasks,
      totalCost,
      avgQuality
    };
  }, [history]);

  return (
    <div className={className}>
      {/* 统计面板 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Statistic
              title="总生成次数"
              value={stats.totalGenerations}
              prefix={<HistoryOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="成功率"
              value={stats.successRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: stats.successRate >= 80 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="生成任务数"
              value={stats.totalTasks}
              prefix={<BookOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="平均质量"
              value={stats.avgQuality}
              precision={1}
              suffix="分"
              valueStyle={{ color: stats.avgQuality >= 80 ? '#3f8600' : '#faad14' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="总成本"
              value={stats.totalCost}
              precision={4}
              prefix="¥"
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="模板数量"
              value={templates.length}
              prefix={<StarOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 标签页和工具栏 */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type={activeTab === 'history' ? 'primary' : 'default'}
              onClick={() => setActiveTab('history')}
            >
              生成历史 ({history.length})
            </Button>
            <Button
              type={activeTab === 'templates' ? 'primary' : 'default'}
              onClick={() => setActiveTab('templates')}
            >
              保存的模板 ({templates.length})
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              刷新
            </Button>
            {activeTab === 'history' && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportHistory}
                disabled={filteredHistory.length === 0}
              >
                导出记录
              </Button>
            )}
          </Space>

          {/* 过滤器 */}
          {activeTab === 'history' && (
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Search
                    placeholder="搜索关键词或任务名称"
                    value={filters.keyword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                    onSearch={() => applyFilters()}
                    allowClear
                  />
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="AI提供商"
                    value={filters.provider}
                    onChange={(value: AIProvider) => setFilters(prev => ({ ...prev, provider: value }))}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="deepseek">DeepSeek</Option>
                    <Option value="claude">Claude</Option>
                    <Option value="openai">OpenAI</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="生成状态"
                    value={filters.success}
                    onChange={(value: boolean) => setFilters(prev => ({ ...prev, success: value }))}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value={true}>成功</Option>
                    <Option value={false}>失败</Option>
                  </Select>
                </Col>
                <Col span={6}>
                  <RangePicker
                    placeholder={['开始日期', '结束日期']}
                    value={filters.dateRange ? [
                      filters.dateRange[0] as any,
                      filters.dateRange[1] as any
                    ] : null}
                    onChange={(dates: any) => {
                      if (dates && dates[0] && dates[1]) {
                        setFilters(prev => ({ 
                          ...prev, 
                          dateRange: [dates[0]!.toDate(), dates[1]!.toDate()] 
                        }));
                      } else {
                        setFilters(prev => ({ ...prev, dateRange: undefined }));
                      }
                    }}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={4}>
                  <Button type="primary" onClick={applyFilters}>
                    应用过滤
                  </Button>
                </Col>
              </Row>
            </div>
          )}
        </div>

        {/* 表格内容 */}
        {activeTab === 'history' ? (
          filteredHistory.length === 0 ? (
            <Empty
              description="暂无生成历史记录"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              columns={historyColumns}
              dataSource={filteredHistory}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total: number, range: [number, number]) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
              }}
              scroll={{ x: 1200 }}
            />
          )
        ) : (
          templates.length === 0 ? (
            <Empty
              description="暂无保存的模板"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              columns={templateColumns}
              dataSource={templates}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total: number, range: [number, number]) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条模板`
              }}
            />
          )
        )}
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            生成详情
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          selectedHistory?.success && (
            <Button
              key="reuse"
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => {
                if (selectedHistory) {
                  handleReuse(selectedHistory);
                  setDetailModalVisible(false);
                }
              }}
            >
              复用此配置
            </Button>
          )
        ].filter(Boolean)}
        width={800}
      >
        {selectedHistory && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Text strong>父任务：</Text>
                <div style={{ marginTop: 4 }}>
                  <Text>{selectedHistory.parentTaskTitle}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text strong>生成时间：</Text>
                <div style={{ marginTop: 4 }}>
                  <Text>{selectedHistory.timestamp.toLocaleString()}</Text>
                </div>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Text strong>关键词描述：</Text>
                <div style={{ marginTop: 4, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                  <Text>{selectedHistory.keywords}</Text>
                </div>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Text strong>AI提供商：</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color={
                    selectedHistory.usedProvider === 'openai' ? 'green' :
                    selectedHistory.usedProvider === 'claude' ? 'blue' :
                    selectedHistory.usedProvider === 'deepseek' ? 'purple' : 'default'
                  }>
                    {AI_PROVIDER_INFO[selectedHistory.usedProvider]?.name}
                  </Tag>
                </div>
              </Col>
              <Col span={6}>
                <Text strong>使用模型：</Text>
                <div style={{ marginTop: 4 }}>
                  <Text>{selectedHistory.usedModel}</Text>
                </div>
              </Col>
              <Col span={6}>
                <Text strong>质量评分：</Text>
                <div style={{ marginTop: 4 }}>
                  <Text strong style={{ color: selectedHistory.quality >= 80 ? '#52c41a' : selectedHistory.quality >= 60 ? '#faad14' : '#ff4d4f' }}>
                    {selectedHistory.quality}分
                  </Text>
                </div>
              </Col>
              <Col span={6}>
                <Text strong>生成成本：</Text>
                <div style={{ marginTop: 4 }}>
                  <Text>¥{selectedHistory.cost.toFixed(4)}</Text>
                </div>
              </Col>
            </Row>

            {selectedHistory.errorMessage && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>错误信息：</Text>
                <div style={{ marginTop: 4, padding: 8, background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4 }}>
                  <Text type="danger">{selectedHistory.errorMessage}</Text>
                </div>
              </div>
            )}

            <Divider />

            <div>
              <Text strong>生成的任务列表：</Text>
              <div style={{ marginTop: 8 }}>
                <GeneratedTasksList
                  tasks={generatedTasks}
                  editable={false}
                  showImportButton={false}
                  showRegenerateButton={false}
                  maxHeight={300}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 保存模板模态框 */}
      <Modal
        title={
          <Space>
            <SaveOutlined />
            保存为模板
          </Space>
        }
        open={templateModalVisible}
        onOk={confirmSaveTemplate}
        onCancel={() => {
          setTemplateModalVisible(false);
          resetTemplateForm();
        }}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>模板名称：</Text>
            <Input
              value={templateName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateName(e.target.value)}
              placeholder="请输入模板名称"
              style={{ marginTop: 4 }}
            />
          </div>
          
          <div>
            <Text strong>模板描述：</Text>
            <Input.TextArea
              value={templateDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTemplateDescription(e.target.value)}
              placeholder="请输入模板描述（可选）"
              rows={3}
              style={{ marginTop: 4 }}
            />
          </div>

          <div>
            <Text strong>标签：</Text>
            <Select
              mode="tags"
              value={templateTags}
              onChange={setTemplateTags}
              placeholder="添加标签（回车确认）"
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          {selectedHistory && (
            <div style={{ padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              <Text strong>基础信息：</Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">父任务：{selectedHistory.parentTaskTitle}</Text>
              </div>
              <div>
                <Text type="secondary">关键词：{selectedHistory.keywords}</Text>
              </div>
              <div>
                <Text type="secondary">生成任务数：{selectedHistory.generatedCount}</Text>
              </div>
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default AIGenerationHistory;