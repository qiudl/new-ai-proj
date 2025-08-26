import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Button, 
  Space, 
  Typography, 
  Input,
  Select,
  Tag,
  Row,
  Col,
  Avatar,
  Dropdown,
  Menu,
  Affix,
  Divider,
  Empty,
  Spin,
  Badge,
  Tooltip,
  message,
  Modal
} from 'antd';
import { 
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  AppstoreOutlined,
  BarsOutlined,
  StarOutlined,
  StarFilled,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  FileMarkdownOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TagOutlined,
  FolderOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { workNotesService, WorkNote } from '../services/workNotesService';
import ModernWorkNoteEditor from '../components/ModernWorkNoteEditor';
import ModernWorkNoteViewer from '../components/ModernWorkNoteViewer';
import WorkNoteConversionModal from '../components/conversion/WorkNoteConversionModal';
import '../styles/ModernDocumentManager.css';
import { useSearchParams } from 'react-router-dom';
import type { MenuProps } from 'antd';

const { Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

// URL & localStorage keys
const STORAGE_KEY_VIEWMODE = 'documentManager.viewMode';
const STORAGE_KEY_FILTERS = 'documentManager.filters';

interface ModernDocumentManagerPageProps {}

const ModernDocumentManagerPage: React.FC<ModernDocumentManagerPageProps> = () => {
  // URL params
  const [searchParams, setSearchParams] = useSearchParams();

  // 核心状态
  const [workNotes, setWorkNotes] = useState<WorkNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState<WorkNote | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // 编辑器状态
  const [editorVisible, setEditorVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<WorkNote | null>(null);
  
  // 转换状态
  const [conversionVisible, setConversionVisible] = useState(false);
  const [convertingNote, setConvertingNote] = useState<WorkNote | null>(null);
  
  // 筛选和搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  
  // 统计信息
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    templates: 0,
    favorites: 0
  });

  // 加载工作笔记
  const loadWorkNotes = async () => {
    try {
      setLoading(true);
      let data;
      
      if (searchQuery) {
        const results = await workNotesService.searchWorkNotes(searchQuery);
        data = { documents: results, total: results.length, page: 1, page_size: 50 };
      } else {
        data = await workNotesService.listWorkNotes();
      }
      
      let filteredNotes = data.documents;
      
      // 应用筛选条件
      if (statusFilter !== 'all') {
        filteredNotes = filteredNotes.filter(note => note.status === statusFilter);
      }
      
      if (favoriteFilter) {
        filteredNotes = filteredNotes.filter(note => note.is_template);
      }
      
      if (selectedTags.length > 0) {
        filteredNotes = filteredNotes.filter(note => 
          selectedTags.some(tag => note.tags?.includes(tag))
        );
      }
      
      // 排序
      filteredNotes.sort((a, b) => {
        switch (sortBy) {
          case 'title':
            return a.title.localeCompare(b.title);
          case 'created':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'updated':
          default:
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
      });
      
      setWorkNotes(filteredNotes);
      
      // 更新统计信息
      setStats({
        total: data.documents.length,
        published: data.documents.filter(n => n.status === 'published').length,
        drafts: data.documents.filter(n => n.status === 'draft').length,
        templates: data.documents.filter(n => n.is_template).length,
        favorites: data.documents.filter(n => n.is_template).length,
      });
      
    } catch (error) {
      console.error('Failed to load work notes:', error);
      message.error('加载工作笔记失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkNotes();
  }, [searchQuery, statusFilter, favoriteFilter, selectedTags, sortBy]);

  // 初始化与监听 URL 参数变化，优先 URL -> 其次 localStorage -> 默认值
  useEffect(() => {
    // viewMode
    let nextMode: 'grid' | 'list' | null = null;
    const viewParam = searchParams.get('view');
    if (viewParam === 'grid' || viewParam === 'list') {
      nextMode = viewParam;
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_VIEWMODE);
        if (stored === 'grid' || stored === 'list') {
          nextMode = stored as 'grid' | 'list';
        }
      } catch (e) {
        // ignore storage errors
      }
    }
    if (!nextMode) nextMode = 'list';
    if (nextMode !== viewMode) {
      setViewMode(nextMode);
    }

    // sortBy
    let nextSort: 'updated' | 'created' | 'title' | null = null;
    const sortParam = searchParams.get('sort');
    if (sortParam === 'updated' || sortParam === 'created' || sortParam === 'title') {
      nextSort = sortParam;
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_FILTERS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.sortBy === 'updated' || parsed?.sortBy === 'created' || parsed?.sortBy === 'title') {
            nextSort = parsed.sortBy;
          }
        }
      } catch (e) {
        // ignore storage errors
      }
    }
    if (!nextSort) nextSort = 'updated';
    if (nextSort !== sortBy) {
      setSortBy(nextSort);
    }

    // statusFilter
    let nextStatus: 'all' | 'draft' | 'published' | 'archived' | null = null;
    const statusParam = searchParams.get('status');
    if (statusParam === 'all' || statusParam === 'draft' || statusParam === 'published' || statusParam === 'archived') {
      nextStatus = statusParam;
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_FILTERS);
        if (stored) {
          const parsed = JSON.parse(stored);
          const s = parsed?.status;
          if (s === 'all' || s === 'draft' || s === 'published' || s === 'archived') {
            nextStatus = s;
          }
        }
      } catch (e) {
        // ignore storage errors
      }
    }
    if (!nextStatus) nextStatus = 'all';
    if (nextStatus !== statusFilter) {
      setStatusFilter(nextStatus);
    }

    // selectedTags (CSV in URL)
    let nextTags: string[] | null = null;
    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      nextTags = tagsParam
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => decodeURIComponent(t));
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_FILTERS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed?.tags)) {
            nextTags = parsed.tags.filter((t: unknown) => typeof t === 'string');
          }
        }
      } catch (e) {
        // ignore storage errors
      }
    }
    if (!nextTags) nextTags = [];
    const tagsEqual = nextTags.length === selectedTags.length && nextTags.every((t, i) => t === selectedTags[i]);
    if (!tagsEqual) {
      setSelectedTags(nextTags);
    }

    // searchQuery
    let nextQ: string | null = null;
    const qParam = searchParams.get('q');
    if (qParam !== null) {
      nextQ = qParam;
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_FILTERS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed?.q === 'string') {
            nextQ = parsed.q;
          }
        }
      } catch (e) {
        // ignore storage errors
      }
    }
    if (nextQ === null) nextQ = '';
    if (nextQ !== searchQuery) {
      setSearchQuery(nextQ);
    }
  }, [searchParams]);

  // 获取所有标签
  const getAllTags = () => {
    const tags = new Set<string>();
    workNotes.forEach(note => {
      note.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  };

  // 处理笔记操作
  const handleCreateNote = () => {
    setEditingNote(null);
    setEditorVisible(true);
  };

  const handleEditNote = (note: WorkNote) => {
    setEditingNote(note);
    setEditorVisible(true);
  };

  const handleViewNote = (note: WorkNote) => {
    setSelectedNote(note);
    setViewerVisible(true);
  };

  // 切换视图并持久化（URL + localStorage）
  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY_VIEWMODE, mode);
    } catch (e) {
      // ignore storage errors
    }
    const next = new URLSearchParams(searchParams);
    if (mode === 'list') {
      // 默认视图为 list，避免冗余参数
      next.delete('view');
    } else {
      next.set('view', mode);
    }
    setSearchParams(next, { replace: true });
  };

  const handleDeleteNote = async (note: WorkNote) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除笔记"${note.title}"吗？`,
      onOk: async () => {
        try {
          await workNotesService.deleteWorkNote(note.id);
          message.success('删除成功');
          loadWorkNotes();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleToggleFavorite = async (note: WorkNote) => {
    try {
      await workNotesService.toggleTemplate(note.id);
      message.success(note.is_template ? '已取消收藏' : '已添加到收藏');
      loadWorkNotes();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleCopyNote = async (note: WorkNote) => {
    try {
      await workNotesService.copyWorkNote(note.id);
      message.success('复制成功');
      loadWorkNotes();
    } catch (error) {
      message.error('复制失败');
    }
  };

  const handleConvertToTaskDocument = (note: WorkNote) => {
    setConvertingNote(note);
    setConversionVisible(true);
  };

  const handleConversionSuccess = () => {
    message.success('转换成功！工作笔记已转换为任务文档');
    loadWorkNotes(); // 重新加载列表
    setConversionVisible(false);
    setConvertingNote(null);
  };

  // 渲染状态标签
  const renderStatusTag = (status: string) => {
    const statusConfig = {
      published: { color: 'green', text: '已发布' },
      draft: { color: 'orange', text: '草稿' },
      archived: { color: 'gray', text: '已归档' },
      template: { color: 'blue', text: '模板' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 渲染网格视图笔记卡片
  const renderNoteCard = (note: WorkNote) => {
    const dropdownItems: MenuProps['items'] = [
      { key: 'edit', icon: <EditOutlined />, label: '编辑' },
      { key: 'copy', icon: <CopyOutlined />, label: '复制' },
      { key: 'convert', icon: <SwapOutlined />, label: '转为任务文档' },
      { key: 'favorite', icon: note.is_template ? <StarFilled /> : <StarOutlined />, label: note.is_template ? '取消收藏' : '添加收藏' },
      { type: 'divider' as const },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ];

    return (
      <Card
        key={note.id}
        size="small"
        className="note-card"
        hoverable
        onClick={() => handleViewNote(note)}
        style={{ 
          marginBottom: 16,
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        cover={
          <div style={{ 
            padding: '16px 16px 0 16px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            minHeight: 80,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text strong style={{ color: 'white', fontSize: '16px' }} ellipsis>
                {note.title}
              </Text>
              <Dropdown 
                menu={{
                  items: dropdownItems,
                  onClick: ({ key }) => {
                    if (key === 'edit') return handleEditNote(note);
                    if (key === 'copy') return handleCopyNote(note);
                    if (key === 'convert') return handleConvertToTaskDocument(note);
                    if (key === 'favorite') return handleToggleFavorite(note);
                    if (key === 'delete') return handleDeleteNote(note);
                  },
                }} 
                trigger={['click']} 
                placement="bottomRight"
              >
                <Button 
                  type="text" 
                  icon={<MoreOutlined />} 
                  size="small"
                  style={{ color: 'white' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FileMarkdownOutlined style={{ fontSize: '24px', opacity: 0.7 }} />
              {note.is_template && (
                <StarFilled style={{ color: '#faad14', fontSize: '16px' }} />
              )}
            </div>
          </div>
        }
        styles={{ body: { padding: '12px 16px 16px 16px' } }}
      >
        <div style={{ marginBottom: 12 }}>
          {renderStatusTag(note.status)}
          <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {new Date(note.updated_at).toLocaleDateString('zh-CN')}
          </Text>
        </div>
        
        {note.description && (
          <Paragraph 
            ellipsis={{ rows: 2 }} 
            style={{ marginBottom: 12, fontSize: '13px', color: '#666' }}
          >
            {note.description}
          </Paragraph>
        )}
        
        {note.tags && note.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {note.tags.slice(0, 3).map(tag => (
              <Tag key={tag} style={{ margin: 0 }}>
                {tag}
              </Tag>
            ))}
            {note.tags.length > 3 && (
              <Tag style={{ margin: 0 }}>
                +{note.tags.length - 3}
              </Tag>
            )}
          </div>
        )}
      </Card>
    );
  };

  // 渲染列表视图笔记项
  const renderNoteListItem = (note: WorkNote) => {
    const dropdownItems: MenuProps['items'] = [
      { key: 'edit', icon: <EditOutlined />, label: '编辑' },
      { key: 'copy', icon: <CopyOutlined />, label: '复制' },
      { key: 'convert', icon: <SwapOutlined />, label: '转为任务文档' },
      { key: 'favorite', icon: note.is_template ? <StarFilled /> : <StarOutlined />, label: note.is_template ? '取消收藏' : '添加收藏' },
      { type: 'divider' as const },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ];

    return (
      <Card
        key={note.id}
        size="small"
        hoverable
        onClick={() => handleViewNote(note)}
        style={{ 
          marginBottom: 8,
          cursor: 'pointer',
          borderRadius: 6
        }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar 
              shape="square" 
              size="small" 
              icon={<FileMarkdownOutlined />}
              style={{ backgroundColor: '#667eea' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text strong>{note.title}</Text>
                {note.is_template && <StarFilled style={{ color: '#faad14', fontSize: '12px' }} />}
                {renderStatusTag(note.status)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '12px', color: '#666' }}>
                <span>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {new Date(note.updated_at).toLocaleDateString('zh-CN')}
                </span>
                {note.tags && note.tags.length > 0 && (
                  <span>
                    <TagOutlined style={{ marginRight: 4 }} />
                    {note.tags.slice(0, 2).join(', ')}
                    {note.tags.length > 2 && '...'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Dropdown 
            menu={{
              items: dropdownItems,
              onClick: ({ key }) => {
                if (key === 'edit') return handleEditNote(note);
                if (key === 'copy') return handleCopyNote(note);
                if (key === 'convert') return handleConvertToTaskDocument(note);
                if (key === 'favorite') return handleToggleFavorite(note);
                if (key === 'delete') return handleDeleteNote(note);
              },
            }}
            trigger={['click']} 
            placement="bottomRight"
          >
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </Card>
    );
  };

  // 将排序/状态/标签写回 URL 和 localStorage（避免多余参数，保持默认值精简）
  useEffect(() => {
    // Persist to localStorage
    try {
      const payload = {
        sortBy,
        status: statusFilter,
        tags: selectedTags,
        q: searchQuery,
      };
      localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(payload));
    } catch (e) {
      // ignore storage errors
    }

    // Sync URL params
    const next = new URLSearchParams(searchParams);
    // sort
    if (sortBy === 'updated') {
      next.delete('sort');
    } else {
      next.set('sort', sortBy);
    }
    // status
    if (statusFilter === 'all') {
      next.delete('status');
    } else {
      next.set('status', statusFilter);
    }
    // tags
    if (!selectedTags || selectedTags.length === 0) {
      next.delete('tags');
    } else {
      next.set('tags', selectedTags.map(t => encodeURIComponent(t)).join(','));
    }
    // q (search)
    if (!searchQuery || searchQuery.trim() === '') {
      next.delete('q');
    } else {
      next.set('q', searchQuery);
    }

    setSearchParams(next, { replace: true });
  }, [sortBy, statusFilter, selectedTags, searchQuery]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 侧边栏 */}
      <Sider 
        width={280} 
        collapsible 
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{ padding: '20px 16px' }}>
          <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileMarkdownOutlined style={{ color: '#1890ff' }} />
            {!sidebarCollapsed && '工作笔记'}
          </Title>
        </div>
        
        <div style={{ padding: '0 16px' }}>
          {/* 统计卡片 */}
          {!sidebarCollapsed && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>{stats.total}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>总计</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>{stats.published}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>已发布</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#faad14' }}>{stats.drafts}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>草稿</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>{stats.favorites}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>收藏</div>
                  </div>
                </Col>
              </Row>
            </Card>
          )}
          
          {/* 快速筛选 */}
          {!sidebarCollapsed && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: '12px', color: '#666' }}>快速筛选</Text>
              <div style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  type={statusFilter === 'all' ? 'primary' : 'text'}
                  onClick={() => setStatusFilter('all')}
                  style={{ width: '100%', textAlign: 'left', marginBottom: 4 }}
                >
                  <FolderOutlined /> 全部笔记
                </Button>
                <Button
                  size="small"
                  type={statusFilter === 'draft' ? 'primary' : 'text'}
                  onClick={() => setStatusFilter('draft')}
                  style={{ width: '100%', textAlign: 'left', marginBottom: 4 }}
                >
                  <EditOutlined /> 草稿
                </Button>
                <Button
                  size="small"
                  type={statusFilter === 'published' ? 'primary' : 'text'}
                  onClick={() => setStatusFilter('published')}
                  style={{ width: '100%', textAlign: 'left', marginBottom: 4 }}
                >
                  <FileMarkdownOutlined /> 已发布
                </Button>
                <Button
                  size="small"
                  type={favoriteFilter ? 'primary' : 'text'}
                  onClick={() => setFavoriteFilter(!favoriteFilter)}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  <StarOutlined /> 收藏夹
                </Button>
              </div>
            </div>
          )}
        </div>
      </Sider>

      {/* 主内容区 */}
      <Layout>
        <Content style={{ padding: '24px' }}>
          {/* 顶部工具栏 */}
          <Affix offsetTop={0}>
            <Card 
              size="small" 
              style={{ marginBottom: 16, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Search
                    placeholder="搜索笔记标题、内容..."
                    style={{ width: 300 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    allowClear
                  />
                  
                  <Select
                    style={{ width: 120 }}
                    value={sortBy}
                    onChange={setSortBy}
                    size="small"
                  >
                    <Option value="updated">最近更新</Option>
                    <Option value="created">创建时间</Option>
                    <Option value="title">标题排序</Option>
                  </Select>
                  
                  <Space.Compact size="small">
                    <Button
                      type={viewMode === 'grid' ? 'primary' : 'default'}
                      icon={<AppstoreOutlined />}
                      onClick={() => handleSetViewMode('grid')}
                    />
                    <Button
                      type={viewMode === 'list' ? 'primary' : 'default'}
                      icon={<BarsOutlined />}
                      onClick={() => handleSetViewMode('list')}
                    />
                  </Space.Compact>
                </div>
                
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNote}>
                  新建笔记
                </Button>
              </div>
            </Card>
          </Affix>

          {/* 笔记列表 */}
          <Spin spinning={loading}>
            {workNotes.length === 0 ? (
              <Empty
                image={<FileMarkdownOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
                description={
                  <div>
                    <Text type="secondary">还没有笔记</Text>
                    <br />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNote}>
                      创建第一个笔记
                    </Button>
                  </div>
                }
                style={{ marginTop: 48 }}
              />
            ) : (
              <Row gutter={[16, 16]}>
                {viewMode === 'grid' ? (
                  workNotes.map(note => (
                    <Col xs={24} sm={12} md={8} lg={6} key={note.id}>
                      {renderNoteCard(note)}
                    </Col>
                  ))
                ) : (
                  <Col span={24}>
                    {workNotes.map(renderNoteListItem)}
                  </Col>
                )}
              </Row>
            )}
          </Spin>
        </Content>
      </Layout>

      {/* 编辑器 */}
      <ModernWorkNoteEditor
        visible={editorVisible}
        note={editingNote}
        onClose={() => {
          setEditorVisible(false);
          setEditingNote(null);
        }}
        onSave={() => {
          loadWorkNotes();
          setEditorVisible(false);
          setEditingNote(null);
        }}
      />

      {/* 查看器 */}
      <ModernWorkNoteViewer
        visible={viewerVisible}
        note={selectedNote}
        onClose={() => {
          setViewerVisible(false);
          setSelectedNote(null);
        }}
        onEdit={(note) => {
          setViewerVisible(false);
          handleEditNote(note);
        }}
      />

      <WorkNoteConversionModal
        visible={conversionVisible}
        workNote={convertingNote}
        onClose={() => {
          setConversionVisible(false);
          setConvertingNote(null);
        }}
        onConversionSuccess={handleConversionSuccess}
      />
    </Layout>
  );

  // eslint-disable-next-line no-unreachable
};

export default ModernDocumentManagerPage;