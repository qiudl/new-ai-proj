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
  Typography
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
  StarFilled
} from '@ant-design/icons';
import { workNotesService, WorkNote, CreateWorkNoteRequest, UpdateWorkNoteRequest } from '../services/workNotesService';

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
  const [currentWorkNote, setCurrentWorkNote] = useState<WorkNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // 组件加载和文件夹变化时重新加载
  useEffect(() => {
    loadWorkNotes();
  }, [selectedFolderId]);

  // 搜索功能
  const handleSearch = () => {
    loadWorkNotes();
  };

  // 创建工作笔记
  const handleCreate = async (values: any) => {
    try {
      const request: CreateWorkNoteRequest = {
        title: values.title,
        content: values.content,
        description: values.description,
        type: values.type || 'markdown',
        status: values.status || 'draft',
        visibility: values.visibility || 'team',
        tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()) : [],
        folder_id: selectedFolderId || undefined,
        is_template: values.is_template || false,
      };

      await workNotesService.createWorkNote(request);
      message.success('工作笔记创建成功');
      setModalVisible(false);
      form.resetFields();
      loadWorkNotes();
    } catch (error: any) {
      console.error('Failed to create work note:', error);
      message.error(error.message || '创建工作笔记失败');
    }
  };

  // 编辑工作笔记
  const handleEdit = async (values: any) => {
    if (!currentWorkNote) return;

    try {
      const request: UpdateWorkNoteRequest = {
        title: values.title,
        content: values.content,
        description: values.description,
        status: values.status,
        visibility: values.visibility,
        tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()) : [],
        folder_id: values.folder_id,
      };

      await workNotesService.updateWorkNote(currentWorkNote.id, request);
      message.success('工作笔记更新成功');
      setEditModalVisible(false);
      setCurrentWorkNote(null);
      editForm.resetFields();
      loadWorkNotes();
    } catch (error: any) {
      console.error('Failed to update work note:', error);
      message.error(error.message || '更新工作笔记失败');
    }
  };

  // 删除工作笔记
  const handleDelete = async (id: number) => {
    try {
      await workNotesService.deleteWorkNote(id);
      message.success('工作笔记删除成功');
      loadWorkNotes();
    } catch (error: any) {
      console.error('Failed to delete work note:', error);
      message.error(error.message || '删除工作笔记失败');
    }
  };

  // 复制工作笔记
  const handleCopy = async (id: number) => {
    try {
      await workNotesService.copyWorkNote(id);
      message.success('工作笔记复制成功');
      loadWorkNotes();
    } catch (error: any) {
      console.error('Failed to copy work note:', error);
      message.error(error.message || '复制工作笔记失败');
    }
  };

  // 切换模板状态
  const handleToggleTemplate = async (id: number) => {
    try {
      await workNotesService.toggleTemplate(id);
      message.success('模板状态更新成功');
      loadWorkNotes();
    } catch (error: any) {
      console.error('Failed to toggle template:', error);
      message.error(error.message || '更新模板状态失败');
    }
  };

  // 查看工作笔记
  const handleView = (record: WorkNote) => {
    setCurrentWorkNote(record);
    setViewModalVisible(true);
    if (onDocumentSelect) {
      onDocumentSelect(record);
    }
  };

  // 打开编辑对话框
  const openEditModal = (record: WorkNote) => {
    setCurrentWorkNote(record);
    editForm.setFieldsValue({
      title: record.title,
      content: record.content,
      description: record.description,
      status: record.status,
      visibility: record.visibility,
      tags: record.tags?.join(', '),
      folder_id: record.folder_id,
    });
    setEditModalVisible(true);
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'green';
      case 'draft': return 'orange';
      case 'archived': return 'gray';
      case 'template': return 'blue';
      default: return 'default';
    }
  };

  // 获取可见性标签颜色
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
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 100,
      sorter: (a: WorkNote, b: WorkNote) => a.visibility.localeCompare(b.visibility),
      filters: [
        { text: '私有', value: 'private' },
        { text: '团队', value: 'team' },
        { text: '公开', value: 'public' },
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
          <Tag key={tag} size="small">{tag}</Tag>
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
      width: 180,
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
              defaultSortField="updated_at"
              defaultSortOrder="descend"
            />
          )}
        </Spin>
      </Card>

      {/* 创建工作笔记对话框 */}
      <Modal
        title="新建工作笔记"
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入工作笔记标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input placeholder="请输入简短描述（可选）" />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
          >
            <TextArea
              placeholder="请输入工作笔记内容（支持Markdown）"
              rows={6}
            />
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Form.Item
              name="type"
              label="类型"
              initialValue="markdown"
            >
              <Select style={{ width: 120 }}>
                <Option value="markdown">Markdown</Option>
                <Option value="txt">纯文本</Option>
                <Option value="html">HTML</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="status"
              label="状态"
              initialValue="draft"
            >
              <Select style={{ width: 120 }}>
                <Option value="draft">草稿</Option>
                <Option value="published">发布</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="visibility"
              label="可见性"
              initialValue="team"
            >
              <Select style={{ width: 120 }}>
                <Option value="private">私有</Option>
                <Option value="team">团队</Option>
                <Option value="public">公开</Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Input placeholder="输入标签，用逗号分隔（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑工作笔记对话框 */}
      <Modal
        title="编辑工作笔记"
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          setCurrentWorkNote(null);
          editForm.resetFields();
        }}
        width={600}
        destroyOnHidden
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入工作笔记标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input placeholder="请输入简短描述（可选）" />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
          >
            <TextArea
              placeholder="请输入工作笔记内容（支持Markdown）"
              rows={6}
            />
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Form.Item
              name="status"
              label="状态"
            >
              <Select style={{ width: 120 }}>
                <Option value="draft">草稿</Option>
                <Option value="published">发布</Option>
                <Option value="archived">归档</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="visibility"
              label="可见性"
            >
              <Select style={{ width: 120 }}>
                <Option value="private">私有</Option>
                <Option value="team">团队</Option>
                <Option value="public">公开</Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Input placeholder="输入标签，用逗号分隔（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看工作笔记对话框 */}
      <Modal
        title={currentWorkNote?.title}
        open={viewModalVisible}
        footer={[
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setViewModalVisible(false);
              openEditModal(currentWorkNote!);
            }}
          >
            编辑
          </Button>,
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>,
        ]}
        onCancel={() => setViewModalVisible(false)}
        width={800}
      >
        {currentWorkNote && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={getStatusColor(currentWorkNote.status)}>
                {currentWorkNote.status === 'published' ? '已发布' :
                 currentWorkNote.status === 'draft' ? '草稿' :
                 currentWorkNote.status === 'archived' ? '已归档' :
                 currentWorkNote.status === 'template' ? '模板' : currentWorkNote.status}
              </Tag>
              <Tag color={getVisibilityColor(currentWorkNote.visibility)}>
                {currentWorkNote.visibility === 'public' ? '公开' :
                 currentWorkNote.visibility === 'team' ? '团队' :
                 currentWorkNote.visibility === 'private' ? '私有' : currentWorkNote.visibility}
              </Tag>
              {currentWorkNote.tags?.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
            
            {currentWorkNote.description && (
              <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                {currentWorkNote.description}
              </Paragraph>
            )}
            
            <div style={{ 
              border: '1px solid #f0f0f0', 
              borderRadius: 6, 
              padding: 16,
              backgroundColor: '#fafafa',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace'
            }}>
              {currentWorkNote.content || '暂无内容'}
            </div>
            
            <div style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
              <Text type="secondary">
                创建时间: {new Date(currentWorkNote.created_at).toLocaleString('zh-CN')}
                &nbsp;&nbsp;|&nbsp;&nbsp;
                更新时间: {new Date(currentWorkNote.updated_at).toLocaleString('zh-CN')}
                &nbsp;&nbsp;|&nbsp;&nbsp;
                版本: v{currentWorkNote.version}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WorkNotesManager;