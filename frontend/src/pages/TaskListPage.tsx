import React, { useState, useEffect } from 'react';
import { Button, Space, Card, message, Switch, Row, Col } from 'antd';
import { PlusOutlined, AppstoreOutlined, MenuOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectSelector from '../components/ProjectSelector';
import EnhancedTaskTable from '../components/EnhancedTaskTable';
import HierarchicalTaskList from '../components/HierarchicalTaskList';
import TaskModal from '../components/TaskModal';
import { Project } from '../types/project';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';

const TaskListPage: React.FC = () => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(
    urlProjectId ? parseInt(urlProjectId) : undefined
  );
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isHierarchicalView, setIsHierarchicalView] = useState(false);
  const [parentTask, setParentTask] = useState<Task | undefined>(undefined);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks();
    }
  }, [selectedProjectId]);

  const handleProjectChange = (projectId: number, project?: Project) => {
    setSelectedProjectId(projectId);
    setSelectedProject(project);
    // Update URL if needed
    if (urlProjectId) {
      navigate(`/projects/${projectId}/task-list`);
    }
  };

  const fetchTasks = async () => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }

    try {
      setLoading(true);
      const result = await TaskService.getTasks(selectedProjectId);
      setTasks(result.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTask(undefined);
    setParentTask(undefined);
    setModalVisible(true);
  };

  const handleCreateSubTask = (parent: Task) => {
    setEditingTask(undefined);
    setParentTask(parent);
    setModalVisible(true);
  };

  const handleView = (task: Task) => {
    if (selectedProjectId) {
      navigate(`/projects/${selectedProjectId}/tasks/${task.id}`);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setParentTask(undefined);
    setModalVisible(true);
  };

  const handleDelete = async (task: Task) => {
    if (!selectedProjectId) return;
    
    try {
      await TaskService.deleteTask(selectedProjectId, task.id);
      message.success('删除成功');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      message.error('删除失败');
    }
  };

  const handleModalSuccess = async (values: any) => {
    try {
      if (!selectedProjectId) {
        message.error('请先选择项目');
        return;
      }

      // 如果是创建子任务，添加父任务ID
      if (parentTask) {
        values.parent_id = parentTask.id;
      }

      if (editingTask) {
        await TaskService.updateTask(selectedProjectId, editingTask.id, values);
        message.success('任务更新成功');
      } else {
        await TaskService.createTask(selectedProjectId, values);
        message.success(parentTask ? '子任务创建成功' : '任务创建成功');
      }
      
      setModalVisible(false);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      message.error(editingTask ? '更新任务失败' : '创建任务失败');
    }
  };

  return (
    <div className="task-list-page" style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 项目选择卡片 - 增强样式 */}
      <Card 
        style={{ 
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '12px',
          border: 'none'
        }}
      >
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} sm={12} md={10} lg={8}>
            <div>
              <label style={{ 
                display: 'block',
                marginBottom: '8px', 
                fontWeight: 600,
                color: '#262626',
                fontSize: '16px'
              }}>
                选择项目
              </label>
              <ProjectSelector
                value={selectedProjectId}
                onChange={handleProjectChange}
                style={{ width: '100%' }}
                placeholder="请先选择一个项目"
                allowClear
              />
            </div>
          </Col>
          
          {selectedProject && (
            <Col xs={24} sm={12} md={14} lg={16}>
              <div style={{ 
                padding: '16px 20px',
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '8px',
                color: '#389e0d',
                boxShadow: '0 2px 4px rgba(56,158,13,0.1)'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                  <strong>当前项目:</strong> {selectedProject.name}
                </div>
                {selectedProject.description && (
                  <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: '1.4' }}>
                    {selectedProject.description}
                  </div>
                )}
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {/* 操作栏 */}
      <Card 
        style={{ 
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '8px',
          border: 'none'
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h2 style={{ margin: 0, color: '#262626', fontSize: '20px' }}>
                任务列表
              </h2>
              {selectedProject && (
                <div style={{ 
                  padding: '4px 12px',
                  backgroundColor: '#e6f7ff',
                  border: '1px solid #91d5ff',
                  borderRadius: '16px',
                  fontSize: '14px',
                  color: '#1890ff',
                  fontWeight: 500
                }}>
                  共 {tasks.length} 个任务
                </div>
              )}
            </div>
          </Col>
          
          <Col>
            <Space size="large">
              {/* 视图切换 */}
              {selectedProjectId && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '8px 16px',
                  backgroundColor: '#fafafa',
                  borderRadius: '20px',
                  border: '1px solid #d9d9d9'
                }}>
                  <MenuOutlined 
                    style={{ 
                      color: isHierarchicalView ? '#1890ff' : '#8c8c8c',
                      fontSize: '16px',
                      transition: 'color 0.3s'
                    }} 
                  />
                  <Switch
                    checked={isHierarchicalView}
                    onChange={setIsHierarchicalView}
                    checkedChildren="层级"
                    unCheckedChildren="列表"
                    style={{ fontWeight: 500 }}
                  />
                  <AppstoreOutlined 
                    style={{ 
                      color: !isHierarchicalView ? '#1890ff' : '#8c8c8c',
                      fontSize: '16px',
                      transition: 'color 0.3s'
                    }} 
                  />
                </div>
              )}

              <Button
                type="default"
                onClick={() => navigate(`/projects/${selectedProjectId}/bulk-import`)}
                disabled={!selectedProjectId}
                style={{ height: '40px' }}
              >
                批量导入
              </Button>
              
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                disabled={!selectedProjectId}
                size="large"
                style={{ 
                  height: '40px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(24,144,255,0.3)'
                }}
              >
                新建任务
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 任务内容区域 */}
      {selectedProjectId ? (
        <Card
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            border: 'none',
            minHeight: '500px'
          }}
        >
          {isHierarchicalView ? (
            <div>
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px 16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '6px',
                border: '1px solid #bae7ff'
              }}>
                <strong style={{ color: '#1890ff' }}>层级视图</strong>
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  点击箭头图标展开/折叠子任务，点击 + 号添加子任务，点击 ⋯ 进行更多操作
                </span>
              </div>
              <HierarchicalTaskList
                projectId={selectedProjectId}
                onEditTask={handleEdit}
                onDeleteTask={handleDelete}
                onCreateSubTask={handleCreateSubTask}
                loading={loading}
              />
            </div>
          ) : (
            <div>
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px 16px',
                backgroundColor: '#f6ffed',
                borderRadius: '6px',
                border: '1px solid #b7eb8f'
              }}>
                <strong style={{ color: '#52c41a' }}>列表视图</strong>
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  支持排序、筛选和搜索功能
                </span>
              </div>
              <EnhancedTaskTable
                tasks={tasks}
                loading={loading}
                selectedProjectId={selectedProjectId}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range?.[0]}-${range?.[1]} 条，共 ${total} 条记录`,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
              />
            </div>
          )}
        </Card>
      ) : (
        <Card
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            border: 'none',
            minHeight: '500px'
          }}
        >
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px',
            color: '#8c8c8c'
          }}>
            <AppstoreOutlined style={{ fontSize: '64px', marginBottom: '24px', color: '#d9d9d9' }} />
            <h3 style={{ color: '#8c8c8c', fontSize: '18px', marginBottom: '12px' }}>
              请先选择一个项目
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
              选择项目后即可查看和管理该项目下的所有任务<br/>
              支持层级视图和列表视图两种展示方式
            </p>
          </div>
        </Card>
      )}

      {/* 任务编辑/创建模态框 */}
      <TaskModal
        visible={modalVisible}
        task={editingTask}
        projectId={selectedProjectId || 0}
        parentTask={parentTask}
        allowParentSelection={!parentTask} // 只有在非子任务创建时才允许选择父任务
        onOk={handleModalSuccess}
        onCancel={() => {
          setModalVisible(false);
          setParentTask(undefined);
        }}
      />
    </div>
  );
};

export default TaskListPage;