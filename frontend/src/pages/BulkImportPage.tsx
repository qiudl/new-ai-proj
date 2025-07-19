import React, { useState } from 'react';
import { Button, Input, Card, message, Steps, Alert } from 'antd';
import { ImportOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectSelector from '../components/ProjectSelector';
import { Project } from '../types/project';

const { TextArea } = Input;

const BulkImportPage: React.FC = () => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(
    urlProjectId ? parseInt(urlProjectId) : undefined
  );
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [currentStep, setCurrentStep] = useState(0);
  const [jsonData, setJsonData] = useState('');
  const [parsedTasks, setParsedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleProjectChange = (projectId: number, project?: Project) => {
    setSelectedProjectId(projectId);
    setSelectedProject(project);
    // Reset form when project changes
    setCurrentStep(0);
    setJsonData('');
    setParsedTasks([]);
    // Update URL if needed
    if (urlProjectId) {
      navigate(`/projects/${projectId}/bulk-import`);
    }
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
          custom_fields: task.custom_fields || {}
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
    "title": "项目环境搭建",
    "description": "搭建开发环境，包括Docker配置",
    "status": "todo",
    "assignee_id": 1,
    "due_date": "2025-07-20",
    "custom_fields": {
      "priority": "high",
      "estimated_hours": 8,
      "tags": ["环境", "Docker"]
    }
  },
  {
    "title": "数据库设计",
    "description": "设计项目数据库表结构",
    "status": "todo",
    "assignee_id": 1,
    "due_date": "2025-07-21",
    "custom_fields": {
      "priority": "high",
      "estimated_hours": 16,
      "tags": ["数据库", "设计"]
    }
  },
  {
    "title": "API接口开发",
    "description": "开发后端REST API接口",
    "status": "todo",
    "due_date": "2025-07-25",
    "custom_fields": {
      "priority": "medium",
      "estimated_hours": 24,
      "tags": ["API", "后端"]
    }
  },
  {
    "title": "前端页面开发",
    "description": "开发React前端界面",
    "status": "todo",
    "due_date": "2025-07-30",
    "custom_fields": {
      "priority": "medium",
      "estimated_hours": 32,
      "tags": ["前端", "React"]
    }
  },
  {
    "title": "测试和部署",
    "description": "进行系统测试和生产环境部署",
    "status": "todo",
    "due_date": "2025-08-05",
    "custom_fields": {
      "priority": "high",
      "estimated_hours": 12,
      "tags": ["测试", "部署"]
    }
  }
]`;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">批量导入任务</h1>
        <p className="page-description">选择项目并批量导入任务</p>
      </div>

      <Card style={{ marginBottom: '24px' }}>
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
              description="请将从Claude获得的JSON格式任务数据粘贴到下方文本框中。数据应该是一个包含任务信息的JSON数组。"
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
              >
                解析JSON
              </Button>
            </div>
          </Card>
        </div>
      )}

      {selectedProjectId && currentStep === 1 && (
        <div className="import-container">
          <Card title={`预览任务 (${parsedTasks.length} 个)`} style={{ marginBottom: 16 }}>
            <div className="import-preview">
              {parsedTasks.map((task, index) => (
                <div key={index} className="task-item">
                  <div className="task-title">{task.title}</div>
                  <div className="task-description">{task.description}</div>
                  <div className="task-meta">
                    <span>状态: {task.status}</span>
                    <span>截止时间: {task.due_date}</span>
                    {task.custom_fields?.priority && (
                      <span>优先级: {task.custom_fields.priority}</span>
                    )}
                    {task.custom_fields?.estimated_hours && (
                      <span>预估工时: {task.custom_fields.estimated_hours}h</span>
                    )}
                  </div>
                </div>
              ))}
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