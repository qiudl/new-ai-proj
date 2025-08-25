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
  Menu
} from 'antd';
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
  ExportOutlined
} from '@ant-design/icons';
import { workNotesService, WorkNote, CreateWorkNoteRequest, UpdateWorkNoteRequest } from '../services/workNotesService';
import WorkNoteConversionModal from './conversion/WorkNoteConversionModal';

const { Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface WorkNotesManagerProps {
  selectedFolderId?: number | null;
  onDocumentSelect?: (doc: WorkNote) => void;
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

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: WorkNote, b: WorkNote) => a.id - b.id,
      render: (id: number) => (
        <Text style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
          #{id}
        </Text>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      sorter: (a: WorkNote, b: WorkNote) => a.title.localeCompare(b.title),
      render: (text: string, record: WorkNote) => (
        <Space>
          <Button
            type="link"
            onClick={() => handleView(record)}
            style={{ padding: 0 }}
          >
            {text}
          </Button>
          {record.is_template && (
            <Tooltip title="模板">
              <StarFilled style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: (a: WorkNote, b: WorkNote) => a.status.localeCompare(b.status),
      filters: [
        { text: '草稿', value: 'draft' },
        { text: '已发布', value: 'published' },
        { text: '已归档', value: 'archived' },
        { text: '模板', value: 'template' },
      ],
      onFilter: (value: any, record: WorkNote) => record.status === value,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'published' ? '已发布' :
           status === 'draft' ? '草稿' :
           status === 'archived' ? '已归档' :
           status === 'template' ? '模板' : status}
        </Tag>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      filters: [
        { text: 'Markdown', value: 'markdown' },
        { text: 'HTML', value: 'html' },
        { text: '文本', value: 'txt' },
        { text: 'PDF', value: 'pdf' },
      ],
      onFilter: (value: any, record: WorkNote) => record.type === value,
      render: (type: string) => (
        <Tag>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 100,
      filters: [
        { text: '公开', value: 'public' },
        { text: '团队', value: 'team' },
        { text: '私有', value: 'private' },
      ],
      onFilter: (value: any, record: WorkNote) => record.visibility === value,
      render: (visibility: string) => (
        <Tag color={getVisibilityColor(visibility)}>
          {visibility === 'public' ? '公开' :
           visibility === 'team' ? '团队' :
           visibility === 'private' ? '私有' : visibility}
        </Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) =>
        tags?.map(tag => (
          <Tag key={tag}>{tag}</Tag>
        )),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      sorter: (a: WorkNote, b: WorkNote) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_, record: WorkNote) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="转换为任务文档">
            <Button
              icon={<SwapOutlined />}
              size="small"
              type="primary"
              ghost
              onClick={() => openConversionModal(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
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
              onClick={() => handleToggleTemplate(record.id)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个工作笔记吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
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
    <div>
      {/* 操作栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              新建工作笔记
            </Button>
            <Dropdown 
              overlay={batchActionsMenu} 
              disabled={selectedRowKeys.length === 0}
            >
              <Button>
                批量操作 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
                <DownOutlined />
              </Button>
            </Dropdown>
            <Text type="secondary">
              {selectedFolderId ? `文件夹 ${selectedFolderId}` : '所有工作笔记'}
              - 共 {workNotes.length} 条
            </Text>
          </Space>
          
          <Space>
            <Input.Search
              placeholder="搜索标题、内容、描述或输入#ID搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={handleSearch}
              style={{ width: 300 }}
              allowClear
            />
          </Space>
        </Space>
      </Card>

      {/* 工作笔记表格 */}
      <Card>
        <Spin spinning={loading}>
          {workNotes.length === 0 && !loading ? (
            <Empty
              image={<FileMarkdownOutlined style={{ fontSize: 64, color: '#ccc' }} />}
              description={
                <div>
                  <Text type="secondary">暂无工作笔记</Text>
                  <br />
                  <Text type="secondary">点击"新建工作笔记"开始创建</Text>
                </div>
              }
            />
          ) : (
            <Table
              rowSelection={handleRowSelection}
              columns={columns}
              dataSource={workNotes}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              size="small"
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
    </div>
  );
};

export default WorkNotesManager;
