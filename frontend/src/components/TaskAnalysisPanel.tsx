import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Tag,
  Button,
  Table,
  Progress,
  Statistic,
  Row,
  Col,
  Alert,
  DatePicker,
  Form,
  Select,
  message,
  Spin,
  Typography,
  Space,
  Tooltip,
  Badge,
  List,
  Divider
} from 'antd';
import {
  BarChartOutlined,
  TagsOutlined,
  ReloadOutlined,
  DownloadOutlined,
  BulbOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import taskAnalysisService, {
  TagStatistics,
  WeeklyReportResponse,
  ReportInsight,
  Recommendation,
  TagAnalysisResult
} from '../services/taskAnalysisService';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// ✅ FIXED - Added task and subtasks properties (TS2322)
interface TaskAnalysisPanelProps {
  projectId?: number;
  taskId?: number;
  task?: any; // Task object can be passed directly
  subtasks?: any; // Subtasks data
  className?: string;
  allTasks?: any[]; // 从父组件传入的任务数据
}

const TaskAnalysisPanel: React.FC<TaskAnalysisPanelProps> = ({
  projectId,
  taskId,
  className,
  allTasks = []
}) => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<TagStatistics | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportResponse | null>(null);
  const [taskAnalysis, setTaskAnalysis] = useState<TagAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs()
  ]);
  const [form] = Form.useForm();
  const [apiError, setApiError] = useState<string | null>(null);

  // 从allTasks计算本地统计数据
  const calculateLocalStatistics = (): TagStatistics => {
    const totalTasks = allTasks.length;
    const tagMap: { [key: string]: number } = {};
    const categoryStats: { [key: string]: { count: number; percentage: number; tags: { [key: string]: number } } } = {};
    let taggedTasksCount = 0;

    // 分析所有任务的标签
    allTasks.forEach(task => {
      const tags = task.custom_fields?.tags || [];
      if (tags.length > 0) {
        taggedTasksCount++;
        tags.forEach((tag: string) => {
          tagMap[tag] = (tagMap[tag] || 0) + 1;
          
          // 简单的标签分类逻辑
          let category = 'other';
          if (tag.includes('前端') || tag.includes('frontend') || tag.includes('UI') || tag.includes('React')) {
            category = 'frontend';
          } else if (tag.includes('后端') || tag.includes('backend') || tag.includes('API') || tag.includes('服务')) {
            category = 'backend';
          } else if (tag.includes('测试') || tag.includes('test') || tag.includes('bug')) {
            category = 'testing';
          } else if (tag.includes('文档') || tag.includes('doc') || tag.includes('说明')) {
            category = 'documentation';
          }
          
          if (!categoryStats[category]) {
            categoryStats[category] = { count: 0, percentage: 0, tags: {} };
          }
          categoryStats[category].count++;
          categoryStats[category].tags[tag] = (categoryStats[category].tags[tag] || 0) + 1;
        });
      }
    });

    // 计算分类百分比
    Object.keys(categoryStats).forEach(category => {
      categoryStats[category].percentage = totalTasks > 0 ? (categoryStats[category].count / totalTasks) * 100 : 0;
    });

    // 生成最常用标签列表
    const mostUsedTags = Object.entries(tagMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count, trend: '稳定' }));

    // 生成最近添加的标签（这里用最少使用的标签代替）
    const recentlyAddedTags = Object.entries(tagMap)
      .sort(([,a], [,b]) => a - b)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count, trend: '新增' }));

    const taggingCoverage = totalTasks > 0 ? (taggedTasksCount / totalTasks) * 100 : 0;

    return {
      total_tasks: totalTasks,
      tagged_tasks: taggedTasksCount,
      tagging_coverage: taggingCoverage,
      tag_distribution: tagMap,
      category_stats: categoryStats,
      most_used_tags: mostUsedTags,
      recently_added_tags: recentlyAddedTags
    };
  };

  // 加载统计数据
  const loadStatistics = async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      // 优先调用真实API获取数据库统计
      const stats = await taskAnalysisService.getTagStatistics();
      setStatistics(stats);
    } catch (error: any) {
      console.error('Failed to load statistics from API:', error);
      
      // 如果API失败，回退到本地数据计算
      if (allTasks.length > 0) {
        const localStats = calculateLocalStatistics();
        setStatistics(localStats);
        setApiError('API暂时不可用，使用本地数据计算统计信息');
        message.warning('API服务暂时不可用，已切换到本地计算模式');
        return;
      }
      
      // 如果既没有API又没有本地数据，提供默认数据
      setApiError('无法获取统计数据，请稍后重试');
      message.error('无法加载统计数据');
      
      setStatistics({
        total_tasks: 0,
        tagged_tasks: 0,
        tagging_coverage: 0,
        tag_distribution: {},
        category_stats: {},
        most_used_tags: [],
        recently_added_tags: []
      });
    } finally {
      setLoading(false);
    }
  };

  // 生成周报
  const generateReport = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      const start = startDate || dateRange[0].format('YYYY-MM-DD');
      const end = endDate || dateRange[1].format('YYYY-MM-DD');
      
      const report = await taskAnalysisService.generateWeeklyReport({
        start_date: start,
        end_date: end,
        project_id: projectId,
        format: 'json'
      });
      
      // 确保报告有基本结构
      const safeReport: WeeklyReportResponse = {
        period: report?.period || { start_date: start, end_date: end },
        executive_summary: report?.executive_summary || {
          key_metrics: {
            completed_tasks: 0,
            completion_rate: 0,
            new_tasks: 0,
            velocity: 0,
            blockage_rate: 0
          },
          technical_distribution: [],
          major_achievements: [],
          risks: [],
          trend: {}
        },
        detailed_analysis: report?.detailed_analysis || {},
        insights: report?.insights || [
          {
            type: 'info',
            level: 'info',
            message: '周报生成功能已集成',
            details: '当前使用本地数据生成基础报告，后端分析服务需要Node.js环境支持'
          }
        ],
        recommendations: report?.recommendations || [
          {
            category: '系统优化',
            priority: 'medium',
            title: '配置Node.js分析环境',
            description: '为了获得更详细的分析报告，建议配置Node.js环境来支持高级分析功能',
            actions: ['安装Node.js运行环境', '配置分析脚本执行权限', '测试分析API接口']
          }
        ],
        generated_at: report?.generated_at || new Date().toISOString()
      };
      
      setWeeklyReport(safeReport);
      message.success('周报生成成功');
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      
      // 生成备用报告
      const fallbackReport: WeeklyReportResponse = {
        period: { 
          start_date: startDate || dateRange[0].format('YYYY-MM-DD'), 
          end_date: endDate || dateRange[1].format('YYYY-MM-DD') 
        },
        executive_summary: {
          key_metrics: {
            completed_tasks: allTasks.filter(task => task.status === 'completed').length,
            completion_rate: allTasks.length > 0 ? (allTasks.filter(task => task.status === 'completed').length / allTasks.length) * 100 : 0,
            new_tasks: allTasks.filter(task => {
              const createdAt = new Date(task.created_at);
              const startDate = new Date(dateRange[0].format('YYYY-MM-DD'));
              return createdAt >= startDate;
            }).length,
            velocity: Math.round(allTasks.filter(task => task.status === 'completed').length / 7 * 100) / 100,
            blockage_rate: 0
          },
          technical_distribution: [],
          major_achievements: [],
          risks: [],
          trend: {}
        },
        detailed_analysis: {},
        insights: [
          {
            type: 'warning',
            level: 'warning', 
            message: 'API服务暂不可用',
            details: '使用本地数据生成了基础周报，完整功能需要后端分析服务支持'
          }
        ],
        recommendations: [
          {
            category: '系统配置',
            priority: 'medium',
            title: '启用后端分析服务',
            description: '配置Node.js环境以获得完整的周报分析功能',
            actions: ['检查后端日志', '配置Node.js环境', '重新测试API接口']
          }
        ],
        generated_at: new Date().toISOString()
      };
      
      setWeeklyReport(fallbackReport);
      
      if (error?.message?.includes('500') || error?.status === 500) {
        message.warning('使用本地数据生成基础周报，完整功能需要Node.js环境支持');
      } else {
        message.warning('API服务暂不可用，已生成本地数据周报');
      }
    } finally {
      setLoading(false);
    }
  };

  // 分析单个任务
  const analyzeTask = async () => {
    if (!projectId || !taskId) {
      message.warning('请提供项目ID和任务ID');
      return;
    }

    try {
      setLoading(true);
      const analysis = await taskAnalysisService.analyzeTaskTags(projectId, taskId);
      setTaskAnalysis(analysis);
      message.success('任务分析完成');
    } catch (error) {
      console.error('Failed to analyze task:', error);
      message.error('任务分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量更新标签
  const batchUpdateTags = async () => {
    try {
      setLoading(true);
      await taskAnalysisService.batchUpdateTags();
      message.success('批量更新标签成功');
      // 重新加载统计数据
      await loadStatistics();
    } catch (error: any) {
      console.error('Failed to batch update tags:', error);
      if (error?.message?.includes('500') || error?.status === 500) {
        message.warning('批量更新服务暂不可用，需要Node.js环境支持');
      } else {
        message.error('批量更新标签失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadStatistics();
    // 如果有任务ID，自动分析
    if (projectId && taskId) {
      analyzeTask();
    }
  }, [projectId, taskId, allTasks]);

  // 获取洞察级别对应的图标
  const getInsightIcon = (level: string) => {
    switch (level) {
      case 'positive':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'critical':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <BulbOutlined style={{ color: '#1890ff' }} />;
    }
  };

  // 获取优先级对应的颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'blue';
    }
  };

  // 渲染概览标签页
  const renderOverviewTab = () => (
    <Row gutter={[16, 16]}>
      {apiError && (
        <Col span={24}>
          <Alert
            message="分析服务状态"
            description={apiError}
            type="warning"
            showIcon
            action={
              <Button  onClick={loadStatistics} loading={loading}>
                重试
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        </Col>
      )}
      <Col xs={24} sm={12} md={8}>
        <Card>
          <Statistic
            title="总任务数"
            value={statistics?.total_tasks || 0}
            prefix={<BarChartOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card>
          <Statistic
            title="已标记任务"
            value={statistics?.tagged_tasks || 0}
            prefix={<TagsOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card>
          <Statistic
            title="标记覆盖率"
            value={statistics?.tagging_coverage || 0}
            precision={1}
            suffix="%"
            prefix={<CheckCircleOutlined />}
          />
          <Progress
            percent={statistics?.tagging_coverage || 0}
            
            showInfo={false}
            style={{ marginTop: 8 }}
          />
        </Card>
      </Col>

      <Col span={24}>
        <Card title="最常用标签" >
          <Space wrap>
            {statistics?.most_used_tags?.slice(0, 10).map((tagUsage) => (
              <Tooltip
                key={tagUsage.tag}
                title={`使用次数: ${tagUsage.count}, 趋势: ${tagUsage.trend || '稳定'}`}
              >
                <Tag
                  color={taskAnalysisService.getTagColor(tagUsage.tag)}
                  style={{ marginBottom: 4 }}
                >
                  {tagUsage.tag} ({tagUsage.count})
                </Tag>
              </Tooltip>
            ))}
          </Space>
        </Card>
      </Col>

      <Col span={24}>
        <Card
          title="快速操作"
          extra={
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadStatistics}
              loading={loading}
            >
              刷新数据
            </Button>
          }
        >
          <Space>
            <Button
              icon={<TagsOutlined />}
              onClick={batchUpdateTags}
              loading={loading}
            >
              批量更新标签
            </Button>
            <Button
              icon={<BarChartOutlined />}
              onClick={() => generateReport()}
              loading={loading}
            >
              生成本周报告
            </Button>
            {projectId && taskId && (
              <Button
                icon={<BulbOutlined />}
                onClick={analyzeTask}
                loading={loading}
              >
                分析当前任务
              </Button>
            )}
          </Space>
        </Card>
      </Col>
    </Row>
  );

  // 渲染标签统计标签页
  const renderTagsTab = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card title="标签分类统计">
          <Row gutter={16}>
            {statistics?.category_stats && Object.entries(statistics.category_stats).map(([category, stats]) => (
              <Col xs={24} sm={12} md={8} lg={6} key={category}>
                <Card >
                  <Statistic
                    title={category.toUpperCase()}
                    value={stats.count}
                    suffix={`(${stats.percentage.toFixed(1)}%)`}
                  />
                  <Progress
                    percent={stats.percentage}
                    
                    showInfo={false}
                    style={{ marginTop: 8 }}
                  />
                  <div style={{ marginTop: 8 }}>
                    {Object.entries(stats.tags).slice(0, 3).map(([tag, count]) => (
<Tag key={tag} style={{ marginBottom: 2 }}>
                        {tag}: {count}
                      </Tag>
                    ))}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card title="标签使用排行">
          <List
            
            dataSource={statistics?.most_used_tags?.slice(0, 10) || []}
            renderItem={(item, index) => (
              <List.Item>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <Badge count={index + 1} style={{ backgroundColor: '#52c41a', marginRight: 8 }} />
                    <Tag color={taskAnalysisService.getTagColor(item.tag)}>
                      {item.tag}
                    </Tag>
                  </span>
                  <Text strong>{item.count} 次</Text>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card title="新增标签">
          <List
            
            dataSource={statistics?.recently_added_tags || []}
            renderItem={(item) => (
              <List.Item>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag color={taskAnalysisService.getTagColor(item.tag)}>
                    {item.tag}
                  </Tag>
                  <Space>
                    <Text>{item.count} 次</Text>
<Tag color="blue">{item.trend}</Tag>
                  </Space>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  );

  // 渲染周报标签页
  const renderReportsTab = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card title="生成周报">
          <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
            <Form.Item label="时间范围">
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates) {
                    setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs]);
                  }
                }}
                format="YYYY-MM-DD"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                icon={<BarChartOutlined />}
                onClick={() => generateReport()}
                loading={loading}
              >
                生成报告
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      {weeklyReport ? (
        weeklyReport.executive_summary ? (
        <>
          <Col span={24}>
            <Card title="关键指标">
              <Row gutter={16}>
                <Col xs={12} sm={8} md={6}>
                  <Statistic
                    title="完成任务"
                    value={weeklyReport.executive_summary.key_metrics?.completed_tasks || 0}
                    suffix="个"
                  />
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Statistic
                    title="完成率"
                    value={weeklyReport.executive_summary.key_metrics?.completion_rate || 0}
                    precision={1}
                    suffix="%"
                  />
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Statistic
                    title="新增任务"
                    value={weeklyReport.executive_summary.key_metrics?.new_tasks || 0}
                    suffix="个"
                  />
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Statistic
                    title="团队速度"
                    value={weeklyReport.executive_summary.key_metrics?.velocity || 0}
                    suffix="tasks/week"
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="智能洞察">
              <List
                
                dataSource={weeklyReport.insights || []}
                renderItem={(insight) => (
                  <List.Item>
                    <Alert
                      message={
                        <Space>
                          {getInsightIcon(insight.level)}
                          {insight.message}
                        </Space>
                      }
                      description={insight.details}
                      type={
                        insight.level === 'positive' ? 'success' :
                        insight.level === 'warning' ? 'warning' :
                        insight.level === 'critical' ? 'error' : 'info'
                      }
                      showIcon={false}
                      style={{ marginBottom: 8 }}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="改进建议">
              <List
                
                dataSource={weeklyReport.recommendations || []}
                renderItem={(rec) => (
                  <List.Item>
                    <Card  style={{ width: '100%' }}>
                      <div style={{ marginBottom: 8 }}>
                        <Space>
                          <Tag color={getPriorityColor(rec.priority)}>
                            {rec.priority.toUpperCase()}
                          </Tag>
                          <Text strong>{rec.title}</Text>
                        </Space>
                      </div>
                      <Paragraph style={{ fontSize: '12px', margin: 0 }}>
                        {rec.description}
                      </Paragraph>
                      <Divider style={{ margin: '8px 0' }} />
                      <div>
                        <Text style={{ fontSize: '12px' }}>行动计划:</Text>
                        <ul style={{ fontSize: '12px', margin: '4px 0 0 16px', paddingLeft: 0 }}>
                          {rec.actions.map((action, index) => (
                            <li key={index}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </>
        ) : (
          <Col span={24}>
            <Alert
              message="周报数据不完整"
              description="生成的周报缺少必要的数据结构，请重新生成或检查后端服务配置"
              type="warning"
              showIcon
              action={
                <Button  onClick={() => generateReport()}>
                  重新生成
                </Button>
              }
            />
          </Col>
        )
      ) : null}
    </Row>
  );

  // 渲染任务分析标签页
  const renderTaskAnalysisTab = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card
          title="任务分析"
          extra={
            projectId && taskId && (
              <Button
                type="primary"
                icon={<BulbOutlined />}
                onClick={analyzeTask}
                loading={loading}
              >
                重新分析
              </Button>
            )
          }
        >
          {!projectId || !taskId ? (
            <Alert
              message="需要项目ID和任务ID"
              description="请在任务详情页中使用此功能"
              type="info"
              showIcon
            />
          ) : !taskAnalysis ? (
            <Alert
              message="点击'重新分析'开始任务分析"
              type="info"
              showIcon
            />
          ) : (
            <Row gutter={16}>
              <Col xs={24} lg={12}>
                <Card  title="基本信息">
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>任务标题: </Text>
                    <Text>{taskAnalysis.title}</Text>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>置信度: </Text>
                    <Progress
                      percent={Math.round(taskAnalysis.confidence * 100)}
                      
                      style={{ width: 100, display: 'inline-block' }}
                    />
                    <Text style={{ marginLeft: 8 }}>
                      {Math.round(taskAnalysis.confidence * 100)}%
                    </Text>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card  title="标签对比">
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>现有标签:</Text>
                    <div style={{ marginTop: 4 }}>
                      <Space wrap>
                        {taskAnalysis.existing_tags.map((tag) => (
                          <Tag key={tag} color="default">
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>建议标签:</Text>
                    <div style={{ marginTop: 4 }}>
                      <Space wrap>
                        {taskAnalysis.suggested_tags.map((tag) => (
                          <Tag
                            key={tag}
                            color={taskAnalysisService.getTagColor(tag)}
                          >
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  </div>
                  <div>
                    <Text strong>新增标签:</Text>
                    <div style={{ marginTop: 4 }}>
                      <Space wrap>
                        {taskAnalysis.new_tags.map((tag) => (
                          <Tag key={tag} color="green">
                            +{tag}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col span={24}>
                <Card  title="标签分类">
                  <Row gutter={16}>
                    {Object.entries(taskAnalysis.tag_categories).map(([category, tags]) => (
                      <Col xs={24} sm={12} md={8} key={category}>
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ textTransform: 'capitalize' }}>
                            {category}:
                          </Text>
                          <div style={{ marginTop: 4 }}>
                            <Space wrap>
                              {tags.map((tag) => (
                                <Tag
                                  key={tag}
                                  color={taskAnalysisService.getTagColor(tag)}
                                >
                                  {tag}
                                </Tag>
                              ))}
                            </Space>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Col>
            </Row>
          )}
        </Card>
      </Col>
    </Row>
  );

  return (
    <div className={className}>
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>任务分析中心</span>
          </Space>
        }
        extra={
          <Space>
            <Text type="secondary">
              智能任务分析与周报生成
            </Text>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={[
              {
                key: 'overview',
                label: (
                  <span>
                    <BarChartOutlined />
                    概览
                  </span>
                ),
                children: renderOverviewTab(),
              },
              {
                key: 'tags',
                label: (
                  <span>
                    <TagsOutlined />
                    标签统计
                  </span>
                ),
                children: renderTagsTab(),
              },
              {
                key: 'reports',
                label: (
                  <span>
                    <BarChartOutlined />
                    周报
                  </span>
                ),
                children: renderReportsTab(),
              },
              ...(projectId && taskId ? [{
                key: 'task-analysis',
                label: (
                  <span>
                    <BulbOutlined />
                    任务分析
                  </span>
                ),
                children: renderTaskAnalysisTab(),
              }] : [])
            ]}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default TaskAnalysisPanel;