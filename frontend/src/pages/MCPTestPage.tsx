/**
 * MCP接口批量测试页面
 * 用于测试所有MCP相关接口的功能和性能
 */

import React, { useState, useCallback } from 'react';
import {
  Layout,
  Card,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Alert,
  Badge,
  Table,
  Modal,
  Input,
  Form,
  Select,
  Switch,
  Divider,
  Collapse,
  Progress,
  message,
  Tabs,
  Timeline,
  Statistic,
  Tag
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ClearOutlined,
  ExportOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  BugOutlined
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;

interface TestResult {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout';
  duration?: number;
  request?: any;
  response?: any;
  error?: string;
  timestamp?: number;
}

interface TestCase {
  id: string;
  category: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  payload?: any;
  expectedStatus?: number;
  timeout?: number;
  dependencies?: string[];
}

const MCPTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [form] = Form.useForm();

  // 定义所有测试用例 - 基于MCP bridge index.ts中的完整工具列表
  const testCases: TestCase[] = [
    // 系统和认证接口
    {
      id: 'health-check',
      category: '系统监控',
      name: '健康检查',
      description: '测试系统健康状态',
      endpoint: '/health',
      method: 'GET',
      timeout: 3000
    },
    {
      id: 'dev-quick-login',
      category: '系统监控',
      name: '开发环境快速登录',
      description: '测试开发环境JWT获取',
      endpoint: '/api/dev-login',
      method: 'POST',
      payload: { username: 'admin' },
      timeout: 3000
    },
    {
      id: 'get-profile',
      category: '用户管理',
      name: '获取用户信息',
      description: '测试获取当前用户信息',
      endpoint: '/api/v1/users/profile',
      method: 'GET',
      timeout: 3000
    },

    // 项目管理接口
    {
      id: 'list-projects',
      category: '项目管理',
      name: '获取项目列表',
      description: '测试获取所有项目的接口',
      endpoint: '/api/v1/projects',
      method: 'GET',
      timeout: 5000
    },
    {
      id: 'create-project',
      category: '项目管理', 
      name: '创建项目',
      description: '测试创建新项目的接口',
      endpoint: '/api/v1/projects',
      method: 'POST',
      payload: {
        name: `MCP测试项目-${Date.now()}`,
        description: '通过MCP测试页面创建的测试项目'
      },
      timeout: 10000
    },

    // 基础任务管理接口
    {
      id: 'list-tasks',
      category: '任务管理',
      name: '获取任务列表',
      description: '测试获取项目任务列表',
      endpoint: '/api/v1/projects/1/tasks?page=1&page_size=10',
      method: 'GET',
      timeout: 5000
    },
    {
      id: 'create-task',
      category: '任务管理',
      name: '创建任务',
      description: '测试创建新任务',
      endpoint: '/api/v1/projects/1/tasks',
      method: 'POST',
      payload: {
        title: `MCP测试任务-${Date.now()}`,
        description: '通过MCP测试页面创建的测试任务',
        status: 'todo',
        priority: 'medium'
      },
      timeout: 10000
    },
    {
      id: 'update-task',
      category: '任务管理',
      name: '更新任务',
      description: '测试更新任务信息',
      endpoint: '/api/v1/projects/1/tasks/1056',
      method: 'PUT',
      payload: {
        title: '更新的MCP测试任务',
        description: '通过MCP测试页面更新的任务',
        status: 'in_progress'
      },
      timeout: 5000
    },
    {
      id: 'start-task',
      category: '任务管理',
      name: '启动任务',
      description: '测试启动任务状态',
      endpoint: '/api/v1/projects/1/tasks/1056/start',
      method: 'POST',
      payload: {},
      timeout: 5000
    },
    {
      id: 'complete-task',
      category: '任务管理',
      name: '完成任务',
      description: '测试完成任务状态',
      endpoint: '/api/v1/projects/1/tasks/1056/complete',
      method: 'POST',
      payload: {},
      timeout: 5000
    },
    {
      id: 'pause-task',
      category: '任务管理',
      name: '暂停任务',
      description: '测试暂停任务状态',
      endpoint: '/api/v1/projects/1/tasks/1056/pause',
      method: 'POST',
      payload: {},
      timeout: 5000
    },
    {
      id: 'delete-task',
      category: '任务管理',
      name: '删除任务',
      description: '测试删除任务（慎用）',
      endpoint: '/api/v1/projects/1/tasks/9999?force=false',
      method: 'DELETE',
      timeout: 5000
    },
    {
      id: 'move-task',
      category: '任务管理',
      name: '移动任务',
      description: '测试移动任务到其他项目',
      endpoint: '/api/v1/projects/1/tasks/1056/move',
      method: 'POST',
      payload: { target_project_id: 1 },
      timeout: 5000
    },
    {
      id: 'find-task',
      category: '任务管理',
      name: '搜索任务',
      description: '测试按标题搜索任务',
      endpoint: '/api/v1/projects/1/tasks/search?q=MCP测试',
      method: 'GET',
      timeout: 3000
    },
    {
      id: 'get-detailed-task-info',
      category: '任务管理',
      name: '获取任务详细信息',
      description: '测试获取任务详细信息包含层级关系',
      endpoint: '/api/v1/projects/1/tasks/1056/detailed',
      method: 'GET',
      timeout: 3000
    },

    // 子任务和兄弟任务接口
    {
      id: 'create-subtask',
      category: '任务层级',
      name: '创建子任务',
      description: '测试创建子任务',
      endpoint: '/api/v1/projects/1/tasks/1056/subtasks',
      method: 'POST',
      payload: {
        title: `MCP测试子任务-${Date.now()}`,
        description: '通过MCP测试创建的子任务'
      },
      timeout: 5000
    },
    {
      id: 'get-task-children',
      category: '任务层级',
      name: '获取子任务列表',
      description: '测试获取任务的所有子任务',
      endpoint: '/api/v1/projects/1/tasks/1056/children',
      method: 'GET',
      timeout: 3000
    },
    {
      id: 'create-sibling-task',
      category: '任务层级',
      name: '创建兄弟任务',
      description: '测试创建兄弟任务',
      endpoint: '/api/v1/projects/1/tasks/1056/siblings',
      method: 'POST',
      payload: {
        title: `MCP测试兄弟任务-${Date.now()}`,
        description: '通过MCP测试创建的兄弟任务',
        priority: 'medium'
      },
      timeout: 5000
    },

    // 计时器相关接口
    {
      id: 'get-current-timer',
      category: '计时管理',
      name: '获取当前计时器',
      description: '测试获取当前计时器状态',
      endpoint: '/api/v1/user/timer/current',
      method: 'GET',
      timeout: 3000
    },
    {
      id: 'start-timer',
      category: '计时管理',
      name: '启动计时器',
      description: '测试启动任务计时器',
      endpoint: '/api/v1/user/timer/start',
      method: 'POST',
      payload: {
        task_id: 1056,
        description: 'MCP接口测试计时器'
      },
      timeout: 5000
    },
    {
      id: 'stop-timer',
      category: '计时管理',
      name: '停止计时器',
      description: '测试停止当前计时器',
      endpoint: '/api/v1/user/timer/stop',
      method: 'POST',
      payload: {},
      timeout: 5000,
      dependencies: ['start-timer']
    },
    {
      id: 'start-task-with-timer',
      category: '计时管理',
      name: '启动任务并计时',
      description: '测试智能启动任务并开始计时',
      endpoint: '/api/v1/projects/1/tasks/start-with-timer',
      method: 'POST',
      payload: {
        task_id: 1056,
        timer_description: 'MCP智能计时测试'
      },
      timeout: 5000
    },
    {
      id: 'switch-to-task',
      category: '计时管理',
      name: '切换任务',
      description: '测试智能切换到新任务',
      endpoint: '/api/v1/projects/1/tasks/switch',
      method: 'POST',
      payload: {
        new_task_title: 'MCP测试任务'
      },
      timeout: 5000
    },

    // 文档管理接口
    {
      id: 'list-documents',
      category: '文档管理',
      name: '获取文档列表',
      description: '测试获取文档列表',
      endpoint: '/api/v1/documents?page=1&page_size=10',
      method: 'GET',
      timeout: 5000
    },
    {
      id: 'create-document',
      category: '文档管理',
      name: '创建文档',
      description: '测试创建新文档',
      endpoint: '/api/v1/documents',
      method: 'POST',
      payload: {
        title: `MCP测试文档-${Date.now()}`,
        content: '# MCP接口测试文档\n\n这是通过MCP测试页面创建的测试文档。\n\n## 测试内容\n- API响应时间\n- 数据完整性\n- 错误处理\n\n测试时间: ' + new Date().toISOString(),
        type: 'markdown',
        status: 'draft',
        project_id: 1
      },
      timeout: 10000
    },
    {
      id: 'has-task-document',
      category: '文档管理',
      name: '检查任务文档',
      description: '测试检查任务是否有关联文档',
      endpoint: '/api/v1/projects/1/tasks/1056/documents/has',
      method: 'GET',
      timeout: 3000
    },
    {
      id: 'get-task-document',
      category: '文档管理',
      name: '获取任务文档',
      description: '测试获取任务关联文档内容',
      endpoint: '/api/v1/projects/1/tasks/1056/documents',
      method: 'GET',
      timeout: 3000
    },
    {
      id: 'create-and-attach-document',
      category: '文档管理',
      name: '创建并关联文档',
      description: '测试创建文档并关联到任务',
      endpoint: '/api/v1/projects/1/tasks/1056/documents',
      method: 'POST',
      payload: {
        title: `MCP任务文档-${Date.now()}`,
        content: '# 任务文档\n\n## 任务目标\n通过MCP接口测试创建的任务文档\n\n## 测试要点\n- 文档创建功能\n- 任务关联功能\n- 内容格式化\n\n创建时间: ' + new Date().toISOString()
      },
      timeout: 10000
    },
    {
      id: 'delete-task-document',
      category: '文档管理',
      name: '删除任务文档',
      description: '测试删除任务关联文档',
      endpoint: '/api/v1/projects/1/tasks/1056/documents',
      method: 'DELETE',
      timeout: 5000
    },
    {
      id: 'create-batch-documents',
      category: '文档管理',
      name: '批量创建文档',
      description: '测试批量创建文档',
      endpoint: '/api/v1/documents/batch',
      method: 'POST',
      payload: {
        documents: [
          {
            title: `批量文档1-${Date.now()}`,
            content: '# 批量创建测试文档1\n\n这是批量创建的测试文档。',
            task_id: 1056,
            attach_to_task: true
          },
          {
            title: `批量文档2-${Date.now()}`,
            content: '# 批量创建测试文档2\n\n这是批量创建的测试文档。',
            task_id: 1056,
            attach_to_task: true
          }
        ]
      },
      timeout: 15000
    },
    {
      id: 'generate-document-from-template',
      category: '文档管理',
      name: '模板生成文档',
      description: '测试基于模板生成文档',
      endpoint: '/api/v1/documents/generate-from-template',
      method: 'POST',
      payload: {
        template_type: 'bug_report',
        context: {
          task_id: 1056,
          title: 'MCP测试Bug报告',
          requirements: '测试模板生成功能',
          priority: 'medium'
        },
        auto_create: false
      },
      timeout: 10000
    },
    {
      id: 'create-task-docs',
      category: '文档管理',
      name: '批量创建任务文档',
      description: '测试批量为任务创建技术文档',
      endpoint: '/api/v1/tasks/create-docs',
      method: 'POST',
      payload: {
        task_ids: [1056],
        template_type: 'auto',
        auto_attach: true,
        skip_existing: true
      },
      timeout: 15000
    },

    // 工作笔记接口
    {
      id: 'create-work-note',
      category: '工作笔记',
      name: '创建工作笔记',
      description: '测试创建工作笔记',
      endpoint: '/api/v1/work-notes',
      method: 'POST',
      payload: {
        title: `MCP测试工作笔记-${Date.now()}`,
        content: '# 工作笔记\n\n## 今日工作\n- MCP接口测试\n- 功能验证\n\n## 问题记录\n暂无\n\n## 明日计划\n继续测试',
        tags: ['MCP', '测试', '接口'],
        visibility: 'private'
      },
      timeout: 10000
    },
    {
      id: 'list-work-notes',
      category: '工作笔记',
      name: '获取工作笔记列表',
      description: '测试获取工作笔记列表',
      endpoint: '/api/v1/work-notes?page=1&limit=10',
      method: 'GET',
      timeout: 5000
    },
    {
      id: 'search-work-notes',
      category: '工作笔记',
      name: '搜索工作笔记',
      description: '测试搜索工作笔记',
      endpoint: '/api/v1/work-notes/search?q=MCP测试&limit=10',
      method: 'GET',
      timeout: 3000
    },
    {
      id: 'get-work-note',
      category: '工作笔记',
      name: '获取工作笔记详情',
      description: '测试获取单个工作笔记详情',
      endpoint: '/api/v1/work-notes/1',
      method: 'GET',
      timeout: 3000
    },
    {
      id: 'update-work-note',
      category: '工作笔记',
      name: '更新工作笔记',
      description: '测试更新工作笔记内容',
      endpoint: '/api/v1/work-notes/1',
      method: 'PUT',
      payload: {
        title: '更新的MCP测试工作笔记',
        content: '# 更新后的工作笔记\n\n内容已更新。',
        tags: ['MCP', '测试', '更新']
      },
      timeout: 5000
    },
    {
      id: 'create-and-attach-work-note',
      category: '工作笔记',
      name: '创建并关联工作笔记',
      description: '测试创建工作笔记并关联到任务',
      endpoint: '/api/v1/projects/1/tasks/1056/work-notes',
      method: 'POST',
      payload: {
        title: `任务工作笔记-${Date.now()}`,
        content: '# 任务相关工作笔记\n\n## 进展记录\n任务进展顺利\n\n## 技术要点\n- API测试\n- 功能验证'
      },
      timeout: 10000
    },

    // 报告和时间线接口
    {
      id: 'get-daily-work-report',
      category: '报告分析',
      name: '获取今日工作报告',
      description: '测试生成今日工作报告',
      endpoint: '/api/v1/projects/1/reports/daily',
      method: 'GET',
      timeout: 10000
    },
    {
      id: 'get-task-timeline',
      category: '报告分析',
      name: '获取任务时间线',
      description: '测试获取任务时间线事件',
      endpoint: '/api/v1/projects/1/tasks/1056/timeline?limit=20&offset=0',
      method: 'GET',
      timeout: 5000
    },
    {
      id: 'auto-fill-task-context',
      category: '报告分析',
      name: '自动填充任务上下文',
      description: '测试自动填充任务上下文到报告模板',
      endpoint: '/api/v1/tasks/auto-fill-context',
      method: 'POST',
      payload: {
        task_ids: [1056],
        template_type: 'progress_report',
        include_subtasks: true,
        include_documents: true,
        include_time_logs: true
      },
      timeout: 10000
    }
  ];

  // 获取认证token
  const getAuthToken = async () => {
    try {
      const response = await fetch('/api/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      return data.token;
    } catch (error) {
      return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTczMDQ2MzYsIm5iZiI6MTc1NjY5OTgzNiwiaWF0IjoxNzU2Njk5ODM2LCJqdGkiOiJkN2I0OTgwYmUyNjEzMWJlODFhZGUyZWFmZGMxNjU3YSJ9.l0Bxm4fJCcgIDLtx8LkdmXxLa-tSyMEZ7NYFPBJIRNk';
    }
  };

  // 执行单个测试
  const runSingleTest = async (testCase: TestCase): Promise<TestResult> => {
    const startTime = Date.now();
    const testResult: TestResult = {
      id: testCase.id,
      name: testCase.name,
      endpoint: testCase.endpoint,
      method: testCase.method,
      status: 'running',
      request: testCase.payload,
      timestamp: startTime
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...testCase.headers
      };

      // 健康检查接口不需要认证
      if (testCase.id !== 'health-check') {
        const token = await getAuthToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), testCase.timeout || 5000);

      const response = await fetch(`http://localhost:8080${testCase.endpoint}`, {
        method: testCase.method,
        headers,
        body: testCase.payload ? JSON.stringify(testCase.payload) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();
      const duration = Date.now() - startTime;

      // 检查是否符合预期状态码
      const expectedStatus = testCase.expectedStatus || 200;
      const isExpectedStatus = response.status === expectedStatus || (expectedStatus === 200 && response.ok);
      
      testResult.status = isExpectedStatus ? 'success' : 'error';
      testResult.response = responseData;
      testResult.duration = duration;

      if (!isExpectedStatus) {
        testResult.error = `HTTP ${response.status}: ${response.statusText}`;
      }

    } catch (error: any) {
      testResult.status = error.name === 'AbortError' ? 'timeout' : 'error';
      testResult.error = error.message;
      testResult.duration = Date.now() - startTime;
    }

    return testResult;
  };

  // 执行批量测试
  const runBatchTest = useCallback(async (testIds?: string[]) => {
    const testsToRun = testIds || selectedTests;
    if (testsToRun.length === 0) {
      message.warning('请选择要测试的接口');
      return;
    }

    setIsRunning(true);
    const results: TestResult[] = [];

    for (const testId of testsToRun) {
      const testCase = testCases.find(t => t.id === testId);
      if (!testCase) continue;

      // 检查依赖
      if (testCase.dependencies) {
        const hasUnmetDeps = testCase.dependencies.some(dep => {
          const depResult = results.find(r => r.id === dep);
          return !depResult || depResult.status !== 'success';
        });

        if (hasUnmetDeps) {
          results.push({
            id: testCase.id,
            name: testCase.name,
            endpoint: testCase.endpoint,
            method: testCase.method,
            status: 'error',
            error: '依赖测试未通过',
            timestamp: Date.now()
          });
          continue;
        }
      }

      const result = await runSingleTest(testCase);
      results.push(result);
      
      // 实时更新结果
      setTestResults(prev => {
        const newResults = prev.filter(r => r.id !== result.id);
        return [...newResults, result].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      });

      // 添加延迟避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsRunning(false);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      message.success(`所有测试通过 (${successCount}/${totalCount})`);
    } else {
      message.error(`部分测试失败 (${successCount}/${totalCount})`);
    }
  }, [selectedTests, testCases]);

  // 清空测试结果
  const clearResults = () => {
    setTestResults([]);
    setSelectedTests([]);
  };

  // 导出测试结果
  const exportResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      results: testResults,
      summary: {
        total: testResults.length,
        success: testResults.filter(r => r.status === 'success').length,
        error: testResults.filter(r => r.status === 'error').length,
        timeout: testResults.filter(r => r.status === 'timeout').length
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-test-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 表格列定义
  const columns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'default', icon: <ClockCircleOutlined /> },
          running: { color: 'processing', icon: <SyncOutlined spin /> },
          success: { color: 'success', icon: <CheckCircleOutlined /> },
          error: { color: 'error', icon: <CloseCircleOutlined /> },
          timeout: { color: 'warning', icon: <ClockCircleOutlined /> }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Badge status={config.color as any} text={status} />;
      }
    },
    {
      title: '接口名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: '端点',
      dataIndex: 'endpoint',
      key: 'endpoint',
      ellipsis: true,
      render: (text: string, record: TestResult) => (
        <Text code>{record.method} {text}</Text>
      )
    },
    {
      title: '响应时间',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => duration ? `${duration}ms` : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (text: any, record: TestResult) => (
        <Button 
          type="link" 
          
          onClick={() => {
            setSelectedResult(record);
            setShowDetailModal(true);
          }}
        >
          详情
        </Button>
      )
    }
  ];

  // 按分类分组测试用例
  const groupedTests = testCases.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, TestCase[]>);

  // 统计信息
  const stats = {
    total: testResults.length,
    success: testResults.filter(r => r.status === 'success').length,
    error: testResults.filter(r => r.status === 'error').length,
    timeout: testResults.filter(r => r.status === 'timeout').length,
    avgDuration: testResults.length > 0 
      ? Math.round(testResults.reduce((acc, r) => acc + (r.duration || 0), 0) / testResults.length)
      : 0
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            <ApiOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              MCP 接口批量测试
            </Title>
          </Space>
          <Space>
            <Badge status={isRunning ? "processing" : "default"} text={isRunning ? "测试中..." : "就绪"} />
            {testResults.length > 0 && (
              <Text type="secondary">
                成功: {stats.success}/{stats.total}
              </Text>
            )}
          </Space>
        </div>
      </Header>

      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        {/* 控制面板 */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Space wrap>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={isRunning}
                  onClick={() => runBatchTest()}
                  disabled={selectedTests.length === 0}
                >
                  运行选中测试 ({selectedTests.length})
                </Button>
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={() => runBatchTest(testCases.map(t => t.id))}
                  loading={isRunning}
                >
                  运行全部测试
                </Button>
                <Button
                  icon={<StopOutlined />}
                  onClick={() => setIsRunning(false)}
                  disabled={!isRunning}
                >
                  停止测试
                </Button>
                <Button
                  icon={<ClearOutlined />}
                  onClick={clearResults}
                  disabled={testResults.length === 0}
                >
                  清空结果
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  onClick={exportResults}
                  disabled={testResults.length === 0}
                >
                  导出结果
                </Button>
              </Space>
            </Col>
          </Row>

          {/* 统计信息 */}
          {testResults.length > 0 && (
            <>
              <Divider />
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="总测试数" value={stats.total} />
                </Col>
                <Col span={6}>
                  <Statistic title="成功" value={stats.success} valueStyle={{ color: '#3f8600' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="失败" value={stats.error} valueStyle={{ color: '#cf1322' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="平均响应时间" value={stats.avgDuration} suffix="ms" />
                </Col>
              </Row>
              <Progress 
                percent={stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}
                status={stats.success === stats.total ? 'success' : 'active'}
                style={{ marginTop: 16 }}
              />
            </>
          )}
        </Card>

        <Row gutter={[16, 16]}>
          {/* 左侧：测试用例选择 */}
          <Col xs={24} lg={8}>
            <Card title="选择测试接口" >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Button 
                     
                    onClick={() => setSelectedTests(testCases.map(t => t.id))}
                  >
                    全选
                  </Button>
                  <Button 
                     
                    style={{ marginLeft: 8 }}
                    onClick={() => setSelectedTests([])}
                  >
                    清空
                  </Button>
                </div>
                
                <Collapse  ghost>
                  {Object.entries(groupedTests).map(([category, tests]) => (
                    <Panel
                      header={
                        <Space>
                          <span>{category}</span>
                          <Badge count={tests.filter(t => selectedTests.includes(t.id)).length} showZero />
                        </Space>
                      }
                      key={category}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} >
                        {tests.map(test => (
                          <div key={test.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Switch
                              
                              checked={selectedTests.includes(test.id)}
                              onChange={(checked) => {
                                if (checked) {
                                  setSelectedTests(prev => [...prev, test.id]);
                                } else {
                                  setSelectedTests(prev => prev.filter(id => id !== test.id));
                                }
                              }}
                            />
                            <div style={{ flex: 1, marginLeft: 8 }}>
                              <div style={{ fontSize: '12px', fontWeight: 500 }}>{test.name}</div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                {test.method} {test.endpoint}
                              </div>
                            </div>
                            {testResults.find(r => r.id === test.id) && (
                              <Badge 
                                status={testResults.find(r => r.id === test.id)?.status === 'success' ? 'success' : 'error'}
                              />
                            )}
                          </div>
                        ))}
                      </Space>
                    </Panel>
                  ))}
                </Collapse>
              </Space>
            </Card>
          </Col>

          {/* 右侧：测试结果 */}
          <Col xs={24} lg={16}>
            <Card title="测试结果" >
              <Table
                
                dataSource={testResults}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10, showSizeChanger: true }}
                scroll={{ y: 400 }}
              />
            </Card>
          </Col>
        </Row>

        {/* 详情弹窗 */}
        <Modal
          title={selectedResult?.name}
          open={showDetailModal}
          onCancel={() => setShowDetailModal(false)}
          footer={null}
          width={800}
        >
          {selectedResult && (
            <Tabs defaultActiveKey="response">
              <TabPane tab="响应数据" key="response">
                <TextArea
                  value={JSON.stringify(selectedResult.response, null, 2)}
                  rows={15}
                  readOnly
                />
              </TabPane>
              <TabPane tab="请求数据" key="request">
                <TextArea
                  value={JSON.stringify(selectedResult.request, null, 2)}
                  rows={15}
                  readOnly
                />
              </TabPane>
              <TabPane tab="测试信息" key="info">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><strong>接口:</strong> {selectedResult.method} {selectedResult.endpoint}</div>
                  <div><strong>状态:</strong> <Badge status={selectedResult.status === 'success' ? 'success' : 'error'} text={selectedResult.status} /></div>
                  <div><strong>响应时间:</strong> {selectedResult.duration}ms</div>
                  <div><strong>测试时间:</strong> {new Date(selectedResult.timestamp!).toLocaleString()}</div>
                  {selectedResult.error && (
                    <Alert message="错误信息" description={selectedResult.error} type="error" />
                  )}
                </Space>
              </TabPane>
            </Tabs>
          )}
        </Modal>
      </Content>
    </Layout>
  );
};

export default MCPTestPage;