// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, message, Steps, Radio } from 'antd';
import { ImportOutlined} from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ProjectSelector from '../components/ProjectSelector';
import TaskSelector from '../components/TaskSelector';
import AIAssistedBulkImport from '../components/AIAssistedBulkImport';
import { Project } from '../types/project';
import { Task } from '../types/task';
import { TaskOption } from '../types/timer';
import { TaskService } from '../services/taskService';
import { GeneratedSubTask } from '../types/aiTaskGenerator';



const BulkImportPage: React.FC = () => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
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
  // AI-assisted import mode - 固定为AI模式
  // const [importMode, setImportMode] = useState<'manual' | 'ai'>('ai');
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<GeneratedSubTask[]>([]);
  
  // Alert 关闭状态管理
  const [closedAlerts, setClosedAlerts] = useState<Set<string>>(new Set());
  
  // 关闭Alert的处理函数
  const handleAlertClose = (alertId: string) => {
    setClosedAlerts(prev => new Set([...prev, alertId]));
  };
  
  // 重新打开Alert的处理函数
  const handleAlertReopen = (alertId: string) => {
    setClosedAlerts(prev => {
      const newSet = new Set([...prev]);
      newSet.delete(alertId);
      return newSet;
    });
  };
  
  // 处理从URL参数预设父任务
  useEffect(() => {
    const parentTaskIdParam = searchParams.get('parentTaskId');
    if (parentTaskIdParam && selectedProjectId) {
      const parentTaskId = parseInt(parentTaskIdParam);
      if (!isNaN(parentTaskId)) {
        setSelectedParentTaskId(parentTaskId);
        // 可以在这里调用API获取父任务详情
        loadParentTaskDetails(selectedProjectId, parentTaskId);
      }
    }
  }, [searchParams, selectedProjectId]);

  // 加载父任务详情
  const loadParentTaskDetails = async (projectId: number, taskId: number) => {
    try {
      const task = await TaskService.getTask(projectId, taskId);
      setSelectedParentTask(task);
      message.success(`已预设父任务: ${task.title}`);
    } catch (error) {
      console.error('加载父任务详情失败:', error);
      message.warning('无法加载父任务详情，请手动选择');
      // 清除无效的父任务ID
      setSelectedParentTaskId(undefined);
    }
  };

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

  const handleParentTaskChange = (taskId: number | undefined, task?: Task | TaskOption) => {
    setSelectedParentTaskId(taskId);
    setSelectedParentTask(task as Task);
    // Reset form when parent task changes
    setCurrentStep(0);
    setJsonData('');
    setParsedTasks([]);
    setAiGeneratedTasks([]);
  };

  // AI-assisted handlers
  const handleAITasksGenerated = (tasks: GeneratedSubTask[]) => {
    setAiGeneratedTasks(tasks);
    message.success(`AI已生成 ${tasks.length} 个任务`);
  };

  const handleAIImport = async (tasks: GeneratedSubTask[], parentTaskId?: number) => {
    if (!selectedProjectId) {
      message.error('请先选择一个项目');
      return;
    }

    setLoading(true);
    
    let uniqueTasks = tasks; // 默认导入所有任务
    
    try {
      // 尝试进行重复检查，如果失败则跳过检查继续导入
      console.log('正在检查重复任务...');
      const existingTasksResponse = await TaskService.getTasks(selectedProjectId);
      const existingTasks = existingTasksResponse.data || [];
      const existingTitles = new Set(existingTasks.map(task => task.title.toLowerCase().trim()));
      
      // Filter out duplicate tasks
      uniqueTasks = tasks.filter(task => {
        const normalizedTitle = task.title.toLowerCase().trim();
        if (existingTitles.has(normalizedTitle)) {
          console.warn(`跳过重复任务: ${task.title}`);
          return false;
        }
        existingTitles.add(normalizedTitle); // Add to set to prevent duplicates within the batch
        return true;
      });

      if (uniqueTasks.length === 0) {
        message.warning('所有任务都已存在，没有新任务需要导入');
        setLoading(false);
        return;
      }

      if (uniqueTasks.length < tasks.length) {
        message.info(`检测到 ${tasks.length - uniqueTasks.length} 个重复任务，将跳过重复任务，继续导入 ${uniqueTasks.length} 个新任务`);
      }
      
      console.log(`重复检查完成：将导入 ${uniqueTasks.length} 个任务`);
    } catch (error) {
      console.warn('重复检查失败，将导入所有任务:', error);
      message.info('无法检查重复任务，将导入所有生成的任务');
      uniqueTasks = tasks; // 如果检查失败，导入所有任务
    }

    try {

      const taskPromises = uniqueTasks.map(async (task) => {
        const taskData = {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          estimated_hours: task.estimatedHours,
          parent_id: parentTaskId || selectedParentTaskId,
          custom_fields: {
            ...task.custom_fields,
            ai_generated: true,
            generation_timestamp: new Date().toISOString()
          }
        };
        
        return await TaskService.createTask(selectedProjectId, taskData);
      });

      await Promise.all(taskPromises);
      message.success(`成功导入 ${uniqueTasks.length} 个AI生成的任务${uniqueTasks.length < tasks.length ? `（跳过 ${tasks.length - uniqueTasks.length} 个重复任务）` : ''}`);
      
      // Navigate to project details page (not project list)
      if (selectedProjectId) {
        navigate(`/projects/${selectedProjectId}`);
      }
    } catch (error: any) {
      console.error('AI导入失败:', error);
      message.error(error.message || 'AI任务导入失败');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: '粘贴JSON数据',
      description: '将从Claude获得的JSON数据粘贴到文本框中'},
    {
      title: '预览任务',
      description: '确认解析的任务数据是否正确'},
    {
      title: '导入完成',
      description: '任务已成功导入到项目中'},
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
      
      
      console.log('Importing to project:', selectedProjectId, 'tasks:', parsedTasks.length);
      
      // First pass: Create tasks without parent relationships
      const createdTasks: any[] = [];
      const tasksToCreate = parsedTasks.map((task, index) => ({
        title: task.title,
        description: task.description || '',
        status: task.status || 'todo',
        assignee_id: task.assignee_id || undefined,
        due_date: task.due_date ? task.due_date + 'T00:00:00Z' : undefined,
        custom_fields: task.custom_fields || {},
        // 如果用户选择了父任务，且当前任务没有parent_id和parent_index，则设置为选择的父任务
        parent_id: task.parent_id || (task.parent_index === undefined ? selectedParentTaskId : undefined),
        sort_order: task.sort_order || undefined,
        // 保存原始索引和parent_index用于后续处理
        _original_index: index,
        _parent_index: task.parent_index
      }));

      // Handle hierarchical relationships using parent_index
      const taskIdMap: { [index: number]: number } = {};
      
      for (let i = 0; i < tasksToCreate.length; i++) {
        const taskData = tasksToCreate[i];
        const parentIndex = taskData._parent_index;
        
        // If this task has a parent_index, wait for parent to be created first
        if (typeof parentIndex === 'number' && parentIndex >= 0 && parentIndex < tasksToCreate.length) {
          // Ensure parent task is created first
          if (!taskIdMap[parentIndex]) {
            const parentTask = { ...tasksToCreate[parentIndex] };
            const { _original_index, _parent_index, ...cleanParentTask } = parentTask;
            
            const parentResult = await TaskService.createTask(selectedProjectId, cleanParentTask);
            taskIdMap[parentIndex] = parentResult.id;
            createdTasks.push(parentResult);
          }
          
          // Set parent_id to the created parent's ID
          taskData.parent_id = taskIdMap[parentIndex];
        }
        
        // Clean up temp fields
        const { _original_index: origIndex, _parent_index: parentIdx, ...cleanTaskData } = taskData;
        
        // Create the task
        if (!taskIdMap[i]) {
          const result = await TaskService.createTask(selectedProjectId, cleanTaskData);
          taskIdMap[i] = result.id;
          createdTasks.push(result);
        }
      }

      // Format response similar to bulk import
      const result = {
        total_tasks: tasksToCreate.length,
        success_count: createdTasks.length,
        failure_count: tasksToCreate.length - createdTasks.length,
        imported_tasks: createdTasks.map(task => task.id)
      };
      
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
      navigate(`/projects/${selectedProjectId}`);
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
    "parent_index": 0,
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
    "parent_index": 0,
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
    "parent_index": 0,
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
          
          {/* 预设父任务提示 */}
          {searchParams.get('parentTaskId') && selectedParentTask && (
            <>
              {!closedAlerts.has('parentTaskAlert') ? (
                <Alert
                  message="已自动设置父任务"
                  description={`将导入的任务作为"${selectedParentTask?.title} (id=${selectedParentTask?.id})"的子任务`}
                  type="info"
                  showIcon
                  closable
                  onClose={() => handleAlertClose('parentTaskAlert')}
                  style={{ marginBottom: '16px' }}
                />
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '16px',
                  padding: '4px 8px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '4px',
                  border: '1px solid #bae7ff'
                }}>
                  <Tooltip title="已自动设置父任务">
                    <Button
                      type="text"
                      size="small"
                      icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
                      onClick={() => handleAlertReopen('parentTaskAlert')}
                    />
                  </Tooltip>
                  <span style={{ fontSize: '12px', color: '#1890ff' }}>父任务已设置</span>
                </div>
              )}
            </>
          )}
          
          {/* 父任务选择行 - 隐藏 */}
          {false && selectedProjectId && (
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
                    作为子任务导入到: {selectedParentTask?.title} (id={selectedParentTask?.id})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {!selectedProjectId && (
        <Card>
          {!closedAlerts.has('projectSelectAlert') ? (
            <Alert
              message="请先选择项目"
              description="批量导入功能需要选择一个项目，请在上方选择器中选择要导入任务的项目。"
              type="info"
              showIcon
              closable
              onClose={() => handleAlertClose('projectSelectAlert')}
              style={{ textAlign: 'center' }}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '4px',
              border: '1px solid #bae7ff'
            }}>
              <Tooltip title="请先选择项目">
                <Button
                  type="text"
                  icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
                  onClick={() => handleAlertReopen('projectSelectAlert')}
                />
              </Tooltip>
              <span style={{ fontSize: '12px', color: '#1890ff' }}>需要选择项目</span>
            </div>
          )}
        </Card>
      )}

      {/* 导入模式选择 - 隐藏 */}
      {false && selectedProjectId && (
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 500, marginRight: '12px' }}>导入模式:</label>
            <Radio.Group 
              value="ai" 
              disabled
              size="large"
            >
              <Radio.Button value="ai">
                <RobotOutlined /> AI智能生成
              </Radio.Button>
              {/* 手动JSON导入模式已注释 */}
              {/* <Radio.Button value="manual">
                <ImportOutlined /> 手动JSON导入
              </Radio.Button> */}
            </Radio.Group>
          </div>
          
          {!closedAlerts.has('aiModeAlert') ? (
            <Alert
              message="AI智能生成模式"
              description="输入关键词和需求描述，AI将自动为您生成相关的任务列表，支持多种AI提供商。"
              type="info"
              showIcon
              closable
              onClose={() => handleAlertClose('aiModeAlert')}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '4px',
              border: '1px solid #bae7ff'
            }}>
              <Tooltip title="AI智能生成模式说明">
                <Button
                  type="text"
                  size="small"
                  icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
                  onClick={() => handleAlertReopen('aiModeAlert')}
                />
              </Tooltip>
              <span style={{ fontSize: '12px', color: '#1890ff' }}>AI智能生成模式</span>
            </div>
          )}
        </Card>
      )}

      {/* AI智能生成模式 - 总是显示 */}
      {selectedProjectId && (
        <AIAssistedBulkImport
          projectId={selectedProjectId}
          onTasksGenerated={handleAITasksGenerated}
          onImport={handleAIImport}
          selectedParentTaskId={selectedParentTaskId}
          selectedParentTask={selectedParentTask}
        />
      )}

      {/* 手动JSON导入模式已注释 */}
      {false && (
        <>
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
                  <br />• 或在JSON中使用 parent_index 字段指定每个任务的父任务（parent_index 对应父任务在数组中的索引位置，从0开始）
                  <br />• 例如：任务索引0是主任务，任务索引1和2设置 "parent_index": 0 即可成为主任务的子任务
                  <br />• 两种方式可以结合使用，JSON中的 parent_index 会优先于父任务选择器
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
                      {selectedParentTask?.title}
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
                返回项目详情
              </Button>
            </div>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default BulkImportPage;