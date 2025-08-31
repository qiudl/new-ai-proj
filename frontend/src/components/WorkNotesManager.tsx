import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Space,
  Tooltip,
  Card,
  Empty,
  Spin,
  Typography,
  Checkbox,
  Dropdown,
  Menu,
  Row,
  Col,
  Statistic,
  Badge,
  Divider,
  Radio
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  SearchOutlined,
  FileMarkdownOutlined,
  StarOutlined,
  StarFilled,
  SwapOutlined,
  DownOutlined,
  ExportOutlined,
  ReloadOutlined,
  SettingOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  TableOutlined,
  AppstoreOutlined,
  BarsOutlined
} from '@ant-design/icons';
import { workNotesService, WorkNote, CreateWorkNoteRequest, UpdateWorkNoteRequest } from '../services/workNotesService';
import WorkNoteConversionModal from './conversion/WorkNoteConversionModal';
import BatchWorkNoteConversionModal from './conversion/BatchWorkNoteConversionModal';

const { Text, Paragraph, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface WorkNotesManagerProps {
  selectedFolderId?: number | null;
  onDocumentSelect?: (doc: WorkNote) => void;
}

// 状态统计接口
interface StatusStats {
  draft: number;
  published: number;
  archived: number;
  template: number;
}

const WorkNotesManager: React.FC<WorkNotesManagerProps> = ({
  selectedFolderId,
  onDocumentSelect
}) => {
  const [workNotes, setWorkNotes] = useState<WorkNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [conversionModalVisible, setConversionModalVisible] = useState(false);
  const [batchConversionModalVisible, setBatchConversionModalVisible] = useState(false);
  const [currentWorkNote, setCurrentWorkNote] = useState<WorkNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [selectedWorkNotes, setSelectedWorkNotes] = useState<WorkNote[]>([]);
  
  // 新增状态管理
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [statusStats, setStatusStats] = useState<StatusStats>({
    draft: 0,
    published: 0,
    archived: 0,
    template: 0
  });

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 检查是否是ID搜索
  const isIdSearch = (query: string): boolean => {
    return query.startsWith('#') && /^#\d+$/.test(query);
  };

  // 通过ID搜索工作笔记
  const searchById = async (id: number): Promise<WorkNote[]> => {
    try {
      const workNote = await workNotesService.getWorkNote(id);
      return [workNote];
    } catch (error) {
      console.warn(`Work note with ID ${id} not found:`, error);
      return [];
    }
  };

  // 计算状态统计
  const calculateStats = (notes: WorkNote[]): StatusStats => {
    return notes.reduce((stats, note) => {
      if (note.is_template) {
        stats.template += 1;
      } else {
        switch (note.status) {
          case 'draft':
            stats.draft += 1;
            break;
          case 'published':
            stats.published += 1;
            break;
          case 'archived':
            stats.archived += 1;
            break;
          default:
            break;
        }
      }
      return stats;
    }, { draft: 0, published: 0, archived: 0, template: 0 });
  };

  // 过滤和排序数据
  const getFilteredAndSortedData = (notes: WorkNote[]): WorkNote[] => {
    let filtered = [...notes];

    // 状态过滤
    if (statusFilter !== 'all') {
      if (statusFilter === 'template') {
        filtered = filtered.filter(note => note.is_template);
      } else {
        filtered = filtered.filter(note => !note.is_template && note.status === statusFilter);
      }
    }

    // 类型过滤
    if (typeFilter !== 'all') {
      filtered = filtered.filter(note => note.type === typeFilter);
    }

    // 可见性过滤
    if (visibilityFilter !== 'all') {
      filtered = filtered.filter(note => note.visibility === visibilityFilter);
    }

    // 排序
    filtered.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortField) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'title':
          valueA = a.title.toLowerCase();
          valueB = b.title.toLowerCase();
          break;
        case 'status':
          valueA = a.is_template ? 'template' : a.status;
          valueB = b.is_template ? 'template' : b.status;
          break;
        case 'created_at':
          valueA = new Date(a.created_at);
          valueB = new Date(b.created_at);
          break;
        case 'updated_at':
        default:
          valueA = new Date(a.updated_at);
          valueB = new Date(b.updated_at);
          break;
      }

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });

    return filtered;
  };

  // 加载工作笔记
  const loadWorkNotes = async () => {
    try {
      setLoading(true);
      let data;
      
      if (searchQuery) {
        let results: WorkNote[] = [];
        
        if (isIdSearch(searchQuery)) {
          // ID搜索 (格式: #123)
          const id = parseInt(searchQuery.substring(1));
          if (!isNaN(id)) {
            results = await searchById(id);
          }
        } else {
          // 常规搜索
          results = await workNotesService.searchWorkNotes(searchQuery);
        }
        
        data = { documents: results, total: results.length, page: 1, page_size: 50 };
      } else {
        data = await workNotesService.listWorkNotes(selectedFolderId || undefined);
      }
      
      setWorkNotes(data.documents);
      setStatusStats(calculateStats(data.documents));
    } catch (error) {
      console.error('Failed to load work notes:', error);
      message.error('加载工作笔记失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkNotes();
  }, [selectedFolderId, searchQuery]);

  // 搜索处理
  const handleSearch = () => {
    loadWorkNotes();
  };

  // 重置过滤器
  const resetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setVisibilityFilter('all');
    setSearchQuery('');
    setSortField('updated_at');
    setSortOrder('desc');
  };

  // 创建工作笔记
  const handleCreate = async (values: any) => {
    try {
      const createRequest: CreateWorkNoteRequest = {
        ...values,
        type: values.type || 'markdown',
        status: values.status || 'draft',
        visibility: values.visibility || 'private',
        is_template: false,
      };

      await workNotesService.createWorkNote(createRequest);
      message.success('工作笔记创建成功');
      setModalVisible(false);
      form.resetFields();
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to create work note:', error);
      message.error('创建失败');
    }
  };

  // 更新工作笔记
  const handleUpdate = async (values: any) => {
    try {
      if (!currentWorkNote) return;

      const updateRequest: UpdateWorkNoteRequest = {
        ...values,
      };

      await workNotesService.updateWorkNote(currentWorkNote.id, updateRequest);
      message.success('工作笔记更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      setCurrentWorkNote(null);
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to update work note:', error);
      message.error('更新失败');
    }
  };

  // 删除工作笔记
  const handleDelete = async (id: number) => {
    try {
      await workNotesService.deleteWorkNote(id);
      message.success('工作笔记删除成功');
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to delete work note:', error);
      message.error('删除失败');
    }
  };

  // 复制工作笔记
  const handleCopy = async (id: number) => {
    try {
      await workNotesService.copyWorkNote(id);
      message.success('工作笔记复制成功');
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to copy work note:', error);
      message.error('复制失败');
    }
  };

  // 切换模板状态
  const handleToggleTemplate = async (id: number) => {
    try {
      await workNotesService.toggleTemplate(id);
      message.success('模板状态更新成功');
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to toggle template:', error);
      message.error('更新失败');
    }
  };

  // 查看工作笔记
  const handleView = (workNote: WorkNote) => {
    setCurrentWorkNote(workNote);
    setViewModalVisible(true);
    if (onDocumentSelect) {
      onDocumentSelect(workNote);
    }
  };

  // 打开编辑对话框
  const openEditModal = (workNote: WorkNote) => {
    setCurrentWorkNote(workNote);
    editForm.setFieldsValue({
      title: workNote.title,
      description: workNote.description,
      content: workNote.content,
      type: workNote.type,
      status: workNote.status,
      visibility: workNote.visibility,
      tags: workNote.tags,
    });
    setEditModalVisible(true);
  };

  // 打开转换对话框
  const openConversionModal = (workNote: WorkNote) => {
    setCurrentWorkNote(workNote);
    setConversionModalVisible(true);
  };

  // 转换成功回调
  const handleConversionSuccess = (result: any) => {
    message.success('转换成功！任务文档已创建');
    setConversionModalVisible(false);
    loadWorkNotes();
  };

  // 处理行选择
  const handleRowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[], selectedRows: WorkNote[]) => {
      setSelectedRowKeys(selectedRowKeys as number[]);
      setSelectedWorkNotes(selectedRows);
    },
  };

  // 批量操作菜单
  const batchActionsMenu = (
    <Menu>
      <Menu.Item 
        key="batchConvert"
        icon={<SwapOutlined />}
        onClick={() => setBatchConversionModalVisible(true)}
        disabled={selectedRowKeys.length === 0}
      >
        批量转换为任务文档
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="batchExport"
        icon={<ExportOutlined />}
        disabled={selectedRowKeys.length === 0}
      >
        批量导出
      </Menu.Item>
      <Menu.Item 
        key="batchTemplate"
        icon={<StarOutlined />}
        disabled={selectedRowKeys.length === 0}
      >
        批量设为模板
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="batchDelete"
        icon={<DeleteOutlined />}
        disabled={selectedRowKeys.length === 0}
        onClick={() => {
          Modal.confirm({
            title: '确认批量删除',
            content: `确定要删除选中的 ${selectedRowKeys.length} 个工作笔记吗？此操作不可撤销。`,
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
              try {
                for (const id of selectedRowKeys) {
                  await workNotesService.deleteWorkNote(id);
                }
                message.success(`成功删除 ${selectedRowKeys.length} 个工作笔记`);
                setSelectedRowKeys([]);
                setSelectedWorkNotes([]);
                loadWorkNotes();
              } catch (error) {
                message.error('批量删除失败');
              }
            }
          });
        }}
      >
        批量删除
      </Menu.Item>
    </Menu>
  );

  // 排序菜单
  const sortMenu = (
    <Menu>
      <Menu.Item 
        key="id-asc" 
        icon={<SortAscendingOutlined />}
        onClick={() => { setSortField('id'); setSortOrder('asc'); }}
      >
        ID 升序
      </Menu.Item>
      <Menu.Item 
        key="id-desc" 
        icon={<SortDescendingOutlined />}
        onClick={() => { setSortField('id'); setSortOrder('desc'); }}
      >
        ID 降序
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="title-asc" 
        onClick={() => { setSortField('title'); setSortOrder('asc'); }}
      >
        标题 A-Z
      </Menu.Item>
      <Menu.Item 
        key="title-desc" 
        onClick={() => { setSortField('title'); setSortOrder('desc'); }}
      >
        标题 Z-A
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="created-desc" 
        onClick={() => { setSortField('created_at'); setSortOrder('desc'); }}
      >
        创建时间 (新→旧)
      </Menu.Item>
      <Menu.Item 
        key="created-asc" 
        onClick={() => { setSortField('created_at'); setSortOrder('asc'); }}
      >
        创建时间 (旧→新)
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="updated-desc" 
        onClick={() => { setSortField('updated_at'); setSortOrder('desc'); }}
      >
        更新时间 (新→旧)
      </Menu.Item>
      <Menu.Item 
        key="updated-asc" 
        onClick={() => { setSortField('updated_at'); setSortOrder('asc'); }}
      >
        更新时间 (旧→新)
      </Menu.Item>
    </Menu>
  );

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'green';
      case 'draft': return 'orange';
      case 'archived': return 'red';
      case 'template': return 'purple';
      default: return 'default';
    }
  };

  // 获取可见性颜色
  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'green';
      case 'team': return 'blue';
      case 'private': return 'red';
      default: return 'default';
    }
  };

  // 过滤后的数据
  const filteredData = getFilteredAndSortedData(workNotes);

  // 表格列定义
  const columns: ColumnsType<WorkNote> = [
    {
      title: (
        <Space>
          <Text strong>ID</Text>
          <Tooltip title="工作笔记唯一标识符">
            <Text type="secondary" style={{ fontSize: '12px' }}>(?)</Text>
          </Tooltip>
        </Space>
      ),
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: true,
      sortDirections: ['ascend' as const, 'descend' as const],
      render: (id: number) => (
        <Text style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1890ff' }}>
          #{id}
        </Text>
      ),
    },
    {
      title: (
        <Space>
          <Text strong>标题</Text>
          <Badge count={filteredData.length} showZero style={{ backgroundColor: '#52c41a' }} />
        </Space>
      ),
      dataIndex: 'title',
      key: 'title',
      ellipsis: { showTitle: true },
      sorter: true,
      sortDirections: ['ascend' as const, 'descend' as const],
      render: (text: string, record: WorkNote) => (
        <Space>
          <Button
            type="link"
            onClick={() => handleView(record)}
            style={{ padding: 0, fontWeight: 500 }}
          >
            {text}
          </Button>
          {record.is_template && (
            <Tooltip title="模板文档">
              <StarFilled style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: (
        <Space>
          <Text strong>状态</Text>
          <Tooltip title="文档当前状态">
            <Text type="secondary" style={{ fontSize: '12px' }}>(?)</Text>
          </Tooltip>
        </Space>
      ),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      sorter: true,
      render: (status: string, record: WorkNote) => {
        const displayStatus = record.is_template ? 'template' : status;
        const displayText = record.is_template ? '模板' :
                           status === 'published' ? '已发布' :
                           status === 'draft' ? '草稿' :
                           status === 'archived' ? '已归档' : status;
        
        return (
          <Tag color={getStatusColor(displayStatus)} style={{ fontWeight: 500 }}>
            {displayText}
          </Tag>
        );
      },
    },
    {
      title: (
        <Space>
          <Text strong>类型</Text>
        </Space>
      ),
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag style={{ fontWeight: 500 }}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: (
        <Space>
          <Text strong>可见性</Text>
        </Space>
      ),
      dataIndex: 'visibility',
      key: 'visibility',
      width: 100,
      render: (visibility: string) => {
        const displayText = visibility === 'public' ? '公开' :
                           visibility === 'team' ? '团队' :
                           visibility === 'private' ? '私有' : visibility;
        
        return (
          <Tag color={getVisibilityColor(visibility)} style={{ fontWeight: 500 }}>
            {displayText}
          </Tag>
        );
      },
    },
    {
      title: (
        <Space>
          <Text strong>标签</Text>
        </Space>
      ),
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) =>
        tags?.slice(0, 3).map(tag => (
          <Tag key={tag} style={{ fontSize: '11px' }}>{tag}</Tag>
        )).concat(
          tags?.length > 3 ? [
            <Tooltip key="more" title={tags.slice(3).join(', ')}>
              <Tag style={{ fontSize: '11px' }}>+{tags.length - 3}</Tag>
            </Tooltip>
          ] : []
        ),
    },
    {
      title: (
        <Space>
          <Text strong>更新时间</Text>
          <Tooltip title="最后修改时间">
            <Text type="secondary" style={{ fontSize: '12px' }}>(?)</Text>
          </Tooltip>
        </Space>
      ),
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      sorter: true,
      sortDirections: ['ascend' as const, 'descend' as const],
      render: (date: string) => (
        <Text style={{ fontSize: '12px', color: '#666' }}>
          {new Date(date).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      ),
    },
    {
      title: (
        <Space>
          <Text strong>操作</Text>
        </Space>
      ),
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, record: WorkNote) => (
        <Space size="small" wrap>
          <Tooltip title="查看详情">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="编辑内容">
            <Button
              icon={<EditOutlined />}
              size="small"
              type="primary"
              ghost
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="转换为任务文档">
            <Button
              icon={<SwapOutlined />}
              size="small"
              type="primary"
              onClick={() => openConversionModal(record)}
            />
          </Tooltip>
          <Tooltip title="复制副本">
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={() => handleCopy(record.id)}
            />
          </Tooltip>
          <Tooltip title={record.is_template ? "取消模板" : "设为模板"}>
            <Button
              icon={record.is_template ? <StarFilled /> : <StarOutlined />}
              size="small"
              type={record.is_template ? "primary" : "default"}
              ghost={record.is_template}
              onClick={() => handleToggleTemplate(record.id)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个工作笔记吗？此操作不可撤销。"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            okType="danger"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                icon={<DeleteOutlined />}
                size="small"
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: '#f0f2f5', padding: '24px', minHeight: '100vh' }}>
      {/* 页面标题和统计 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={12}>
            <Space align="center">
              <FileMarkdownOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <Title level={3} style={{ margin: 0 }}>
                工作笔记管理
                {selectedFolderId && (
                  <Text type="secondary" style={{ fontSize: '16px', marginLeft: 8 }}>
                    - 文件夹 {selectedFolderId}
                  </Text>
                )}
              </Title>
            </Space>
          </Col>
          <Col span={12}>
            <Row gutter={16} justify="end">
              <Col>
                <Statistic
                  title="草稿"
                  value={statusStats.draft}
                  valueStyle={{ color: '#fa8c16', fontSize: '16px' }}
                  suffix={<Tag color="orange" style={{ marginLeft: 4, fontSize: '10px' }}>DRAFT</Tag>}
                />
              </Col>
              <Col>
                <Statistic
                  title="已发布"
                  value={statusStats.published}
                  valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                  suffix={<Tag color="green" style={{ marginLeft: 4, fontSize: '10px' }}>PUB</Tag>}
                />
              </Col>
              <Col>
                <Statistic
                  title="模板"
                  value={statusStats.template}
                  valueStyle={{ color: '#722ed1', fontSize: '16px' }}
                  suffix={<Tag color="purple" style={{ marginLeft: 4, fontSize: '10px' }}>TPL</Tag>}
                />
              </Col>
              <Col>
                <Statistic
                  title="总计"
                  value={workNotes.length}
                  valueStyle={{ color: '#1890ff', fontSize: '18px', fontWeight: 'bold' }}
                  suffix={<Tag color="blue" style={{ marginLeft: 4, fontSize: '10px' }}>ALL</Tag>}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 高级操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              {/* 左侧主要操作 */}
              <Space wrap>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="large"
                  onClick={() => setModalVisible(true)}
                  style={{ fontWeight: 600 }}
                >
                  新建笔记
                </Button>
                <Dropdown 
                  overlay={batchActionsMenu} 
                  disabled={selectedRowKeys.length === 0}
                  trigger={['click']}
                >
                  <Button size="large">
                    <Space>
                      批量操作
                      {selectedRowKeys.length > 0 && (
                        <Badge count={selectedRowKeys.length} size="small" />
                      )}
                      <DownOutlined />
                    </Space>
                  </Button>
                </Dropdown>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={loadWorkNotes}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
              
              {/* 右侧工具 */}
              <Space wrap>
                <Dropdown overlay={sortMenu} trigger={['click']}>
                  <Button icon={<BarsOutlined />}>
                    排序: {sortField === 'updated_at' ? '更新时间' : 
                          sortField === 'created_at' ? '创建时间' :
                          sortField === 'title' ? '标题' : 'ID'}
                    ({sortOrder === 'desc' ? '降序' : '升序'})
                  </Button>
                </Dropdown>
                <Radio.Group 
                  value={viewMode} 
                  onChange={(e) => setViewMode(e.target.value)}
                  size="small"
                >
                  <Radio.Button value="table" title="表格视图">
                    <TableOutlined />
                  </Radio.Button>
                  <Radio.Button value="grid" title="卡片视图" disabled>
                    <AppstoreOutlined />
                  </Radio.Button>
                </Radio.Group>
                <Button 
                  icon={<FilterOutlined />} 
                  onClick={resetFilters}
                  title="重置所有过滤器"
                >
                  重置
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
        
        <Divider style={{ margin: '16px 0' }} />
        
        {/* 搜索和过滤器 */}
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={24} md={8} lg={6}>
            <Input.Search
              placeholder="搜索标题、内容或 #ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={handleSearch}
              allowClear
              size="middle"
            />
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              size="middle"
            >
              <Option value="all">全部状态</Option>
              <Option value="draft">草稿</Option>
              <Option value="published">已发布</Option>
              <Option value="archived">已归档</Option>
              <Option value="template">模板</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: '100%' }}
              size="middle"
            >
              <Option value="all">全部类型</Option>
              <Option value="markdown">Markdown</Option>
              <Option value="html">HTML</Option>
              <Option value="txt">文本</Option>
              <Option value="pdf">PDF</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              value={visibilityFilter}
              onChange={setVisibilityFilter}
              style={{ width: '100%' }}
              size="middle"
            >
              <Option value="all">全部可见性</Option>
              <Option value="private">私有</Option>
              <Option value="team">团队</Option>
              <Option value="public">公开</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={8} lg={9}>
            <Space style={{ float: 'right' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                显示 {filteredData.length} / {workNotes.length} 条记录
                {selectedRowKeys.length > 0 && ` · 已选择 ${selectedRowKeys.length} 条`}
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 工作笔记表格 */}
      <Card>
        <Spin spinning={loading}>
          {filteredData.length === 0 && !loading ? (
            <Empty
              image={<FileMarkdownOutlined style={{ fontSize: 64, color: '#ccc' }} />}
              description={
                <div>
                  <Text type="secondary" style={{ fontSize: '16px' }}>
                    {workNotes.length === 0 ? '暂无工作笔记' : '没有符合条件的工作笔记'}
                  </Text>
                  <br />
                  <Text type="secondary">
                    {workNotes.length === 0 ? '点击"新建笔记"开始创建' : '请调整搜索条件或过滤器'}
                  </Text>
                </div>
              }
            />
          ) : (
            <Table
              rowSelection={handleRowSelection}
              columns={columns}
              dataSource={filteredData}
              rowKey="id"
              scroll={{ x: 1200 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                pageSizeOptions: ['10', '20', '50', '100'],
                size: 'default'
              }}
              size="middle"
              bordered
              rowClassName={(record, index) => 
                index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
              }
              style={{}}
            />
          )}
        </Spin>
      </Card>

      {/* 转换为任务文档对话框 */}
      <WorkNoteConversionModal
        visible={conversionModalVisible}
        workNote={currentWorkNote}
        onClose={() => {
          setConversionModalVisible(false);
          setCurrentWorkNote(null);
        }}
        onConversionSuccess={handleConversionSuccess}
      />

      {/* 批量转换为任务文档对话框 */}
      <BatchWorkNoteConversionModal
        visible={batchConversionModalVisible}
        workNotes={selectedWorkNotes}
        onClose={() => {
          setBatchConversionModalVisible(false);
          setSelectedRowKeys([]);
          setSelectedWorkNotes([]);
        }}
        onConversionSuccess={(results) => {
          message.success(`成功转换 ${results.length} 个工作笔记为任务文档`);
          loadWorkNotes(); // 重新加载列表
          setBatchConversionModalVisible(false);
          setSelectedRowKeys([]);
          setSelectedWorkNotes([]);
        }}
      />

      {/* 新建工作笔记对话框 */}
      <Modal
        title="新建工作笔记"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            type: 'markdown',
            status: 'draft',
            visibility: 'private'
          }}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="标题"
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input placeholder="请输入工作笔记标题" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="type"
                label="类型"
              >
                <Select>
                  <Option value="markdown">Markdown</Option>
                  <Option value="html">HTML</Option>
                  <Option value="txt">纯文本</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea 
              rows={2} 
              placeholder="请输入工作笔记描述（可选）"
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea 
              rows={12} 
              placeholder="请输入工作笔记内容..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="status"
                label="状态"
              >
                <Select>
                  <Option value="draft">草稿</Option>
                  <Option value="published">已发布</Option>
                  <Option value="archived">已归档</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="visibility"
                label="可见性"
              >
                <Select>
                  <Option value="private">私有</Option>
                  <Option value="team">团队</Option>
                  <Option value="public">公开</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑工作笔记对话框 */}
      <Modal
        title="编辑工作笔记"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setCurrentWorkNote(null);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="标题"
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input placeholder="请输入工作笔记标题" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="type"
                label="类型"
              >
                <Select>
                  <Option value="markdown">Markdown</Option>
                  <Option value="html">HTML</Option>
                  <Option value="txt">纯文本</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea 
              rows={2} 
              placeholder="请输入工作笔记描述（可选）"
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea 
              rows={12} 
              placeholder="请输入工作笔记内容..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="status"
                label="状态"
              >
                <Select>
                  <Option value="draft">草稿</Option>
                  <Option value="published">已发布</Option>
                  <Option value="archived">已归档</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="visibility"
                label="可见性"
              >
                <Select>
                  <Option value="private">私有</Option>
                  <Option value="team">团队</Option>
                  <Option value="public">公开</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setEditModalVisible(false);
                editForm.resetFields();
                setCurrentWorkNote(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                更新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkNotesManager;