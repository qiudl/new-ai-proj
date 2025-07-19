import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Plus, Edit3, CheckCircle, Circle, AlertCircle, ChevronDown, ChevronRight, Filter, BarChart3, X } from 'lucide-react';

// 模拟任务管理器类
class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.updates = new Map();
    this.timeline = new Map();
    this.initSampleData();
  }

  initSampleData() {
    // 初始化示例数据
    const sampleTasks = [
      {
        id: "task_001",
        title: "项目环境搭建",
        description: "搭建开发环境，包括Docker配置",
        status: "in_progress",
        assignee_id: 1,
        created_at: "2025-07-19T10:00:00Z",
        updated_at: "2025-07-19T14:30:00Z",
        due_date: "2025-07-20",
        start_date: "2025-07-19",
        completed_at: null,
        parent_id: null,
        children: ["task_001_1", "task_001_2", "task_001_3"],
        level: 0,
        custom_fields: {
          priority: "high",
          estimated_hours: 8,
          actual_hours: 3,
          progress: 40,
          tags: ["环境", "Docker"],
          category: "基础设施",
          difficulty: 6
        }
      },
      {
        id: "task_001_1",
        title: "安装Docker环境",
        description: "在开发机器上安装Docker Desktop",
        status: "completed",
        assignee_id: 1,
        created_at: "2025-07-19T10:15:00Z",
        updated_at: "2025-07-19T12:00:00Z",
        due_date: "2025-07-19",
        start_date: "2025-07-19",
        completed_at: "2025-07-19T12:00:00Z",
        parent_id: "task_001",
        children: [],
        level: 1,
        custom_fields: {
          priority: "high",
          estimated_hours: 2,
          actual_hours: 1.5,
          progress: 100,
          tags: ["Docker", "安装"],
          category: "环境配置",
          difficulty: 3
        }
      },
      {
        id: "task_001_2",
        title: "配置Docker Compose文件",
        description: "创建docker-compose.yml配置文件",
        status: "in_progress",
        assignee_id: 1,
        created_at: "2025-07-19T10:15:00Z",
        updated_at: "2025-07-19T14:30:00Z",
        due_date: "2025-07-20",
        start_date: "2025-07-19",
        completed_at: null,
        parent_id: "task_001",
        children: [],
        level: 1,
        custom_fields: {
          priority: "high",
          estimated_hours: 4,
          actual_hours: 1.5,
          progress: 30,
          tags: ["Docker", "配置"],
          category: "环境配置",
          difficulty: 7
        }
      },
      {
        id: "task_001_3",
        title: "环境测试验证",
        description: "验证Docker环境是否正常工作",
        status: "todo",
        assignee_id: 1,
        created_at: "2025-07-19T10:15:00Z",
        updated_at: "2025-07-19T10:15:00Z",
        due_date: "2025-07-20",
        start_date: null,
        completed_at: null,
        parent_id: "task_001",
        children: [],
        level: 1,
        custom_fields: {
          priority: "medium",
          estimated_hours: 2,
          actual_hours: 0,
          progress: 0,
          tags: ["测试", "验证"],
          category: "质量保证",
          difficulty: 4
        }
      },
      {
        id: "task_002",
        title: "数据库设计",
        description: "设计项目数据库表结构",
        status: "todo",
        assignee_id: 1,
        created_at: "2025-07-19T10:00:00Z",
        updated_at: "2025-07-19T10:00:00Z",
        due_date: "2025-07-21",
        start_date: null,
        completed_at: null,
        parent_id: null,
        children: [],
        level: 0,
        custom_fields: {
          priority: "high",
          estimated_hours: 16,
          actual_hours: 0,
          progress: 0,
          tags: ["数据库", "设计"],
          category: "架构设计",
          difficulty: 8
        }
      }
    ];

    sampleTasks.forEach(task => {
      this.tasks.set(task.id, task);
    });

    // 添加示例时间轴事件
    const timelineEvents = [
      {
        id: "event_001",
        task_id: "task_001",
        event_type: "created",
        event_date: "2025-07-19T10:00:00Z",
        user_id: 1,
        description: "创建任务：项目环境搭建",
        metadata: {},
        is_milestone: true
      },
      {
        id: "event_002",
        task_id: "task_001_1",
        event_type: "completed",
        event_date: "2025-07-19T12:00:00Z",
        user_id: 1,
        description: "完成子任务：安装Docker环境",
        metadata: {},
        is_milestone: false
      }
    ];

    timelineEvents.forEach(event => {
      this.timeline.set(event.id, event);
    });
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  updateTaskStatus(taskId, status, notes = '') {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      task.updated_at = new Date().toISOString();
      if (status === 'completed') {
        task.completed_at = new Date().toISOString();
        task.custom_fields.progress = 100;
      }
      this.tasks.set(taskId, task);
      
      this.addTimelineEvent(taskId, 'updated', `状态更新为：${status}`, { notes });
      return task;
    }
    return null;
  }

  updateTaskProgress(taskId, progress) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.custom_fields.progress = progress;
      task.updated_at = new Date().toISOString();
      
      if (progress === 100 && task.status !== 'completed') {
        task.status = 'completed';
        task.completed_at = new Date().toISOString();
      } else if (progress > 0 && task.status === 'todo') {
        task.status = 'in_progress';
      }
      
      this.tasks.set(taskId, task);
      this.addTimelineEvent(taskId, 'updated', `进度更新为：${progress}%`);
      return task;
    }
    return null;
  }

  addTimelineEvent(taskId, eventType, description, metadata = {}) {
    const eventId = Date.now().toString();
    const event = {
      id: eventId,
      task_id: taskId,
      event_type: eventType,
      event_date: new Date().toISOString(),
      user_id: 1,
      description: description,
      metadata: metadata,
      is_milestone: false
    };
    this.timeline.set(eventId, event);
  }

  getTaskTimeline(taskId) {
    return Array.from(this.timeline.values())
      .filter(event => event.task_id === taskId)
      .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
  }

  createTask(taskData, parentId = null) {
    const taskId = `task_${Date.now()}`;
    const now = new Date().toISOString();
    
    let level = 0;
    if (parentId) {
      const parentTask = this.tasks.get(parentId);
      if (parentTask) {
        level = parentTask.level + 1;
        parentTask.children.push(taskId);
        this.tasks.set(parentId, parentTask);
      }
    }

    const task = {
      id: taskId,
      title: taskData.title,
      description: taskData.description || '',
      status: 'todo',
      assignee_id: 1,
      created_at: now,
      updated_at: now,
      due_date: taskData.due_date || null,
      start_date: null,
      completed_at: null,
      parent_id: parentId,
      children: [],
      level: level,
      custom_fields: {
        priority: taskData.priority || 'medium',
        estimated_hours: taskData.estimated_hours || 0,
        actual_hours: 0,
        progress: 0,
        tags: taskData.tags || [],
        category: taskData.category || '',
        difficulty: 5
      }
    };

    this.tasks.set(taskId, task);
    this.addTimelineEvent(taskId, 'created', `创建任务：${task.title}`, {}, true);
    return task;
  }

  updateTask(taskId, updates, notes = '') {
    const task = this.tasks.get(taskId);
    if (task) {
      Object.keys(updates).forEach(key => {
        if (key.includes('.')) {
          const [mainKey, subKey] = key.split('.');
          if (task[mainKey] && typeof task[mainKey] === 'object') {
            task[mainKey][subKey] = updates[key];
          }
        } else {
          task[key] = updates[key];
        }
      });
      task.updated_at = new Date().toISOString();
      this.tasks.set(taskId, task);
      
      this.addTimelineEvent(taskId, 'updated', `任务详情已更新`, { notes });
      return task;
    }
    return null;
  }
}

const TaskManagementSystem = () => {
  const [taskManager] = useState(() => new TaskManager());
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedTasks, setExpandedTasks] = useState(new Set(['task_001']));
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    refreshTasks();
  }, []);

  const refreshTasks = () => {
    setTasks(taskManager.getAllTasks());
  };

  const handleStatusUpdate = (taskId, status) => {
    taskManager.updateTaskStatus(taskId, status);
    refreshTasks();
  };

  const handleProgressUpdate = (taskId, progress) => {
    taskManager.updateTaskProgress(taskId, parseInt(progress));
    refreshTasks();
  };

  const toggleTaskExpanded = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'todo':
        return <Circle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未设置';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return task.level === 0;
    return task.status === filterStatus && task.level === 0;
  });

  const CreateTaskForm = () => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      estimated_hours: 0,
      tags: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.title.trim()) return;
      
      const taskData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };
      
      taskManager.createTask(taskData, editingTask?.parent_id || null);
      refreshTasks();
      setShowCreateForm(false);
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
        estimated_hours: 0,
        tags: ''
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            {editingTask?.parent_id ? '创建子任务' : '创建新任务'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">任务标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-2 border rounded"
                rows="3"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">截止日期</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">优先级</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="urgent">紧急</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">预估工时</label>
              <input
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({...formData, estimated_hours: parseInt(e.target.value) || 0})}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">标签 (用逗号分隔)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="例如：前端,React,UI"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTask(null);
                }}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                创建任务
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const TaskDetailModal = ({ task, onClose, onUpdate }) => {
    const [activeDetailTab, setActiveDetailTab] = useState('details');
    const [editForm, setEditForm] = useState({
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      priority: task.custom_fields.priority,
      estimated_hours: task.custom_fields.estimated_hours
    });

    const timeline = taskManager.getTaskTimeline(task.id);

    const handleSave = () => {
      const updates = {
        title: editForm.title,
        description: editForm.description,
        due_date: editForm.due_date,
        'custom_fields.priority': editForm.priority,
        'custom_fields.estimated_hours': editForm.estimated_hours
      };
      
      taskManager.updateTask(task.id, updates, '详情更新');
      onUpdate();
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              {getStatusIcon(task.status)}
              <div>
                <h2 className="text-xl font-semibold">{task.title}</h2>
                <p className="text-sm text-gray-500">任务ID: {task.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex border-b">
            <button
              onClick={() => setActiveDetailTab('details')}
              className={`px-6 py-3 font-medium ${
                activeDetailTab === 'details'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              任务详情
            </button>
            <button
              onClick={() => setActiveDetailTab('timeline')}
              className={`px-6 py-3 font-medium ${
                activeDetailTab === 'timeline'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              更新历史
            </button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeDetailTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">任务标题</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">截止日期</label>
                      <input
                        type="date"
                        value={editForm.due_date || ''}
                        onChange={(e) => setEditForm({...editForm, due_date: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">优先级</label>
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                      >
                        <option value="low">低优先级</option>
                        <option value="medium">中优先级</option>
                        <option value="high">高优先级</option>
                        <option value="urgent">紧急</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">任务描述</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                        rows="4"
                        placeholder="详细描述任务内容..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">预估工时 (小时)</label>
                      <input
                        type="number"
                        value={editForm.estimated_hours}
                        onChange={(e) => setEditForm({...editForm, estimated_hours: parseInt(e.target.value) || 0})}
                        className="w-full p-3 border rounded-lg"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">任务状态</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">当前状态</label>
                      <select
                        value={task.status}
                        onChange={(e) => {
                          taskManager.updateTaskStatus(task.id, e.target.value, '状态更新');
                          onUpdate();
                        }}
                        className="w-full p-2 border rounded"
                      >
                        <option value="todo">待办</option>
                        <option value="in_progress">进行中</option>
                        <option value="completed">已完成</option>
                        <option value="cancelled">已取消</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">完成进度</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={task.custom_fields.progress}
                          onChange={(e) => {
                            taskManager.updateTaskProgress(task.id, parseInt(e.target.value));
                            onUpdate();
                          }}
                          className="flex-1"
                        />
                        <span className="w-12 text-sm font-medium">
                          {task.custom_fields.progress}%
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">实际工时</label>
                      <input
                        type="number"
                        value={task.custom_fields.actual_hours}
                        onChange={(e) => {
                          const updates = { 'custom_fields.actual_hours': parseInt(e.target.value) || 0 };
                          taskManager.updateTask(task.id, updates);
                          onUpdate();
                        }}
                        className="w-full p-2 border rounded"
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                </div>

                {task.custom_fields.tags && task.custom_fields.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">标签</h3>
                    <div className="flex flex-wrap gap-2">
                      {task.custom_fields.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    保存更改
                  </button>
                </div>
              </div>
            )}

            {activeDetailTab === 'timeline' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">更新历史</h3>
                {timeline.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">暂无更新记录</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((event) => (
                      <div key={event.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                        <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                          event.event_type === 'created' ? 'bg-green-500' :
                          event.event_type === 'completed' ? 'bg-blue-500' :
                          event.event_type === 'updated' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{event.description}</p>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatDateTime(event.event_date)}
                            </span>
                          </div>
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="mt-1 text-xs text-gray-600">
                              {event.metadata.notes && (
                                <p>备注: {event.metadata.notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTaskTree = (task) => {
    const isExpanded = expandedTasks.has(task.id);
    const hasChildren = task.children && task.children.length > 0;
    const childTasks = hasChildren ? task.children.map(id => taskManager.getTask(id)).filter(Boolean) : [];

    return (
      <div key={task.id} className="border rounded-lg mb-4 bg-white shadow-sm">
        <div className={`p-4 border-l-4 ${task.custom_fields.priority === 'high' ? 'border-red-400' : 
          task.custom_fields.priority === 'medium' ? 'border-yellow-400' : 'border-green-400'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {hasChildren && (
                <button 
                  onClick={() => toggleTaskExpanded(task.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              )}
              
              {getStatusIcon(task.status)}
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.custom_fields.priority)}`}>
                    {task.custom_fields.priority}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>截止：{formatDate(task.due_date)}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{task.custom_fields.estimated_hours}h</span>
                  </span>
                  <span>进度：{task.custom_fields.progress}%</span>
                </div>

                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${task.custom_fields.progress}%` }}
                      ></div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={task.custom_fields.progress}
                      onChange={(e) => handleProgressUpdate(task.id, e.target.value)}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <select
                value={task.status}
                onChange={(e) => handleStatusUpdate(task.id, e.target.value)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="todo">待办</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
              
              <button
                onClick={() => setSelectedTask(task)}
                className="p-2 text-gray-400 hover:text-blue-500"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {task.custom_fields.tags && task.custom_fields.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.custom_fields.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div className="border-t bg-gray-50 p-4">
            <div className="space-y-3">
              {childTasks.map(childTask => (
                <div key={childTask.id} className="flex items-center justify-between p-3 bg-white rounded border-l-2 border-gray-300">
                  <div className="flex items-center space-x-3 flex-1">
                    {getStatusIcon(childTask.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium text-sm ${childTask.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                          {childTask.title}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(childTask.custom_fields.priority)}`}>
                          {childTask.custom_fields.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{childTask.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full"
                            style={{ width: `${childTask.custom_fields.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{childTask.custom_fields.progress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={childTask.custom_fields.progress}
                      onChange={(e) => handleProgressUpdate(childTask.id, e.target.value)}
                      className="w-16"
                    />
                    <select
                      value={childTask.status}
                      onChange={(e) => handleStatusUpdate(childTask.id, e.target.value)}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      <option value="todo">待办</option>
                      <option value="in_progress">进行中</option>
                      <option value="completed">已完成</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => {
                setEditingTask({ parent_id: task.id });
                setShowCreateForm(true);
              }}
              className="mt-3 flex items-center space-x-1 text-blue-500 hover:text-blue-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>添加子任务</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const overdueTasks = tasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false;
      return new Date(t.due_date) < new Date();
    }).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.custom_fields.estimated_hours || 0), 0);
    const totalActualHours = tasks.reduce((sum, task) => sum + (task.custom_fields.actual_hours || 0), 0);

    const recentActivities = Array.from(taskManager.timeline.values())
      .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
      .slice(0, 8);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">项目仪表板</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>最后更新: {new Date().toLocaleString('zh-CN')}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">总任务数</p>
                <p className="text-3xl font-bold text-gray-900">{totalTasks}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">已完成</p>
                <p className="text-3xl font-bold text-green-600">{completedTasks}</p>
                <div className="flex items-center mt-2">
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">{completionRate}%</span>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">进行中</p>
                <p className="text-3xl font-bold text-blue-600">{inProgressTasks}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">逾期任务</p>
                <p className="text-3xl font-bold text-red-600">{overdueTasks}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-semibold mb-6">项目完成率</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">{completionRate}%</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  completionRate >= 80 ? 'bg-green-100 text-green-800' :
                  completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {completionRate >= 80 ? '优秀' : completionRate >= 60 ? '良好' : '需要改进'}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-1000"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{completedTasks}</p>
                  <p className="text-xs text-gray-500">已完成</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{inProgressTasks}</p>
                  <p className="text-xs text-gray-500">进行中</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-600">{todoTasks}</p>
                  <p className="text-xs text-gray-500">待开始</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">工时统计</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">预估总工时</p>
                  <p className="text-xl font-bold text-blue-600">{totalEstimatedHours}h</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">实际工时</p>
                  <p className="text-xl font-bold text-green-600">{totalActualHours}h</p>
                </div>
                <Clock className="w-8 h-8 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">工时效率</p>
                  <p className={`text-xl font-bold ${
                    totalEstimatedHours > 0 && totalActualHours <= totalEstimatedHours 
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {totalEstimatedHours > 0 
                      ? Math.round((totalActualHours / totalEstimatedHours) * 100)
                      : 0}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">任务状态分布</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="font-medium">已完成</span>
                </div>
                <span className="text-sm font-medium">{completedTasks}</span>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">进行中</span>
                </div>
                <span className="text-sm font-medium">{inProgressTasks}</span>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                  <span className="font-medium">待办</span>
                </div>
                <span className="text-sm font-medium">{todoTasks}</span>
              </div>

              {overdueTasks > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-red-700">逾期任务</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">{overdueTasks}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">最近活动</h3>
              <button 
                onClick={() => setActiveTab('timeline')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                查看全部
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>暂无活动记录</p>
                </div>
              ) : (
                recentActivities.map(event => {
                  const task = taskManager.getTask(event.task_id);
                  return (
                    <div key={event.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        event.event_type === 'created' ? 'bg-green-500' :
                        event.event_type === 'completed' ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.description}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          {task && (
                            <p className="text-xs text-blue-600 truncate">{task.title}</p>
                          )}
                          <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDateTime(event.event_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    const allEvents = Array.from(taskManager.timeline.values())
      .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">项目时间轴</h3>
        
        <div className="space-y-3">
          {allEvents.map(event => {
            const task = taskManager.getTask(event.task_id);
            return (
              <div key={event.id} className="flex items-start space-x-3 p-3 bg-white rounded border">
                <div className={`w-3 h-3 rounded-full mt-1 ${
                  event.event_type === 'created' ? 'bg-green-500' :
                  event.event_type === 'completed' ? 'bg-blue-500' :
                  'bg-gray-400'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm">{event.description}</p>
                  {task && (
                    <p className="text-xs text-blue-600">任务: {task.title}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{formatDateTime(event.event_date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T2</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">任务管理系统 2.0</h1>
              </div>
              
              <nav className="hidden md:flex space-x-8">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>仪表板</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'tasks'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>任务列表</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'timeline'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>时间轴</span>
                  </div>
                </button>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden lg:flex items-center space-x-4 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{tasks.filter(t => t.status === 'completed').length}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>{tasks.filter(t => t.status === 'in_progress').length}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Circle className="w-4 h-4 text-gray-400" />
                  <span>{tasks.filter(t => t.status === 'todo').length}</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新建任务</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="md:hidden bg-white border-b">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium ${
              activeTab === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'
            }`}
          >
            仪表板
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium ${
              activeTab === 'tasks' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'
            }`}
          >
            任务列表
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium ${
              activeTab === 'timeline' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'
            }`}
          >
            时间轴
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold">任务管理</h2>
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">全部状态</option>
                      <option value="todo">待办</option>
                      <option value="in_progress">进行中</option>
                      <option value="completed">已完成</option>
                      <option value="cancelled">已取消</option>
                    </select>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  显示 {filteredTasks.length} 个任务，共 {tasks.length} 个
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredTasks.length === 0 ? (
                <div className="bg-white rounded-xl border p-12 text-center">
                  <Circle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无任务</h3>
                  <p className="text-gray-500 mb-6">
                    {filterStatus === 'all' ? '还没有创建任何任务' : `暂无${filterStatus === 'todo' ? '待办' : filterStatus === 'in_progress' ? '进行中' : '已完成'}的任务`}
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>创建第一个任务</span>
                  </button>
                </div>
              ) : (
                filteredTasks.map(task => renderTaskTree(task))
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'timeline' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">项目时间轴</h2>
              <div className="flex items-center space-x-2">
                <select className="border rounded-lg px-3 py-2 text-sm">
                  <option>最近7天</option>
                  <option>最近30天</option>
                  <option>全部时间</option>
                </select>
              </div>
            </div>
            {renderTimeline()}
          </div>
        )}
      </main>

      {showCreateForm && <CreateTaskForm />}

      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={refreshTasks}
        />
      )}
    </div>
  );
};

export default TaskManagementSystem;