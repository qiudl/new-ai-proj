import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Tooltip,
  message,
  Badge,
  Typography,
  Select,
  Row,
  Col,
  Divider,
  Popconfirm
} from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  UnorderedListOutlined,
  CloseOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { documentService } from '../services/unifiedDocumentService';
import { Task } from '../types/task';
import ViewSwitcher, { ViewType } from '../components/ViewSwitcher';
import HierarchicalTaskTable, { HierarchicalTaskWithDocument } from '../components/HierarchicalTaskTable';
import { useHierarchicalTasks } from '../hooks/useHierarchicalTasks';
import UnifiedTaskDocumentArea from '../components/UnifiedTaskDocumentArea';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface TaskDocumentInfo extends Task {
  documentExists?: boolean;
  lastModified?: string;
  // 新增文档信息字段
  documentId?: number;
  documentTitle?: string;
  documentDescription?: string;
  documentCreatedAt?: string;
  documentUpdatedAt?: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
}

const TaskDocumentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 视图状态管理
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const viewParam = searchParams.get('view');
    return (viewParam === 'task' || viewParam === 'document') ? viewParam : 'document';
  });
  
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskDocumentInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskDocumentInfo[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [documentFilter, setDocumentFilter] = useState<string | undefined>();

  // 文档预览状态 - 页面内展开
  const [expandedDocumentTask, setExpandedDocumentTask] = useState<HierarchicalTaskWithDocument | null>(null);

  // 层级任务Hook
  const hierarchicalTasks = useHierarchicalTasks();

  // 视图切换处理
  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    // 更新URL参数，保持其他参数不变
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('view', view);
    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);

  // 删除文档处理
  const handleDeleteDocument = async (record: TaskDocumentInfo) => {
    if (!record.documentId) {
      message.warning('该任务没有关联文档');
      return;
    }

    try {
      await documentService.deleteDocument(record.documentId);
      message.success('文档删除成功');

      // 关闭预览（如果正在预览该文档）
      if (expandedDocumentTask?.id === record.id) {
        setExpandedDocumentTask(null);
      }

      // 刷新列表
      loadTasks();
    } catch (error) {
      console.error('删除文档失败:', error);
      message.error('删除文档失败');
    }
  };

  // 使用useRef避免函数依赖导致重复渲染
  const projectsRef = React.useRef<Project[]>([]);
  const tasksRef = React.useRef<TaskDocumentInfo[]>([]);

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    try {
      const response = await projectService.getProjects();
      // projectService.getProjects返回PaginatedResponse<Project>，项目列表在response.data中
      const projectList = Array.isArray(response) ? response : response.data || [];
      setProjects(projectList);
      projectsRef.current = projectList;
    } catch (error) {
      console.error('加载项目列表失败:', error);
      message.error('加载项目列表失败');
    }
  }, []);

  // 加载所有任务 - 使用Ref避免依赖变化
  const loadTasks = useCallback(async () => {
    const currentProjects = projectsRef.current;
    if (currentProjects.length === 0) return;

    setLoading(true);
    console.time('⏱️ 加载所有任务');
    try {
      // 获取所有项目的任务 - 并行加载优化（支持分页）
      console.time('⏱️ 加载项目任务列表');
      const taskPromises = currentProjects.map(async project => {
        try {
          let allProjectTasks: any[] = [];
          let currentPage = 1;
          let totalPages = 1;

          // 循环加载所有分页
          do {
            const response = await TaskService.getTasks(project.id, {
              page: currentPage,
              page_size: 100 // 使用100作为页大小（后端最大限制）
            });

            const pageTasks = response.data || [];
            allProjectTasks = allProjectTasks.concat(pageTasks);

            // 更新分页信息
            if (response.pagination) {
              totalPages = response.pagination.total_pages || 1;
            }

            currentPage++;
          } while (currentPage <= totalPages);

          console.log(`✅ 项目 ${project.name}: 加载了 ${allProjectTasks.length} 个任务（共 ${totalPages} 页）`);

          // 为每个任务添加项目信息
          return allProjectTasks.map(task => ({
            ...task,
            projectName: project.name,
            projectId: project.id
          }));
        } catch (error) {
          console.error(`加载项目 ${project.name} 的任务失败:`, error);
          return [];
        }
      });

      const taskResults = await Promise.all(taskPromises);
      const allTasks: TaskDocumentInfo[] = taskResults.flat();
      console.timeEnd('⏱️ 加载项目任务列表');

      // 批量检查文档状态 - 使用新的批量API（支持分批）
      console.time('⏱️ 批量检查文档状态');
      console.log(`📊 需要检查 ${allTasks.length} 个任务的文档状态`);

      let tasksWithDocumentStatus: TaskDocumentInfo[] = [];

      if (allTasks.length === 0) {
        tasksWithDocumentStatus = [];
      } else {
        try {
          const taskIds = allTasks.map(t => t.id);
          const docStatusMap = new Map<number, any>();

          // 批量API限制：每次最多1000个任务ID
          const BATCH_SIZE = 1000;
          const batches = [];

          for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
            batches.push(taskIds.slice(i, i + BATCH_SIZE));
          }

          console.log(`📦 分成 ${batches.length} 批次处理（每批最多${BATCH_SIZE}个）`);

          // 串行处理每批（避免API压力过大）
          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batchTaskIds = batches[batchIndex];
            console.log(`⏳ 处理第 ${batchIndex + 1}/${batches.length} 批（${batchTaskIds.length}个任务）...`);

            const batchResp = await fetch('/api/v1/documents/batch-status', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ task_ids: batchTaskIds }),
            });

            if (batchResp.ok) {
              const batchData = await batchResp.json();

              // 构建任务ID到文档状态的映射
              if (batchData.success && Array.isArray(batchData.data)) {
                batchData.data.forEach((status: any) => {
                  docStatusMap.set(status.task_id, status);
                  // DEBUG: 追踪任务2254
                  if (status.task_id === 2254) {
                    console.log('🔍 DEBUG 任务2254的批量API返回:', status);
                  }
                });
              }
            } else {
              console.error(`批次 ${batchIndex + 1} 调用失败:`, await batchResp.text());
            }
          }

          // 合并文档状态到任务列表
          tasksWithDocumentStatus = allTasks.map(task => {
            const docStatus = docStatusMap.get(task.id);

            // DEBUG: 追踪任务2254
            if (task.id === 2254) {
              console.log('🔍 DEBUG 任务2254处理前:', { task, docStatus });
            }

            if (docStatus && docStatus.document_exists) {
              const result = {
                ...task,
                documentExists: true,
                documentId: docStatus.document_id,
                documentTitle: docStatus.document_title,
                lastModified: docStatus.document_updated_at,
                documentCreatedAt: docStatus.document_created_at,
                documentUpdatedAt: docStatus.document_updated_at,
              };

              // DEBUG: 追踪任务2254
              if (task.id === 2254) {
                console.log('🔍 DEBUG 任务2254处理后:', result);
              }

              return result;
            } else {
              const result = {
                ...task,
                documentExists: false,
              };

              // DEBUG: 追踪任务2254
              if (task.id === 2254) {
                console.log('🔍 DEBUG 任务2254标记为无文档:', result);
              }

              return result;
            }
          });

          // 统计实际有文档的任务数
          const tasksWithDocs = tasksWithDocumentStatus.filter(t => t.documentExists);
          console.log(`✅ 批量获取成功: ${tasksWithDocs.length} 个任务有文档`);
        } catch (error) {
          console.error('批量检查文档状态失败:', error);
          // 降级：所有任务标记为无文档
          tasksWithDocumentStatus = allTasks.map(task => ({
            ...task,
            documentExists: false,
          }));
        }
      }
      console.timeEnd('⏱️ 批量检查文档状态');

      setTasks(tasksWithDocumentStatus);
      setFilteredTasks(tasksWithDocumentStatus);
      tasksRef.current = tasksWithDocumentStatus;
      console.timeEnd('⏱️ 加载所有任务');
    } catch (error) {
      console.error('加载任务列表失败:', error);
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, []); // 移除projects依赖，使用projectsRef

  // 检查是否是ID搜索
  const isIdSearch = (query: string): boolean => {
    return query.startsWith('#') && /^#\d+$/.test(query);
  };

  // 筛选任务 - 使用Ref避免依赖变化
  const filterTasks = useCallback(() => {
    let filtered = [...tasksRef.current];

    // 关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim();

      if (isIdSearch(keyword)) {
        // ID搜索 (格式: #123)
        const id = parseInt(keyword.substring(1));
        if (!isNaN(id)) {
          filtered = filtered.filter(task => task.id === id);
        }
      } else {
        // 常规搜索
        const lowerKeyword = keyword.toLowerCase();
        filtered = filtered.filter(task =>
          task.title.toLowerCase().includes(lowerKeyword) ||
          task.description?.toLowerCase().includes(lowerKeyword) ||
          task.id.toString().includes(keyword) // 也支持纯数字ID搜索
        );
      }
    }

    // 项目筛选
    if (selectedProject) {
      filtered = filtered.filter(task => task.project_id === selectedProject);
    }

    // 状态筛选
    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // 文档状态筛选
    if (documentFilter === 'with-doc') {
      filtered = filtered.filter(task => task.documentExists);
    } else if (documentFilter === 'without-doc') {
      filtered = filtered.filter(task => !task.documentExists);
    }

    // 分离有文档和无文档的任务，只对有文档的进行排序
    const tasksWithDocs = filtered.filter(task => task.documentExists && task.documentId);
    const tasksWithoutDocs = filtered.filter(task => !task.documentExists || !task.documentId);

    // 对有文档的任务排序：优先按最后更新时间降序，其次按文档ID降序
    tasksWithDocs.sort((a, b) => {
      // 首先按文档更新时间降序（最新的在前）
      const aTime = a.documentUpdatedAt || a.lastModified || '';
      const bTime = b.documentUpdatedAt || b.lastModified || '';

      if (aTime && bTime) {
        const timeCompare = new Date(bTime).getTime() - new Date(aTime).getTime();
        if (timeCompare !== 0) return timeCompare;
      }

      // 如果时间相同或缺失，按文档ID降序
      return (b.documentId || 0) - (a.documentId || 0);
    });

    console.log('📊 任务排序结果:', {
      总任务数: filtered.length,
      有文档任务数: tasksWithDocs.length,
      无文档任务数: tasksWithoutDocs.length,
      前5个有文档任务: tasksWithDocs.slice(0, 5).map(t => ({
        id: t.id,
        docId: t.documentId,
        更新时间: t.documentUpdatedAt || t.lastModified,
        title: t.title
      }))
    });

    // 合并：有文档的在前，无文档的在后
    setFilteredTasks([...tasksWithDocs, ...tasksWithoutDocs]);
  }, [searchKeyword, selectedProject, statusFilter, documentFilter]); // 移除tasks依赖

  // 初始化加载
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 当projects加载完成后，加载任务（只执行一次）
  useEffect(() => {
    if (projects.length > 0) {
      loadTasks();
    }
  }, [projects.length]); // 只依赖长度变化

  // 筛选条件变化时重新筛选
  useEffect(() => {
    filterTasks();
  }, [filterTasks]);

  // 加载层级任务数据 - 只在任务视图下加载
  useEffect(() => {
    if (projects.length > 0 && currentView === 'task') {
      const projectIds = projects.map(p => p.id);
      hierarchicalTasks.loadTasks(projectIds);
    }
  }, [projects.length, currentView]); // 移除hierarchicalTasks依赖

  // 层级任务事件处理
  const handleTaskClick = useCallback((task: HierarchicalTaskWithDocument) => {
    navigate(`/projects/${task.project_id}/tasks/${task.id}`);
  }, [navigate]);

  const handleDocumentView = useCallback((task: HierarchicalTaskWithDocument | null) => {
    // 改为页面内展开模式
    if (!task) {
      // 收起预览
      setExpandedDocumentTask(null);
    } else if (expandedDocumentTask?.id === task.id) {
      // 如果点击的是已展开的任务，则收起
      setExpandedDocumentTask(null);
    } else {
      // 展开新任务的文档预览
      setExpandedDocumentTask(task);
    }
  }, [expandedDocumentTask]);

  const handleDocumentEdit = useCallback((task: HierarchicalTaskWithDocument) => {
    if (task.documentCount > 0) {
      navigate(`/projects/${task.project_id}/tasks/${task.id}?tab=document`);
    } else {
      navigate(`/projects/${task.project_id}/tasks/${task.id}?action=create-document`);
    }
  }, [navigate]);

  const handleProjectView = useCallback((task: HierarchicalTaskWithDocument) => {
    navigate(`/projects/${task.project_id}`);
  }, [navigate]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' };
      case 'in_progress':
        return { color: 'processing', icon: <SyncOutlined spin />, text: '进行中' };
      case 'todo':
        return { color: 'default', icon: <ClockCircleOutlined />, text: '待开始' };
      case 'cancelled':
        return { color: 'error', icon: <ExclamationCircleOutlined />, text: '已取消' };
      default:
        return { color: 'default', icon: <ClockCircleOutlined />, text: status };
    }
  };

  const columns = [
    {
      title: '文档ID',
      dataIndex: 'documentId',
      key: 'documentId',
      width: 100,
      sorter: (a: TaskDocumentInfo, b: TaskDocumentInfo) => {
        // 只对有文档ID的任务排序
        const aVal = a.documentId || 0;
        const bVal = b.documentId || 0;
        // 如果两个都没有文档ID，保持原顺序
        if (aVal === 0 && bVal === 0) return 0;
        // 如果只有一个没有文档ID，没有的排在后面
        if (aVal === 0) return 1;
        if (bVal === 0) return -1;
        // 都有值时，按文档ID降序
        return bVal - aVal;
      },
      render: (documentId: number | undefined, record: TaskDocumentInfo) => {
        if (!documentId) {
          return <Text type="secondary">无文档</Text>;
        }
        return (
          <Button
            type="link"
            style={{
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: '#1890ff',
              padding: 0,
              height: 'auto'
            }}
            onClick={() => {
              // 点击文档ID，页面内展开预览
              if (expandedDocumentTask?.id === record.id) {
                setExpandedDocumentTask(null);
              } else {
                setExpandedDocumentTask(record as any);
              }
            }}
          >
            #{documentId}
          </Button>
        );
      },
    },
    {
      title: '文档名称',
      dataIndex: 'documentTitle',
      key: 'documentTitle',
      width: 350,
      sorter: (a: TaskDocumentInfo, b: TaskDocumentInfo) => 
        (a.documentTitle || '').localeCompare(b.documentTitle || ''),
      render: (documentTitle: string | undefined, record: TaskDocumentInfo) => {
        const displayTitle = documentTitle || record.title;
        const projectName = (record as any).projectName;
        const taskId = record.id;
        const taskTitle = record.title;
        
        // 如果任务名称和文档名称一致，则不显示任务名称
        const showTaskTitle = documentTitle && documentTitle !== taskTitle;
        
        return (
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {displayTitle}
              {!documentTitle && <Text type="secondary" style={{ marginLeft: 8 }}>(无文档)</Text>}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {projectName} · 任务#{taskId}
              {showTaskTitle && <span> · {taskTitle}</span>}
            </Text>
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: (a: TaskDocumentInfo, b: TaskDocumentInfo) => a.status.localeCompare(b.status),
      filters: [
        { text: '待开始', value: 'todo' },
        { text: '进行中', value: 'in_progress' },
        { text: '已完成', value: 'completed' },
        { text: '已取消', value: 'cancelled' },
      ],
      onFilter: (value: any, record: TaskDocumentInfo) => record.status === value,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '文档状态',
      key: 'documentStatus',
      width: 140,
      sorter: (a: TaskDocumentInfo, b: TaskDocumentInfo) => {
        // 有文档的排在前面
        if (a.documentExists && !b.documentExists) return -1;
        if (!a.documentExists && b.documentExists) return 1;
        return 0;
      },
      filters: [
        { text: '有文档', value: 'with-doc' },
        { text: '无文档', value: 'without-doc' },
      ],
      onFilter: (value: any, record: TaskDocumentInfo) => {
        if (value === 'with-doc') return record.documentExists || false;
        if (value === 'without-doc') return !record.documentExists;
        return true;
      },
      render: (_: unknown, record: TaskDocumentInfo) => (
        <Space direction="vertical" size={2}>
          {record.documentExists ? (
            <Badge status="success" text="有文档" />
          ) : (
            <Badge status="default" text="无文档" />
          )}
          {record.lastModified && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              更新: {dayjs(record.lastModified).format('MM-DD HH:mm')}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: (a: TaskDocumentInfo, b: TaskDocumentInfo) => 
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: TaskDocumentInfo) => (
        <Space>
          <Tooltip title={expandedDocumentTask?.id === record.id ? "收起文档" : "预览文档"}>
            <Button
              type={expandedDocumentTask?.id === record.id ? "primary" : "text"}
              icon={<EyeOutlined />}
              onClick={() => {
                // 改为页面内展开
                if (expandedDocumentTask?.id === record.id) {
                  setExpandedDocumentTask(null);
                } else {
                  setExpandedDocumentTask(record as any);
                }
              }}
            />
          </Tooltip>
          <Tooltip title="编辑任务文档">
            <Button
              type="text"
              
              icon={<EditOutlined />}
              onClick={() => {
                if (record.documentExists) {
                  // 如果文档存在，跳转到任务详情页的文档标签
                  navigate(`/projects/${record.project_id}/tasks/${record.id}?tab=document`);
                } else {
                  // 如果文档不存在，跳转到任务详情页创建文档
                  navigate(`/projects/${record.project_id}/tasks/${record.id}?action=create-document`);
                }
              }}
            />
          </Tooltip>
          <Tooltip title="打开项目">
            <Button
              type="text"

              icon={<FolderOpenOutlined />}
              onClick={() => navigate(`/projects/${record.project_id}`)}
            />
          </Tooltip>
          {record.documentExists && record.documentId && (
            <Popconfirm
              title="确定删除该文档吗？"
              description="删除后无法恢复，但任务本身不会被删除"
              onConfirm={() => handleDeleteDocument(record)}
              okText="删除"
              cancelText="取消"
              okType="danger"
            >
              <Tooltip title="删除文档">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const documentStats = {
    total: filteredTasks.length,
    withDoc: filteredTasks.filter(task => task.documentExists).length,
    withoutDoc: filteredTasks.filter(task => !task.documentExists).length,
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          任务文档管理
        </Title>
        <Text type="secondary">
          管理和查看所有任务的文档，支持任务视图和文档视图切换
        </Text>
      </div>

      {/* 视图切换器 */}
      <ViewSwitcher 
        currentView={currentView}
        onViewChange={handleViewChange}
      />

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                {documentStats.total}
              </div>
              <div style={{ color: '#666' }}>总任务数</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                {documentStats.withDoc}
              </div>
              <div style={{ color: '#666' }}>有文档任务</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                {documentStats.withoutDoc}
              </div>
              <div style={{ color: '#666' }}>无文档任务</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="300px">
            <Search
              placeholder="搜索任务名称、描述或输入#ID搜索..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              prefix={<SearchOutlined />}
              style={{ width: '100%' }}
            />
          </Col>
          <Col flex="150px">
            <Select
              placeholder="选择项目"
              value={selectedProject}
              onChange={setSelectedProject}
              allowClear
              style={{ width: '100%' }}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col flex="120px">
            <Select
              placeholder="任务状态"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="todo">待开始</Option>
              <Option value="in_progress">进行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Col>
          <Col flex="120px">
            <Select
              placeholder="文档状态"
              value={documentFilter}
              onChange={setDocumentFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="with-doc">有文档</Option>
              <Option value="without-doc">无文档</Option>
            </Select>
          </Col>
          <Col>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchKeyword('');
                setSelectedProject(undefined);
                setStatusFilter(undefined);
                setDocumentFilter(undefined);
              }}
            >
              清空筛选
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 任务列表/文档列表 */}
      <Card>
        {currentView === 'document' ? (
          <Table
            columns={columns}
            dataSource={filteredTasks}
            rowKey="id"
            loading={loading}
            pagination={{
              total: filteredTasks.length,
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个任务`,
            }}
            scroll={{ x: 1000 }}
            expandable={{
              expandedRowKeys: expandedDocumentTask ? [expandedDocumentTask.id] : [],
              onExpand: (expanded, record) => {
                if (expanded) {
                  setExpandedDocumentTask(record as any);
                } else {
                  setExpandedDocumentTask(null);
                }
              },
              expandedRowRender: (record) => (
                <div style={{
                  padding: 16,
                  backgroundColor: '#f0f5ff',
                  border: '2px solid #1890ff',
                  borderRadius: 8,
                  margin: '8px 0'
                }}>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                      📄 任务文档预览 - #{record.id} {record.title}
                    </span>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => setExpandedDocumentTask(null)}
                    >
                      收起
                    </Button>
                  </div>
                  <div style={{ backgroundColor: 'white', padding: 16, borderRadius: 4 }}>
                    <UnifiedTaskDocumentArea
                      projectId={record.project_id}
                      taskId={record.id}
                      height="600px"
                      defaultViewMode="preview"
                      showToolbar={true}
                      showDocumentList={true}
                      compactMode={false}
                      headerVisible={true}
                      includeSubtaskDocuments={false}
                    />
                  </div>
                </div>
              ),
              expandIcon: () => null, // 隐藏默认的展开图标，我们用按钮控制
            }}
          />
        ) : (
          <HierarchicalTaskTable
            tasks={hierarchicalTasks.tasks}
            loading={hierarchicalTasks.loading}
            expandedDocumentTaskId={expandedDocumentTask?.id}
            onExpand={hierarchicalTasks.expandNode}
            onCollapse={hierarchicalTasks.collapseNode}
            onTaskClick={handleTaskClick}
            onDocumentView={handleDocumentView}
            onDocumentEdit={handleDocumentEdit}
            onProjectView={handleProjectView}
          />
        )}
      </Card>
    </div>
  );
};

export default TaskDocumentListPage;