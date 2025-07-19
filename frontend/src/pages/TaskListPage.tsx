import React, { useState, useEffect } from 'react';
import { Button, Space, Card, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectSelector from '../components/ProjectSelector';
import EnhancedTaskTable from '../components/EnhancedTaskTable';
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
    setModalVisible(true);
  };

  const handleView = (task: Task) => {
    if (selectedProjectId) {
      navigate(`/projects/${selectedProjectId}/tasks/${task.id}`);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
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

      if (editingTask) {
        await TaskService.updateTask(selectedProjectId, editingTask.id, values);
        message.success('任务更新成功');
      } else {
        await TaskService.createTask(selectedProjectId, values);
        message.success('任务创建成功');
      }
      
      setModalVisible(false);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      message.error(editingTask ? '更新任务失败' : '创建任务失败');
    }
  };



  return (
    <div style={{ padding: '24px' }}>
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ marginRight: '8px', fontWeight: 500 }}>选择项目:</label>
            <ProjectSelector
              value={selectedProjectId}
              onChange={handleProjectChange}
              style={{ width: 300 }}
              placeholder="请先选择一个项目"
            />
          </div>
          {selectedProject && (
            <div style={{ flex: '1 1 auto', color: '#666' }}>
              当前项目: <span style={{ fontWeight: 500 }}>{selectedProject.name}</span>
            </div>
          )}
        </div>
      </Card>

      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h2>任务列表</h2>
        <Space>
          <Button
            type="default"
            onClick={() => navigate(`/projects/${selectedProjectId}/bulk-import`)}
            disabled={!selectedProjectId}
          >
            批量导入
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={!selectedProjectId}
          >
            新建任务
          </Button>
        </Space>
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
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      <TaskModal
        visible={modalVisible}
        task={editingTask}
        projectId={selectedProjectId || 0}
        onOk={handleModalSuccess}
        onCancel={() => setModalVisible(false)}
      />
    </div>
  );
};

export default TaskListPage;