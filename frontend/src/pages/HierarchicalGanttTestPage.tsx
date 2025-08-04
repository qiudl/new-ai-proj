import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, Alert, Divider, Select, message } from 'antd';
import { 
  BranchesOutlined, 
  ExperimentOutlined, 
  CheckCircleOutlined,
  RocketOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import HierarchicalGanttChart from '../components/HierarchicalGanttChart';
import TaskGanttChart from '../components/TaskGanttChart';
import { Task } from '../types/task';
import { projectService } from '../services/projectService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Project {
  id: number;
  name: string;
  description?: string;
}

const HierarchicalGanttTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState<'original' | 'hierarchical' | 'both'>('hierarchical');

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await projectService.getProjects();
        const projectList = response?.data || [];
        setProjects(projectList);
        
        // 自动选择第一个项目
        if (projectList.length > 0) {
          setSelectedProject(projectList[0]);
        }
      } catch (error) {
        console.error('加载项目失败:', error);
        message.error('加载项目失败');
      }
    };

    loadProjects();
  }, []);

  // 加载项目任务
  useEffect(() => {
    const loadTasks = async () => {
      if (!selectedProject) return;
      
      setLoading(true);
      try {
        const response = await projectService.getProjectTasks(selectedProject.id, {
          page: 1,
          pageSize: 100
        });
        const taskList = response?.data || [];
        setTasks(taskList);
        
        // 自动选择有子任务的第一个任务
        const taskWithChildren = taskList.find(task => 
          taskList.some(t => t.parent_id === task.id)
        );
        
        if (taskWithChildren) {
          setSelectedTask(taskWithChildren);
        } else if (taskList.length > 0) {
          setSelectedTask(taskList[0]);
        }
      } catch (error) {
        console.error('加载任务失败:', error);
        message.error('加载任务失败');
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [selectedProject]);

  // 获取有层级关系的任务列表
  const getHierarchicalTasks = () => {
    const parentTasks = tasks.filter(task => 
      tasks.some(t => t.parent_id === task.id) && !task.parent_id
    );
    return parentTasks;
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate(-1)}
            >
              返回
            </Button>
            <ExperimentOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <div>
              <Title level={3} style={{ margin: 0 }}>
                🎯 层级甘特图功能测试
              </Title>
              <Text type="secondary">
                子任务1：层级关系可视化升级 - 功能验证
              </Text>
            </div>
          </Space>
          <Space>
            <Select
              value={compareMode}
              onChange={setCompareMode}
              style={{ width: 120 }}
            >
              <Option value="hierarchical">层级甘特图</Option>
              <Option value="original">原始甘特图</Option>
              <Option value="both">对比模式</Option>
            </Select>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
            <Text strong style={{ color: '#52c41a' }}>任务300已完成</Text>
          </Space>
        </div>
      </Card>

      {/* 功能介绍 */}
      <Card 
        title={
          <Space>
            <RocketOutlined />
            <span>✨ 新功能特性</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Alert
          message="🎉 层级关系可视化升级完成！"
          description={
            <div>
              <Paragraph>
                <strong>已实现的功能：</strong>
              </Paragraph>
              <ul style={{ marginBottom: 0 }}>
                <li>✅ <strong>任务层级缩进显示</strong> - 每级缩进20px，清晰显示父子关系</li>
                <li>✅ <strong>层级连接线</strong> - 灰色虚线连接父子任务，直观展示结构</li>
                <li>✅ <strong>展开折叠控制</strong> - 点击按钮展开/折叠子任务，支持多级操作</li>
                <li>✅ <strong>层级筛选器</strong> - 滑块控制显示层级深度，L0-L5支持</li>
                <li>✅ <strong>智能统计</strong> - 显示最大层级深度和各层级任务分布</li>
                <li>✅ <strong>父任务增强</strong> - 父任务条更厚、阴影更深，突出重要性</li>
                <li>✅ <strong>层级标识</strong> - 每个任务显示层级标记（L0, L1, L2...）</li>
                <li>✅ <strong>子任务计数</strong> - 显示每个父任务下的子任务数量</li>
              </ul>
            </div>
          }
          type="success"
          showIcon
        />
      </Card>

      {/* 项目和任务选择 */}
      <Card 
        title="🔧 测试配置"
        style={{ marginBottom: '24px' }}
        size="small"
      >
        <Space size="large">
          <div>
            <Text strong>选择项目：</Text>
            <Select
              style={{ width: 200, marginLeft: 8 }}
              value={selectedProject?.id}
              onChange={(projectId) => {
                const project = projects.find(p => p.id === projectId);
                setSelectedProject(project || null);
              }}
              placeholder="选择项目"
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </div>
          
          <div>
            <Text strong>选择根任务：</Text>
            <Select
              style={{ width: 300, marginLeft: 8 }}
              value={selectedTask?.id}
              onChange={(taskId) => {
                const task = tasks.find(t => t.id === taskId);
                setSelectedTask(task || null);
              }}
              placeholder="选择有子任务的根任务"
              loading={loading}
            >
              {getHierarchicalTasks().map(task => {
                const childCount = tasks.filter(t => t.parent_id === task.id).length;
                return (
                  <Option key={task.id} value={task.id}>
                    📁 {task.title} ({childCount}个子任务)
                  </Option>
                );
              })}
            </Select>
          </div>
        </Space>
      </Card>

      {/* 甘特图展示区域 */}
      {selectedTask && selectedProject ? (
        <div>
          {(compareMode === 'hierarchical' || compareMode === 'both') && (
            <Card style={{ marginBottom: compareMode === 'both' ? '24px' : '0' }}>
              <HierarchicalGanttChart
                parentTask={selectedTask}
                projectId={selectedProject.id}
              />
            </Card>
          )}

          {compareMode === 'both' && <Divider>对比分割线</Divider>}

          {(compareMode === 'original' || compareMode === 'both') && (
            <Card>
              <div style={{ position: 'relative' }}>
                {compareMode === 'both' && (
                  <Alert
                    message="原始甘特图（对比用）"
                    type="info"
                    style={{ marginBottom: '16px' }}
                    closable={false}
                  />
                )}
                <TaskGanttChart
                  parentTask={selectedTask}
                  projectId={selectedProject.id}
                />
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <BranchesOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Title level={4} style={{ color: '#8c8c8c' }}>
              {loading ? '加载中...' : '请选择项目和任务'}
            </Title>
            <Text type="secondary">
              {loading ? '正在加载项目任务数据...' : '选择一个有子任务的根任务以查看层级甘特图'}
            </Text>
          </div>
        </Card>
      )}

      {/* 测试说明 */}
      <Card 
        title="📖 测试指南"
        style={{ marginTop: '24px' }}
        size="small"
      >
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <Paragraph strong>
            如何测试层级甘特图功能：
          </Paragraph>
          <ol>
            <li><strong>选择项目：</strong>从下拉列表选择一个包含任务的项目</li>
            <li><strong>选择根任务：</strong>选择一个有子任务的父任务作为根节点</li>
            <li><strong>观察层级显示：</strong>查看任务的缩进、连接线和层级标识</li>
            <li><strong>测试展开折叠：</strong>点击父任务前的箭头按钮</li>
            <li><strong>调整层级深度：</strong>使用滑块控制显示的层级范围</li>
            <li><strong>对比原始版本：</strong>切换到对比模式查看改进效果</li>
          </ol>
          
          <Alert
            message="💡 提示"
            description="如果没有看到合适的测试数据，可以先在项目管理页面创建一些有层级关系的任务。"
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </div>
      </Card>
    </div>
  );
};

export default HierarchicalGanttTestPage;