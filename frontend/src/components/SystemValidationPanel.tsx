import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Card,
  Progress,
  List,
  Typography,
  Space,
  Tag,
  Divider,
  Alert,
  Tabs,
  Row,
  Col,
  Statistic,
  Timeline,
  Spin,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BugOutlined,
  ToolOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { systemValidator, runSystemValidation } from '../utils/systemValidator';
import type { SystemValidationReport, ValidationResult } from '../utils/systemValidator';

const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;

interface SystemValidationPanelProps {
  visible: boolean;
  onClose: () => void;
}

export const SystemValidationPanel: React.FC<SystemValidationPanelProps> = ({
  visible,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SystemValidationReport | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // 运行系统验证
  const handleRunValidation = async () => {
    setLoading(true);
    try {
      const validationReport = await runSystemValidation();
      setReport(validationReport);
      message.success('系统验证完成');
    } catch (error) {
      console.error('System validation failed:', error);
      message.error('系统验证失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出报告
  const handleExportReport = (format: 'json' | 'html') => {
    if (report) {
      systemValidator.exportReport(report, format);
      message.success(`报告已导出为${format.toUpperCase()}格式`);
    }
  };

  // 初始化时运行验证
  useEffect(() => {
    if (visible && !report) {
      handleRunValidation();
    }
  }, [visible]);

  // 获取类别图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance':
        return <DashboardOutlined style={{ color: '#1890ff' }} />;
      case 'export':
        return <DownloadOutlined style={{ color: '#52c41a' }} />;
      case 'react-query':
        return <ReloadOutlined style={{ color: '#722ed1' }} />;
      case 'ui-components':
        return <ToolOutlined style={{ color: '#fa8c16' }} />;
      case 'api-interceptors':
        return <BugOutlined style={{ color: '#eb2f96' }} />;
      case 'database':
        return <CheckCircleOutlined style={{ color: '#13c2c2' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  // 获取类别名称
  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      performance: '性能监控',
      export: '导出功能',
      'react-query': '状态管理',
      'ui-components': 'UI组件',
      'api-interceptors': 'API拦截',
      database: '数据库集成',
      'url-state': 'URL状态',
      general: '通用功能',
    };
    return names[category] || category;
  };

  // 获取成功率颜色
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return '#52c41a';
    if (rate >= 70) return '#faad14';
    return '#ff4d4f';
  };

  // 渲染测试项
  const renderTestItem = (test: ValidationResult, index: number) => (
    <List.Item
      key={index}
      style={{
        background: test.passed ? '#f6ffed' : '#fff2f0',
        border: `1px solid ${test.passed ? '#b7eb8f' : '#ffccc7'}`,
        borderRadius: '6px',
        marginBottom: '8px',
        padding: '12px',
      }}
    >
      <List.Item.Meta
        avatar={
          test.passed ? (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
          )
        }
        title={
          <Space>
            <Text strong>{test.test}</Text>
            {test.duration && (
              <Tag color="blue" style={{ fontSize: '11px' }}>
                {test.duration}ms
              </Tag>
            )}
          </Space>
        }
        description={
          <div>
            <Text type={test.passed ? 'success' : 'danger'}>{test.message}</Text>
            {test.details?.error && (
              <div style={{ marginTop: '4px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  错误详情: {test.details.error.message || '未知错误'}
                </Text>
              </div>
            )}
          </div>
        }
      />
    </List.Item>
  );

  return (
    <Modal
      title={
        <Space>
          <ToolOutlined />
          系统功能验证
          {report && (
            <Tag color={report.overall.successRate >= 80 ? 'success' : 'error'}>
              {report.overall.successRate}% 通过率
            </Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="run" icon={<ReloadOutlined />} onClick={handleRunValidation} loading={loading}>
          重新验证
        </Button>,
        report && (
          <Button key="export-json" icon={<DownloadOutlined />} onClick={() => handleExportReport('json')}>
            导出JSON
          </Button>
        ),
        report && (
          <Button key="export-html" icon={<DownloadOutlined />} onClick={() => handleExportReport('html')}>
            导出HTML
          </Button>
        ),
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text>正在验证系统功能...</Text>
            </div>
          </div>
        )}

        {report && !loading && (
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            {/* 概览标签页 */}
            <TabPane tab={<><DashboardOutlined /> 概览</>} key="overview">
              {/* 总体统计 */}
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="总测试数"
                      value={report.overall.total}
                      prefix={<ToolOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="通过测试"
                      value={report.overall.passed}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="失败测试"
                      value={report.overall.failed}
                      prefix={<CloseCircleOutlined />}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="成功率"
                      value={report.overall.successRate}
                      suffix="%"
                      prefix={<DashboardOutlined />}
                      valueStyle={{ color: getSuccessRateColor(report.overall.successRate) }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 成功率进度条 */}
              <Card title="整体测试进度" style={{ marginBottom: '16px' }}>
                <Progress
                  percent={report.overall.successRate}
                  status={report.overall.successRate >= 80 ? 'success' : 'exception'}
                  strokeColor={getSuccessRateColor(report.overall.successRate)}
                />
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  <Text type="secondary">
                    {report.overall.passed} / {report.overall.total} 测试通过
                  </Text>
                </div>
              </Card>

              {/* 分类汇总 */}
              <Card title="功能模块概览">
                <Row gutter={[16, 16]}>
                  {Object.entries(report.categories).map(([category, tests]) => {
                    const passed = tests.filter(t => t.passed).length;
                    const total = tests.length;
                    const rate = Math.round((passed / total) * 100);
                    
                    return (
                      <Col span={8} key={category}>
                        <Card size="small" style={{ height: '120px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                              {getCategoryIcon(category)}
                            </div>
                            <Text strong>{getCategoryName(category)}</Text>
                            <div style={{ marginTop: '8px' }}>
                              <Progress
                                type="circle"
                                size={40}
                                percent={rate}
                                format={() => `${passed}/${total}`}
                                strokeColor={getSuccessRateColor(rate)}
                              />
                            </div>
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Card>

              {/* 建议 */}
              {report.recommendations.length > 0 && (
                <Alert
                  message="优化建议"
                  description={
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {report.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  }
                  type={report.overall.successRate >= 80 ? 'success' : 'warning'}
                  showIcon
                  style={{ marginTop: '16px' }}
                />
              )}
            </TabPane>

            {/* 详细测试结果 */}
            <TabPane tab={<><BugOutlined /> 详细结果</>} key="details">
              {Object.entries(report.categories).map(([category, tests]) => (
                <Card
                  key={category}
                  title={
                    <Space>
                      {getCategoryIcon(category)}
                      {getCategoryName(category)}
                      <Tag color={tests.every(t => t.passed) ? 'success' : 'error'}>
                        {tests.filter(t => t.passed).length}/{tests.length}
                      </Tag>
                    </Space>
                  }
                  size="small"
                  style={{ marginBottom: '16px' }}
                >
                  <List
                    dataSource={tests}
                    renderItem={(test, index) => renderTestItem(test, index)}
                    split={false}
                  />
                </Card>
              ))}
            </TabPane>

            {/* 时间线 */}
            <TabPane tab={<><ClockCircleOutlined /> 执行时间线</>} key="timeline">
              <Timeline>
                {Object.entries(report.categories).map(([category, tests]) => (
                  <Timeline.Item
                    key={category}
                    color={tests.every(t => t.passed) ? 'green' : 'red'}
                    dot={getCategoryIcon(category)}
                  >
                    <div>
                      <Text strong>{getCategoryName(category)}</Text>
                      <br />
                      <Text type="secondary">
                        执行了 {tests.length} 个测试，
                        通过 {tests.filter(t => t.passed).length} 个
                      </Text>
                      {tests.some(t => t.duration) && (
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            平均执行时间: {Math.round(
                              tests
                                .filter(t => t.duration)
                                .reduce((sum, t) => sum + (t.duration || 0), 0) / 
                              tests.filter(t => t.duration).length
                            )}ms
                          </Text>
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </TabPane>
          </Tabs>
        )}

        {!report && !loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <ToolOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
            <Title level={4} type="secondary">
              准备验证系统功能
            </Title>
            <Paragraph type="secondary">
              点击"重新验证"按钮开始完整的系统功能检查
            </Paragraph>
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleRunValidation}>
              开始验证
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};