import React, { useState } from 'react';
import { Button, Input, Card, message, Steps, Alert } from 'antd';
import { ImportOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectSelector from '../components/ProjectSelector';
import TaskSelector from '../components/TaskSelector';
import { Project } from '../types/project';
import { Task } from '../types/task';

const { TextArea } = Input;

const BulkImportPage: React.FC = () => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(
    urlProjectId ? parseInt(urlProjectId) : undefined
  );
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<number | undefined>();
  const [selectedParentTask, setSelectedParentTask] = useState<Task | undefined>();
  const [currentStep, setCurrentStep] = useState(0);
  const [jsonData, setJsonData] = useState('');
  const [parsedTasks, setParsedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleProjectChange = (projectId: number, project?: Project) => {
    setSelectedProjectId(projectId);
    setSelectedProject(project);
    // Reset parent task selection when project changes
    setSelectedParentTaskId(undefined);
    setSelectedParentTask(undefined);
    // Reset form when project changes
    setCurrentStep(0);
    setJsonData('');
    setParsedTasks([]);
    // Update URL if needed
    if (urlProjectId) {
      navigate(`/projects/${projectId}/bulk-import`);
    }
  };

  const handleParentTaskChange = (taskId: number | undefined, task?: Task) => {
    setSelectedParentTaskId(taskId);
    setSelectedParentTask(task);
    // Reset form when parent task changes
    setCurrentStep(0);
    setJsonData('');
    setParsedTasks([]);
  };

  const steps = [
    {
      title: '粘贴JSON数据',
      description: '将从Claude获得的JSON数据粘贴到文本框中',
    },
    {
      title: '预览任务',
      description: '确认解析的任务数据是否正确',
    },
    {
      title: '导入完成',
      description: '任务已成功导入到项目中',
    },
  ];

  const handleJsonParse = () => {
    if (!jsonData.trim()) {
      message.error('请输入JSON数据');
      return;
    }

    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed)) {
        setParsedTasks(parsed);
        setCurrentStep(1);
        message.success(`成功解析 ${parsed.length} 个任务`);
      } else {
        message.error('JSON数据格式不正确，请确保是一个任务数组');
      }
    } catch (error) {
      message.error('JSON格式不正确，请检查数据格式');
    }
  };

  const handleImport = async () => {
    if (!selectedProjectId) {
      message.error('请先选择一个项目');
      return;
    }

    setLoading(true);
    
    try {
      // Import taskService
      const { TaskService } = await import('../services/taskService');
      
      console.log('Importing to project:', selectedProjectId, 'tasks:', parsedTasks.length);
      
      // Format data according to BulkImportRequest
      const bulkImportRequest = {
        tasks: parsedTasks.map(task => ({
          title: task.title,
          description: task.description || '',
          status: task.status || 'todo',
          assignee_id: task.assignee_id || undefined,
          due_date: task.due_date ? task.due_date + 'T00:00:00Z' : undefined,
          custom_fields: task.custom_fields || {},
          // 如果用户选择了父任务，且当前任务没有parent_id，则设置为选择的父任务
          parent_id: task.parent_id || selectedParentTaskId || undefined,
          sort_order: task.sort_order || undefined
        }))
      };

      const result = await TaskService.bulkImportTasks(
        selectedProjectId,
        bulkImportRequest
      );
      
      setCurrentStep(2);
      message.success(`成功导入 ${result.success_count} 个任务`);
    } catch (error) {
      console.error('Import error:', error);
      message.error(error instanceof Error ? error.message : '导入失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToTasks = () => {
    if (selectedProjectId) {
      navigate(`/projects/${selectedProjectId}/tasks`);
    } else {
      navigate('/task-list');
    }
  };

  const sampleJson = `[
  {
    "title": "新功能开发计划",
    "description": "开发新的用户界面功能",
    "status": "todo",
    "assignee_id": 1,
    "due_date": "2025-08-01",
    "custom_fields": {
      "priority": "high",
      "estimated_hours": 40,
      "tags": ["功能开发", "前端"]
    }
  },
  {
    "title": "UI组件设计",
    "description": "设计新的用户界面组件",
    "status": "todo",
    "parent_id": 1,
    "assignee_id": 1,
    "due_date": "2025-07-22",
    "custom_fields": {
      "priority": "high",
      "estimated_hours": 16,
      "tags": ["设计", "组件", "子任务"]
    }
  },
  {
    "title": "前端代码实现",
    "description": "实现前端界面代码",
    "status": "todo",
    "parent_id": 1,
    "assignee_id": 1,
    "due_date": "2025-07-28",
    "custom_fields": {
      "priority": "medium",
      "estimated_hours": 20,
      "tags": ["前端", "开发", "子任务"]
    }
  },
  {
    "title": "功能测试",
    "description": "测试新功能的各项指标",
    "status": "todo",
    "parent_id": 1,
    "assignee_id": 1,
    "due_date": "2025-07-30",
    "custom_fields": {
      "priority": "medium",
      "estimated_hours": 4,
      "tags": ["测试", "验收", "子任务"]
    }
  },
  {
    "title": "API接口对接",
    "description": "与后端API进行接口对接",
    "status": "todo",
    "due_date": "2025-07-26",
    "custom_fields": {
      "priority": "medium",
      "estimated_hours": 8,
      "tags": ["API", "集成"]
    }
  },
  {
    "title": "文档编写",
    "description": "编写功能使用文档",
    "status": "todo",
    "due_date": "2025-08-02",
    "custom_fields": {
      "priority": "low",
      "estimated_hours": 4,
      "tags": ["文档", "说明"]
    }
  }
]`;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">批量导入任务</h1>
        <p className="page-description">选择项目和父任务（可选），批量导入任务</p>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 项目选择行 */}
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
          
          {/* 父任务选择行 */}
          {selectedProjectId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 auto' }}>
                <label style={{ marginRight: '8px', fontWeight: 500 }}>父任务 (可选):</label>
                <TaskSelector
                  projectId={selectedProjectId}
                  value={selectedParentTaskId}
                  onChange={handleParentTaskChange}
                  style={{ width: 300 }}
                  placeholder="选择父任务 (留空则为根任务)"
                  allowClear
                />
              </div>
              {selectedParentTask && (
                <div style={{ 
                  flex: '1 1 auto', 
                  color: '#666',
                  padding: '8px 12px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '6px',
                  border: '1px solid #bae7ff'
                }}>
                  <span style={{ color: '#1890ff', fontWeight: 500 }}>
                    作为子任务导入到: {selectedParentTask.title}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {!selectedProjectId && (
        <Card>
          <Alert
            message="请先选择项目"
            description="批量导入功能需要选择一个项目，请在上方选择器中选择要导入任务的项目。"
            type="info"
            showIcon
            style={{ textAlign: 'center' }}
          />
        </Card>
      )}

      <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

      {selectedProjectId && currentStep === 0 && (
        <div className="import-container">
          <Card title="粘贴JSON数据" style={{ marginBottom: 16 }}>
            <Alert
              message="使用说明"
              description={
                <>
                  请将从Claude获得的JSON格式任务数据粘贴到下方文本框中。数据应该是一个包含任务信息的JSON数组。
                  <br /><br />
                  <strong>层级任务支持：</strong>
                  <br />• 使用上方的"父任务"选择器，可以将所有导入的任务作为某个现有任务的子任务
                  <br />• 或在JSON中使用 parent_id 字段指定每个任务的父任务（parent_id 对应父任务在数组中的索引位置，从1开始）
                  <br />• 两种方式可以结合使用，JSON中的 parent_id 会优先于父任务选择器
                </>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <TextArea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="请粘贴JSON数据..."
              className="import-textarea"
              rows={12}
            />
            
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                type="default"
                onClick={() => setJsonData(sampleJson)}
              >
                使用示例数据
              </Button>
              <Button 
                type="primary" 
                icon={<ImportOutlined />}
                onClick={handleJsonParse}
                disabled={!selectedProjectId}
              >
                解析JSON
              </Button>
            </div>
          </Card>
        </div>
      )}

      {selectedProjectId && currentStep === 1 && (
        <div className="import-container">
          <Card title={
            `预览任务 (${parsedTasks.length} 个) ${
              parsedTasks.some(t => t.parent_id) || selectedParentTaskId ? '- 包含层级结构' : ''
            } ${selectedParentTaskId ? `- 将导入为子任务` : ''}`
          } style={{ marginBottom: 16 }}>
            {/* 显示父任务选择信息 */}
            {selectedParentTask && (
              <Alert
                message="父任务信息"
                description={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>所有导入的任务将作为</span>
                    <span style={{ 
                      backgroundColor: '#e6f7ff', 
                      border: '1px solid #91d5ff',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontWeight: 500,
                      color: '#1890ff'
                    }}>
                      {selectedParentTask.title}
                    </span>
                    <span>的子任务导入</span>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            
            <div className="import-preview">
              {(() => {
                // Organize tasks by hierarchy
                const rootTasks = parsedTasks.filter(task => !task.parent_id);
                const childTasks = parsedTasks.filter(task => task.parent_id);
                const childrenMap = new Map();
                
                // Group children by parent_id
                childTasks.forEach(child => {
                  const parentId = child.parent_id;
                  if (!childrenMap.has(parentId)) {
                    childrenMap.set(parentId, []);
                  }
                  childrenMap.get(parentId).push(child);
                });

                const renderTask = (task: any, index: number, isChild = false) => (
                  <div key={`${task.parent_id || 'root'}-${index}`} className="task-item" style={{ 
                    marginLeft: isChild ? '24px' : '0',
                    borderLeft: isChild ? '2px solid #1890ff' : 'none',
                    paddingLeft: isChild ? '12px' : '0',
                    position: 'relative'
                  }}>
                    {isChild && (
                      <div style={{
                        position: 'absolute',
                        left: '-2px',
                        top: '8px',
                        width: '8px',
                        height: '2px',
                        backgroundColor: '#1890ff'
                      }} />
                    )}
                    <div className="task-title" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {isChild && <span style={{ color: '#1890ff', fontSize: '12px' }}>└─</span>}
                      {!isChild && childrenMap.has(index + 1) && <span style={{ color: '#52c41a', fontSize: '12px' }}>📁</span>}
                      {task.title}
                    </div>
                    <div className="task-description">{task.description}</div>
                    <div className="task-meta">
                      <span>状态: {task.status}</span>
                      <span>截止时间: {task.due_date}</span>
                      {(task.parent_id || selectedParentTaskId) && (
                        <span style={{ color: '#1890ff' }}>
                          子任务 {task.parent_id ? `(父任务ID: ${task.parent_id})` : 
                                   selectedParentTaskId ? `(父任务: ${selectedParentTask?.title})` : ''}
                        </span>
                      )}
                      {task.custom_fields?.priority && (
                        <span>优先级: {task.custom_fields.priority}</span>
                      )}
                      {task.custom_fields?.estimated_hours && (
                        <span>预估工时: {task.custom_fields.estimated_hours}h</span>
                      )}
                    </div>
                  </div>
                );

                return (
                  <>
                    {rootTasks.map((task, index) => (
                      <div key={index}>
                        {renderTask(task, index + 1)}
                        {childrenMap.has(index + 1) && 
                          childrenMap.get(index + 1).map((child: any, childIndex: number) => 
                            renderTask(child, childIndex, true)
                          )
                        }
                      </div>
                    ))}
                    {childTasks.filter(child => !rootTasks.some((_, i) => i + 1 === child.parent_id)).map((orphanChild, index) => (
                      <div key={`orphan-${index}`}>
                        {renderTask(orphanChild, index, true)}
                        <div style={{ color: '#ff4d4f', fontSize: '12px', marginLeft: '24px' }}>
                          ⚠️ 注意：父任务ID {orphanChild.parent_id} 在当前导入列表中不存在
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
            
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(0)}>
                返回修改
              </Button>
              <Button 
                type="primary" 
                loading={loading}
                onClick={handleImport}
              >
                确认导入
              </Button>
            </div>
          </Card>
        </div>
      )}

      {selectedProjectId && currentStep === 2 && (
        <div className="import-container">
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
              <h2>导入成功！</h2>
              <p style={{ color: '#8c8c8c', marginBottom: 32 }}>
                已成功导入 {parsedTasks.length} 个任务到项目中
              </p>
              <Button type="primary" onClick={handleBackToTasks}>
                查看任务列表
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BulkImportPage;