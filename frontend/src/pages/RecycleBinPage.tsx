import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Space, message, Popconfirm, Typography, Tag } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { SystemService, RecycledProject, RecycledTask, RecycledDocument, RecycledWorkNote, RecycledRequirement, PaginatedResponse } from '../services/systemService';
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps } from 'antd';

const { Title } = Typography;

const RecycleBinPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('projects');
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [workNotesLoading, setWorkNotesLoading] = useState(false);
  const [requirementsLoading, setRequirementsLoading] = useState(false);

  // Projects state
  const [recycledProjects, setRecycledProjects] = useState<RecycledProject[]>([]);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [projectsCurrentPage, setProjectsCurrentPage] = useState(1);
  const projectsPageSize = 20;

  // Tasks state
  const [recycledTasks, setRecycledTasks] = useState<RecycledTask[]>([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [tasksCurrentPage, setTasksCurrentPage] = useState(1);
  const tasksPageSize = 20;

  // Documents state
  const [recycledDocuments, setRecycledDocuments] = useState<RecycledDocument[]>([]);
  const [documentsTotal, setDocumentsTotal] = useState(0);
  const [documentsCurrentPage, setDocumentsCurrentPage] = useState(1);
  const documentsPageSize = 20;

  // Work Notes state
  const [recycledWorkNotes, setRecycledWorkNotes] = useState<RecycledWorkNote[]>([]);
  const [workNotesTotal, setWorkNotesTotal] = useState(0);
  const [workNotesCurrentPage, setWorkNotesCurrentPage] = useState(1);
  const workNotesPageSize = 20;

  // Requirements state
  const [recycledRequirements, setRecycledRequirements] = useState<RecycledRequirement[]>([]);
  const [requirementsTotal, setRequirementsTotal] = useState(0);
  const [requirementsCurrentPage, setRequirementsCurrentPage] = useState(1);
  const requirementsPageSize = 20;

  // Load recycled projects
  const loadRecycledProjects = async (page = 1) => {
    console.log('🚀 [RecycleBinPage] Starting loadRecycledProjects, page:', page);
    setProjectsLoading(true);
    try {
      console.log('🔄 [RecycleBinPage] Calling SystemService.getRecycledProjects...');
      const response: PaginatedResponse<RecycledProject> = await SystemService.getRecycledProjects(page, projectsPageSize);

      console.log('📨 [RecycleBinPage] Received projects response from SystemService:', response);

      // Validate response structure and provide safe defaults
      if (!response) {
        console.warn('❌ [RecycleBinPage] Invalid recycled projects response: no response');
        setRecycledProjects([]);
        setProjectsTotal(0);
        return;
      }

      // Ensure data is an array
      const projectsData = Array.isArray(response.data) ? response.data : [];
      console.log('📁 [RecycleBinPage] Processing projects data:', projectsData.length, 'items');
      
      // Safely extract pagination data with fallbacks
      const paginationData = response.pagination || {};
      const total = typeof (paginationData as any).total === 'number' ? (paginationData as any).total : 0;
      
      console.log('📄 [RecycleBinPage] Projects pagination data - total:', total, 'current page:', page);
      
      setRecycledProjects(projectsData);
      setProjectsTotal(total);
      setProjectsCurrentPage(page);
      
      console.log('✅ [RecycleBinPage] Projects state updated successfully - projects:', projectsData.length, 'total:', total);
    } catch (error) {
      console.error('💥 [RecycleBinPage] Error loading recycled projects:', error);
      message.error('加载回收站项目失败');
      // Set empty array on error to prevent undefined state
      setRecycledProjects([]);
      setProjectsTotal(0);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Load recycled tasks
  const loadRecycledTasks = async (page = 1) => {
    console.log('🚀 [RecycleBinPage] Starting loadRecycledTasks, page:', page);
    setTasksLoading(true);
    try {
      console.log('🔄 [RecycleBinPage] Calling SystemService.getRecycledTasks...');
      const response: PaginatedResponse<RecycledTask> = await SystemService.getRecycledTasks(page, tasksPageSize);

      console.log('📨 [RecycleBinPage] Received response from SystemService:', response);

      // Validate response structure and provide safe defaults
      if (!response) {
        console.warn('❌ [RecycleBinPage] Invalid recycled tasks response: no response');
        setRecycledTasks([]);
        setTasksTotal(0);
        return;
      }

      // Ensure data is an array
      const tasksData = Array.isArray(response.data) ? response.data : [];
      console.log('📋 [RecycleBinPage] Processing tasks data:', tasksData.length, 'items');

      // Safely extract pagination data with fallbacks
      const paginationData = response.pagination || {};
      const total = typeof (paginationData as any).total === 'number' ? (paginationData as any).total : 0;

      console.log('📄 [RecycleBinPage] Pagination data - total:', total, 'current page:', page);

      setRecycledTasks(tasksData);
      setTasksTotal(total);
      setTasksCurrentPage(page);

      console.log('✅ [RecycleBinPage] State updated successfully - tasks:', tasksData.length, 'total:', total);
    } catch (error) {
      console.error('💥 [RecycleBinPage] Error loading recycled tasks:', error);
      message.error('加载回收站任务失败');
      // Set empty array on error to prevent undefined state
      setRecycledTasks([]);
      setTasksTotal(0);
    } finally {
      setTasksLoading(false);
    }
  };

  // Load recycled documents
  const loadRecycledDocuments = async (page = 1) => {
    console.log('🚀 [RecycleBinPage] Starting loadRecycledDocuments, page:', page);
    setDocumentsLoading(true);
    try {
      console.log('🔄 [RecycleBinPage] Calling SystemService.getRecycledDocuments...');
      const response: PaginatedResponse<RecycledDocument> = await SystemService.getRecycledDocuments(page, documentsPageSize);

      console.log('📨 [RecycleBinPage] Received documents response from SystemService:', response);

      if (!response) {
        console.warn('❌ [RecycleBinPage] Invalid recycled documents response: no response');
        setRecycledDocuments([]);
        setDocumentsTotal(0);
        return;
      }

      const documentsData = Array.isArray(response.data) ? response.data : [];
      console.log('📄 [RecycleBinPage] Processing documents data:', documentsData.length, 'items');

      const paginationData = response.pagination || {};
      const total = typeof (paginationData as any).total === 'number' ? (paginationData as any).total : 0;

      console.log('📄 [RecycleBinPage] Documents pagination data - total:', total, 'current page:', page);

      setRecycledDocuments(documentsData);
      setDocumentsTotal(total);
      setDocumentsCurrentPage(page);

      console.log('✅ [RecycleBinPage] Documents state updated successfully - documents:', documentsData.length, 'total:', total);
    } catch (error) {
      console.error('💥 [RecycleBinPage] Error loading recycled documents:', error);
      message.error('加载回收站文档失败');
      setRecycledDocuments([]);
      setDocumentsTotal(0);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Load recycled work notes
  const loadRecycledWorkNotes = async (page = 1) => {
    console.log('🚀 [RecycleBinPage] Starting loadRecycledWorkNotes, page:', page);
    setWorkNotesLoading(true);
    try {
      console.log('🔄 [RecycleBinPage] Calling SystemService.getRecycledWorkNotes...');
      const response: PaginatedResponse<RecycledWorkNote> = await SystemService.getRecycledWorkNotes(page, workNotesPageSize);

      console.log('📨 [RecycleBinPage] Received work notes response from SystemService:', response);

      if (!response) {
        console.warn('❌ [RecycleBinPage] Invalid recycled work notes response: no response');
        setRecycledWorkNotes([]);
        setWorkNotesTotal(0);
        return;
      }

      const workNotesData = Array.isArray(response.data) ? response.data : [];
      console.log('📝 [RecycleBinPage] Processing work notes data:', workNotesData.length, 'items');

      const paginationData = response.pagination || {};
      const total = typeof (paginationData as any).total === 'number' ? (paginationData as any).total : 0;

      console.log('📄 [RecycleBinPage] Work notes pagination data - total:', total, 'current page:', page);

      setRecycledWorkNotes(workNotesData);
      setWorkNotesTotal(total);
      setWorkNotesCurrentPage(page);

      console.log('✅ [RecycleBinPage] Work notes state updated successfully - notes:', workNotesData.length, 'total:', total);
    } catch (error) {
      console.error('💥 [RecycleBinPage] Error loading recycled work notes:', error);
      message.error('加载回收站工作笔记失败');
      setRecycledWorkNotes([]);
      setWorkNotesTotal(0);
    } finally {
      setWorkNotesLoading(false);
    }
  };

  // Load recycled requirements
  const loadRecycledRequirements = async (page = 1) => {
    console.log('🚀 [RecycleBinPage] Starting loadRecycledRequirements, page:', page);
    setRequirementsLoading(true);
    try {
      console.log('🔄 [RecycleBinPage] Calling SystemService.getRecycledRequirements...');
      const response: PaginatedResponse<RecycledRequirement> = await SystemService.getRecycledRequirements(page, requirementsPageSize);

      console.log('📨 [RecycleBinPage] Received requirements response from SystemService:', response);

      if (!response) {
        console.warn('❌ [RecycleBinPage] Invalid recycled requirements response: no response');
        setRecycledRequirements([]);
        setRequirementsTotal(0);
        return;
      }

      const requirementsData = Array.isArray(response.data) ? response.data : [];
      console.log('📋 [RecycleBinPage] Processing requirements data:', requirementsData.length, 'items');

      const paginationData = response.pagination || {};
      const total = typeof (paginationData as any).total === 'number' ? (paginationData as any).total : 0;

      console.log('📄 [RecycleBinPage] Requirements pagination data - total:', total, 'current page:', page);

      setRecycledRequirements(requirementsData);
      setRequirementsTotal(total);
      setRequirementsCurrentPage(page);

      console.log('✅ [RecycleBinPage] Requirements state updated successfully - requirements:', requirementsData.length, 'total:', total);
    } catch (error) {
      console.error('💥 [RecycleBinPage] Error loading recycled requirements:', error);
      message.error('加载回收站需求失败');
      setRecycledRequirements([]);
      setRequirementsTotal(0);
    } finally {
      setRequirementsLoading(false);
    }
  };

  // Restore project
  const handleRestoreProject = async (id: number) => {
    try {
      await SystemService.restoreProject(id);
      message.success('项目恢复成功');
      loadRecycledProjects(projectsCurrentPage);
    } catch (error) {
      message.error('项目恢复失败');
      console.error('Error restoring project:', error);
    }
  };

  // Permanently delete project
  const handleHardDeleteProject = async (id: number) => {
    try {
      await SystemService.hardDeleteProject(id);
      message.success('项目已永久删除');
      loadRecycledProjects(projectsCurrentPage);
    } catch (error) {
      message.error('永久删除项目失败');
      console.error('Error hard deleting project:', error);
    }
  };

  // Restore task
  const handleRestoreTask = async (id: number) => {
    try {
      await SystemService.restoreTask(id);
      message.success('任务恢复成功');
      loadRecycledTasks(tasksCurrentPage);
    } catch (error) {
      message.error('任务恢复失败');
      console.error('Error restoring task:', error);
    }
  };

  // Permanently delete task
  const handleHardDeleteTask = async (id: number) => {
    try {
      await SystemService.hardDeleteTask(id);
      message.success('任务已永久删除');
      loadRecycledTasks(tasksCurrentPage);
    } catch (error) {
      message.error('永久删除任务失败');
      console.error('Error hard deleting task:', error);
    }
  };

  // Restore document
  const handleRestoreDocument = async (id: number) => {
    try {
      await SystemService.restoreDocument(id);
      message.success('文档恢复成功');
      loadRecycledDocuments(documentsCurrentPage);
    } catch (error) {
      message.error('文档恢复失败');
      console.error('Error restoring document:', error);
    }
  };

  // Permanently delete document
  const handleHardDeleteDocument = async (id: number) => {
    try {
      await SystemService.hardDeleteDocument(id);
      message.success('文档已永久删除');
      loadRecycledDocuments(documentsCurrentPage);
    } catch (error) {
      message.error('永久删除文档失败');
      console.error('Error hard deleting document:', error);
    }
  };

  // Restore work note
  const handleRestoreWorkNote = async (id: number) => {
    try {
      await SystemService.restoreWorkNote(id);
      message.success('工作笔记恢复成功');
      loadRecycledWorkNotes(workNotesCurrentPage);
    } catch (error) {
      message.error('工作笔记恢复失败');
      console.error('Error restoring work note:', error);
    }
  };

  // Permanently delete work note
  const handleHardDeleteWorkNote = async (id: number) => {
    try {
      await SystemService.hardDeleteWorkNote(id);
      message.success('工作笔记已永久删除');
      loadRecycledWorkNotes(workNotesCurrentPage);
    } catch (error) {
      message.error('永久删除工作笔记失败');
      console.error('Error hard deleting work note:', error);
    }
  };

  // Restore requirement
  const handleRestoreRequirement = async (id: number) => {
    try {
      await SystemService.restoreRequirement(id);
      message.success('需求恢复成功');
      loadRecycledRequirements(requirementsCurrentPage);
    } catch (error) {
      message.error('需求恢复失败');
      console.error('Error restoring requirement:', error);
    }
  };

  // Permanently delete requirement
  const handleHardDeleteRequirement = async (id: number) => {
    try {
      await SystemService.hardDeleteRequirement(id);
      message.success('需求已永久删除');
      loadRecycledRequirements(requirementsCurrentPage);
    } catch (error) {
      message.error('永久删除需求失败');
      console.error('Error hard deleting requirement:', error);
    }
  };

  // Project columns
  const projectColumns: unknown[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建者',
      dataIndex: 'owner_username',
      key: 'owner_username',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '删除时间',
      dataIndex: 'deleted_at',
      key: 'deleted_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '已删除任务数',
      dataIndex: 'deleted_tasks_count',
      key: 'deleted_tasks_count',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            
            icon={<ReloadOutlined />}
            onClick={() => handleRestoreProject(record.id)}
          >
            恢复
          </Button>
          <Popconfirm
            title="确认永久删除"
            description="此操作不可撤销，确定要永久删除这个项目吗？"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleHardDeleteProject(record.id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="primary"
              danger
              
              icon={<DeleteOutlined />}
            >
              永久删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Task columns
  const taskColumns: unknown[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '所属项目',
      dataIndex: 'project_name',
      key: 'project_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          todo: '待办',
          in_progress: '进行中',
          completed: '已完成',
          cancelled: '已取消',
        };
        return statusMap[status as keyof typeof statusMap] || status;
      },
    },
    {
      title: '负责人',
      dataIndex: 'assignee_username',
      key: 'assignee_username',
      render: (text) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '删除时间',
      dataIndex: 'deleted_at',
      key: 'deleted_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"

            icon={<ReloadOutlined />}
            onClick={() => handleRestoreTask(record.id)}
          >
            恢复
          </Button>
          <Popconfirm
            title="确认永久删除"
            description="此操作不可撤销，确定要永久删除这个任务吗？"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleHardDeleteTask(record.id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="primary"
              danger

              icon={<DeleteOutlined />}
            >
              永久删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Document columns
  const documentColumns: unknown[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '所属项目',
      dataIndex: 'project_name',
      key: 'project_name',
      render: (text) => text || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          markdown: 'Markdown',
          txt: '文本',
          pdf: 'PDF',
        };
        return <Tag>{typeMap[type as keyof typeof typeMap] || type}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          draft: '草稿',
          published: '已发布',
          archived: '已归档',
        };
        const colorMap = {
          draft: 'default',
          published: 'success',
          archived: 'warning',
        };
        return <Tag color={colorMap[status as keyof typeof colorMap]}>{statusMap[status as keyof typeof statusMap] || status}</Tag>;
      },
    },
    {
      title: '创建者',
      dataIndex: 'owner_name',
      key: 'owner_name',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '删除时间',
      dataIndex: 'deleted_at',
      key: 'deleted_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => handleRestoreDocument(record.id)}
          >
            恢复
          </Button>
          <Popconfirm
            title="确认永久删除"
            description="此操作不可撤销，确定要永久删除这个文档吗？"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleHardDeleteDocument(record.id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
            >
              永久删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Work Note columns
  const workNoteColumns: unknown[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '笔记标题',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          markdown: 'Markdown',
          text: '文本',
          html: 'HTML',
        };
        return <Tag>{typeMap[type as keyof typeof typeMap] || type}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          draft: '草稿',
          published: '已发布',
          archived: '已归档',
        };
        const colorMap = {
          draft: 'default',
          published: 'success',
          archived: 'warning',
        };
        return <Tag color={colorMap[status as keyof typeof colorMap]}>{statusMap[status as keyof typeof statusMap] || status}</Tag>;
      },
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      render: (visibility) => {
        const visibilityMap = {
          private: '私有',
          team: '团队',
          public: '公开',
        };
        const colorMap = {
          private: 'red',
          team: 'blue',
          public: 'green',
        };
        return <Tag color={colorMap[visibility as keyof typeof colorMap]}>{visibilityMap[visibility as keyof typeof visibilityMap] || visibility}</Tag>;
      },
    },
    {
      title: '创建者',
      dataIndex: 'owner_name',
      key: 'owner_name',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '删除时间',
      dataIndex: 'deleted_at',
      key: 'deleted_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => handleRestoreWorkNote(record.id)}
          >
            恢复
          </Button>
          <Popconfirm
            title="确认永久删除"
            description="此操作不可撤销，确定要永久删除这个工作笔记吗？"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleHardDeleteWorkNote(record.id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
            >
              永久删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Requirement columns
  const requirementColumns: unknown[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '需求编号',
      dataIndex: 'display_id',
      key: 'display_id',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '需求标题',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '所属项目',
      dataIndex: 'project_name',
      key: 'project_name',
      render: (text) => text || '-',
    },
    {
      title: '所属企业',
      dataIndex: 'enterprise_name',
      key: 'enterprise_name',
    },
    {
      title: '提交人',
      dataIndex: 'submitter_name',
      key: 'submitter_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          pending: '待审核',
          approved: '已批准',
          rejected: '已拒绝',
          in_progress: '开发中',
          completed: '已完成',
          cancelled: '已取消',
        };
        const colorMap = {
          pending: 'default',
          approved: 'success',
          rejected: 'error',
          in_progress: 'processing',
          completed: 'success',
          cancelled: 'warning',
        };
        return <Tag color={colorMap[status as keyof typeof colorMap]}>{statusMap[status as keyof typeof statusMap] || status}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => {
        const priorityMap = {
          low: '低',
          medium: '中',
          high: '高',
          urgent: '紧急',
        };
        const colorMap = {
          low: 'default',
          medium: 'blue',
          high: 'orange',
          urgent: 'red',
        };
        return <Tag color={colorMap[priority as keyof typeof colorMap]}>{priorityMap[priority as keyof typeof priorityMap] || priority}</Tag>;
      },
    },
    {
      title: '评论数',
      dataIndex: 'comments_count',
      key: 'comments_count',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '删除时间',
      dataIndex: 'deleted_at',
      key: 'deleted_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '删除人',
      dataIndex: 'deleted_by_name',
      key: 'deleted_by_name',
      render: (text) => text || '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => handleRestoreRequirement(record.id)}
          >
            恢复
          </Button>
          <Popconfirm
            title="确认永久删除"
            description="此操作不可撤销，确定要永久删除这个需求吗？相关的评论和历史记录也将被删除。"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleHardDeleteRequirement(record.id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
            >
              永久删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'projects') {
      loadRecycledProjects(1);
    } else if (activeTab === 'tasks') {
      loadRecycledTasks(1);
    } else if (activeTab === 'documents') {
      loadRecycledDocuments(1);
    } else if (activeTab === 'work-notes') {
      loadRecycledWorkNotes(1);
    } else if (activeTab === 'requirements') {
      loadRecycledRequirements(1);
    }
  }, [activeTab]);

  const tabItems: TabsProps['items'] = [
    {
      key: 'projects',
      label: '项目回收站',
      children: (
        <Table
          columns={projectColumns}
          dataSource={Array.isArray(recycledProjects) ? recycledProjects : []}
          loading={projectsLoading}
          rowKey="id"
          pagination={{
            current: projectsCurrentPage,
            pageSize: projectsPageSize,
            total: projectsTotal,
            onChange: loadRecycledProjects,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
    {
      key: 'tasks',
      label: '任务回收站',
      children: (
        <Table
          columns={taskColumns}
          dataSource={Array.isArray(recycledTasks) ? recycledTasks : []}
          loading={tasksLoading}
          rowKey="id"
          pagination={{
            current: tasksCurrentPage,
            pageSize: tasksPageSize,
            total: tasksTotal,
            onChange: loadRecycledTasks,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
    {
      key: 'documents',
      label: '文档回收站',
      children: (
        <Table
          columns={documentColumns}
          dataSource={Array.isArray(recycledDocuments) ? recycledDocuments : []}
          loading={documentsLoading}
          rowKey="id"
          pagination={{
            current: documentsCurrentPage,
            pageSize: documentsPageSize,
            total: documentsTotal,
            onChange: loadRecycledDocuments,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
    {
      key: 'work-notes',
      label: '笔记回收站',
      children: (
        <Table
          columns={workNoteColumns}
          dataSource={Array.isArray(recycledWorkNotes) ? recycledWorkNotes : []}
          loading={workNotesLoading}
          rowKey="id"
          pagination={{
            current: workNotesCurrentPage,
            pageSize: workNotesPageSize,
            total: workNotesTotal,
            onChange: loadRecycledWorkNotes,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
    {
      key: 'requirements',
      label: '需求回收站',
      children: (
        <Table
          columns={requirementColumns}
          dataSource={Array.isArray(recycledRequirements) ? recycledRequirements : []}
          loading={requirementsLoading}
          rowKey="id"
          pagination={{
            current: requirementsCurrentPage,
            pageSize: requirementsPageSize,
            total: requirementsTotal,
            onChange: loadRecycledRequirements,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>回收站</Title>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
      />
    </div>
  );
};

export default RecycleBinPage;