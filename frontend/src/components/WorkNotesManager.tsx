import React, { useState, useEffect, useCallback } from 'react';
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
  Spin,
  Typography,
  Row,
  Col,
  Badge
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FileMarkdownOutlined,
  FilterOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { workNotesService, WorkNote, CreateWorkNoteRequest, UpdateWorkNoteRequest } from '../services/workNotesService';
import WorkNoteConversionModal from './conversion/WorkNoteConversionModal';
import { WORK_NOTE_TYPES, WORK_NOTE_PRIORITIES, getWorkNoteTypeConfig, getWorkNotePriorityConfig } from '../constants/workNoteTypes';
import WorkNotesStatsCards from './WorkNotesStatsCards';
import WorkNotesLayout from './WorkNotesLayout';
import WorkNotesTreeSidebar from './WorkNotesTreeSidebar';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 关联任务接口
interface AssociatedTask {
  id: number;
  title: string;
  status: string;
  project_id: number;
  project_name: string;
}

// 扩展的工作笔记接口
interface WorkNoteWithTask extends WorkNote {
  associatedTasks?: AssociatedTask[];
  categoryIcon?: string;
  categoryName?: string;
}

// 统计数据接口
interface WorkNotesStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
  associated: number;
}

// 分类统计接口
interface CategoryStats {
  categories: {
    [key: string]: {
      count: number;
      icon: string;
      color: string;
    }
  };
  tags: {
    [key: string]: number;
  };
  associations: {
    associated: number;
    unassociated: number;
    convertible: number;
  };
  timeRanges: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    earlier: number;
  };
}

interface WorkNotesManagerProps {
  selectedFolderId?: number | null;
  onDocumentSelect?: (doc: WorkNote) => void;
}

const WorkNotesManager: React.FC<WorkNotesManagerProps> = ({
  selectedFolderId,
  onDocumentSelect
}) => {
  // 基础状态
  const [workNotes, setWorkNotes] = useState<WorkNoteWithTask[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<WorkNoteWithTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 统计数据
  const [stats, setStats] = useState<WorkNotesStats>({
    total: 0,
    draft: 0,
    published: 0,
    archived: 0,
    associated: 0
  });
  
  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedAssociation, setSelectedAssociation] = useState<string>('');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('');
  
  // 对话框状态
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [conversionModalVisible, setConversionModalVisible] = useState(false);
  const [currentWorkNote, setCurrentWorkNote] = useState<WorkNote | null>(null);
  
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);

  // 计算统计数据
  const calculateStats = useCallback((notes: WorkNoteWithTask[]): WorkNotesStats => {
    return {
      total: notes.length,
      draft: notes.filter(note => note.status === 'draft').length,
      published: notes.filter(note => note.status === 'published').length,
      archived: notes.filter(note => note.status === 'archived').length,
      associated: notes.filter(note => note.associatedTasks && note.associatedTasks.length > 0).length
    };
  }, []);

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


  // 筛选数据
  const filterNotes = useCallback(() => {
    let filtered = [...workNotes];
    
    // 关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim();
      
      if (isIdSearch(keyword)) {
        // ID搜索 (格式: #123)
        const id = parseInt(keyword.substring(1));
        if (!isNaN(id)) {
          filtered = filtered.filter(note => note.id === id);
        }
      } else {
        // 常规搜索
        const lowerKeyword = keyword.toLowerCase();
        filtered = filtered.filter(note =>
          note.title.toLowerCase().includes(lowerKeyword) ||
          note.content?.toLowerCase().includes(lowerKeyword) ||
          note.id.toString().includes(keyword)
        );
      }
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(note => note.status === statusFilter);
    }

    // 类型筛选
    if (typeFilter !== 'all') {
      filtered = filtered.filter(note => note.type === typeFilter);
    }

    // 分类筛选
    if (selectedCategory) {
      filtered = filtered.filter(note => 
        note.categoryName?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        selectedCategory === 'frontend' && note.categoryName?.includes('前端') ||
        selectedCategory === 'backend' && note.categoryName?.includes('后端') ||
        selectedCategory === 'ui-design' && note.categoryName?.includes('UI') ||
        selectedCategory === 'data-analysis' && note.categoryName?.includes('数据')
      );
    }

    // 标签筛选
    if (selectedTag) {
      filtered = filtered.filter(note => 
        note.tags?.some(tag => tag.includes(selectedTag))
      );
    }

    // 关联状态筛选
    if (selectedAssociation) {
      if (selectedAssociation === 'associated') {
        filtered = filtered.filter(note => note.associatedTasks && note.associatedTasks.length > 0);
      } else if (selectedAssociation === 'unassociated') {
        filtered = filtered.filter(note => !note.associatedTasks || note.associatedTasks.length === 0);
      } else if (selectedAssociation === 'convertible') {
        // 简单模拟可转换逻辑
        filtered = filtered.filter(note => note.status === 'published' && (!note.associatedTasks || note.associatedTasks.length === 0));
      }
    }

    // 时间范围筛选
    if (selectedTimeRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(note => {
        const noteDate = new Date(note.updated_at);
        switch (selectedTimeRange) {
          case 'today':
            return noteDate >= today;
          case 'thisWeek':
            return noteDate >= thisWeekStart;
          case 'thisMonth':
            return noteDate >= thisMonthStart;
          case 'earlier':
            return noteDate < thisMonthStart;
          default:
            return true;
        }
      });
    }

    // 按ID降序排序（默认）
    filtered.sort((a, b) => b.id - a.id);

    setFilteredNotes(filtered);
  }, [workNotes, searchKeyword, statusFilter, typeFilter, selectedCategory, selectedTag, selectedAssociation, selectedTimeRange]);

  // 加载工作笔记
  const loadWorkNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await workNotesService.listWorkNotes(selectedFolderId || undefined);
      
      // 模拟添加关联任务数据
      const notesWithTasks: WorkNoteWithTask[] = data.documents.map(note => ({
        ...note,
        associatedTasks: Math.random() > 0.6 ? [
          {
            id: Math.floor(Math.random() * 1000),
            title: '示例任务',
            status: 'in_progress',
            project_id: 1,
            project_name: '示例项目'
          }
        ] : undefined,
        categoryIcon: '📝',
        categoryName: '前端开发'
      }));
      
      setWorkNotes(notesWithTasks);
      setStats(calculateStats(notesWithTasks));
    } catch (error) {
      console.error('Failed to load work notes:', error);
      message.error('加载工作笔记失败');
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId, calculateStats]);

  // 初始化加载
  useEffect(() => {
    loadWorkNotes();
  }, [loadWorkNotes]);

  // 筛选条件变化时重新筛选
  useEffect(() => {
    filterNotes();
  }, [filterNotes]);

  // 重置过滤器
  const resetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchKeyword('');
    setSelectedCategory('');
    setSelectedTag('');
    setSelectedAssociation('');
    setSelectedTimeRange('');
  };

  // 左侧树状导航事件处理
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
  };

  const handleAssociationSelect = (type: string) => {
    setSelectedAssociation(type === selectedAssociation ? '' : type);
  };

  const handleTimeRangeSelect = (range: string) => {
    setSelectedTimeRange(range === selectedTimeRange ? '' : range);
  };

  const handleTreeRefresh = () => {
    loadWorkNotes();
  };

  // 创建工作笔记
  const handleCreate = async (values: any) => {
    try {
      const createRequest: CreateWorkNoteRequest = {
        ...values,
        type: values.type || 'markdown',
        work_note_type: values.work_note_type || 'general',
        priority: values.priority || 'medium',
        status: values.status || 'draft',
        visibility: values.visibility || 'private',
        is_template: false,
        is_pinned: values.is_pinned || false,
        is_bookmarked: values.is_bookmarked || false,
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

  // 切换收藏状态
  const handleToggleBookmark = async (workNote: WorkNote) => {
    try {
      const newBookmarkStatus = !workNote.is_bookmarked;
      await workNotesService.updateWorkNote(workNote.id, {
        is_bookmarked: newBookmarkStatus
      });
      message.success(newBookmarkStatus ? '已收藏' : '已取消收藏');
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      message.error('操作失败');
    }
  };

  // 切换置顶状态
  const handleTogglePin = async (workNote: WorkNote) => {
    try {
      const newPinStatus = !workNote.is_pinned;
      await workNotesService.updateWorkNote(workNote.id, {
        is_pinned: newPinStatus
      });
      message.success(newPinStatus ? '已置顶' : '已取消置顶');
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      message.error('操作失败');
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
      work_note_type: workNote.work_note_type,
      priority: workNote.priority,
      status: workNote.status,
      visibility: workNote.visibility,
      tags: workNote.tags,
      is_pinned: workNote.is_pinned,
      is_bookmarked: workNote.is_bookmarked,
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




  // 过滤后的数据

  // 表格列定义
  const columns: ColumnsType<WorkNoteWithTask> = [
    {
      title: '笔记ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => b.id - a.id,
      defaultSortOrder: 'descend' as const,
      render: (id: number) => (
        <Button
          type="link"
          style={{ 
            fontFamily: 'monospace', 
            fontWeight: 'bold',
            color: '#1890ff',
            padding: 0,
            height: 'auto'
          }}
          onClick={() => handleView(filteredNotes.find(note => note.id === id)!)}
        >
          #{id}
        </Button>
      ),
    },
    {
      title: '笔记标题',
      dataIndex: 'title',
      key: 'title',
      width: 400,
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => 
        a.title.localeCompare(b.title),
      render: (title: string, record: WorkNoteWithTask) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {record.categoryIcon} {title}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.categoryName}
            {record.associatedTasks && record.associatedTasks.length > 0 && (
              <span style={{ marginLeft: 8 }}>
                · 关联 {record.associatedTasks.length} 个任务
              </span>
            )}
            {record.tags && record.tags.length > 0 && (
              <span style={{ marginLeft: 8 }}>
                · {record.tags.slice(0, 2).map(tag => `#${tag}`).join(' ')}
              </span>
            )}
          </Text>
        </div>
      ),
    },
    {
      title: '关联状态',
      key: 'associationStatus',
      width: 140,
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => {
        const aAssociated = a.associatedTasks && a.associatedTasks.length > 0;
        const bAssociated = b.associatedTasks && b.associatedTasks.length > 0;
        if (aAssociated && !bAssociated) return -1;
        if (!aAssociated && bAssociated) return 1;
        return 0;
      },
      filters: [
        { text: '已关联任务', value: 'associated' },
        { text: '未关联任务', value: 'unassociated' },
      ],
      onFilter: (value: any, record: WorkNoteWithTask) => {
        if (value === 'associated') return record.associatedTasks && record.associatedTasks.length > 0;
        if (value === 'unassociated') return !record.associatedTasks || record.associatedTasks.length === 0;
        return true;
      },
      render: (_, record: WorkNoteWithTask) => (
        <Space direction="vertical" size={2}>
          {record.associatedTasks && record.associatedTasks.length > 0 ? (
            <Badge status="success" text="已关联任务" />
          ) : (
            <Badge status="default" text="未关联任务" />
          )}
          {record.associatedTasks && record.associatedTasks.length > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.associatedTasks.length} 个任务
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => a.status.localeCompare(b.status),
      filters: [
        { text: '草稿', value: 'draft' },
        { text: '已发布', value: 'published' },
        { text: '已归档', value: 'archived' },
      ],
      onFilter: (value: any, record: WorkNoteWithTask) => record.status === value,
      render: (status: string) => {
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'published': return { color: 'success', text: '已发布' };
            case 'draft': return { color: 'warning', text: '草稿' };
            case 'archived': return { color: 'default', text: '已归档' };
            default: return { color: 'default', text: status };
          }
        };
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => 
        dayjs(a.updated_at).unix() - dayjs(b.updated_at).unix(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record: WorkNoteWithTask) => (
        <Space>
          <Tooltip title="查看笔记">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="编辑笔记">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="转换为任务文档">
            <Button
              type="text"
              icon={<SwapOutlined />}
              onClick={() => openConversionModal(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <FileMarkdownOutlined style={{ marginRight: 8 }} />
          工作笔记管理
        </Title>
        <Text type="secondary">
          管理和查看所有的工作笔记文档
        </Text>
      </div>

      {/* 统计卡片 */}
      <WorkNotesStatsCards stats={stats} loading={loading} />

      {/* 主要内容区域 */}
      <WorkNotesLayout
        sidebar={
          <WorkNotesTreeSidebar
            onCategorySelect={handleCategorySelect}
            onTagSelect={handleTagSelect}
            onAssociationSelect={handleAssociationSelect}
            onTimeRangeSelect={handleTimeRangeSelect}
            onRefresh={handleTreeRefresh}
            selectedCategory={selectedCategory}
            selectedTag={selectedTag}
            selectedAssociation={selectedAssociation}
            selectedTimeRange={selectedTimeRange}
          />
        }
      >
        {/* 搜索和筛选区 */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col flex="300px">
              <Search
                placeholder="搜索标题、内容或输入#ID搜索..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
                prefix={<SearchOutlined />}
                style={{ width: '100%' }}
              />
            </Col>
            <Col flex="120px">
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="all">全部状态</Option>
                <Option value="draft">草稿</Option>
                <Option value="published">已发布</Option>
                <Option value="archived">已归档</Option>
              </Select>
            </Col>
            <Col>
              <Button
                icon={<FilterOutlined />}
                onClick={resetFilters}
              >
                清空筛选
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 工作笔记表格 */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredNotes}
            rowKey="id"
            loading={loading}
            pagination={{
              total: filteredNotes.length,
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个笔记`,
            }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </WorkNotesLayout>

      {/* 查看笔记对话框 */}
      <Modal
        title={`查看笔记 - ${currentWorkNote?.title || ''}`}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setCurrentWorkNote(null);
        }}
        footer={[
          <Button key="edit" type="primary" onClick={() => {
            setViewModalVisible(false);
            openEditModal(currentWorkNote!);
          }}>
            编辑
          </Button>,
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {currentWorkNote && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag color="blue">#{currentWorkNote.id}</Tag>
                <Tag color={currentWorkNote.status === 'published' ? 'success' : 'warning'}>
                  {currentWorkNote.status === 'published' ? '已发布' : '草稿'}
                </Tag>
                <Text type="secondary">
                  更新时间: {dayjs(currentWorkNote.updated_at).format('YYYY-MM-DD HH:mm')}
                </Text>
              </Space>
            </div>
            
            {currentWorkNote.description && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>描述：</Text>
                <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                  {currentWorkNote.description}
                </div>
              </div>
            )}
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>内容：</Text>
              <div style={{ 
                marginTop: 8, 
                padding: 16, 
                background: '#fafafa', 
                borderRadius: 4,
                maxHeight: 400,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace'
              }}>
                {currentWorkNote.content}
              </div>
            </div>
            
            {currentWorkNote.tags && currentWorkNote.tags.length > 0 && (
              <div>
                <Text strong>标签：</Text>
                <div style={{ marginTop: 8 }}>
                  {currentWorkNote.tags.map(tag => (
                    <Tag key={tag} color="blue">#{tag}</Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 编辑笔记对话框 */}
      <Modal
        title={`编辑笔记 - ${currentWorkNote?.title || ''}`}
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          setCurrentWorkNote(null);
          editForm.resetFields();
        }}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入笔记标题" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input placeholder="请输入笔记描述（可选）" />
          </Form.Item>
          
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea
              rows={12}
              placeholder="请输入笔记内容"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
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
                name="type"
                label="类型"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select>
                  <Option value="markdown">Markdown</Option>
                  <Option value="html">HTML</Option>
                  <Option value="text">文本</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="visibility"
                label="可见性"
                rules={[{ required: true, message: '请选择可见性' }]}
              >
                <Select>
                  <Option value="private">私有</Option>
                  <Option value="team">团队</Option>
                  <Option value="public">公开</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="请输入标签（支持多个）"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>

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

    </div>
  );
};

export default WorkNotesManager;