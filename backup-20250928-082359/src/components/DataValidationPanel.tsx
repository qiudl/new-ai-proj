import React, { useState, useEffect } from 'react';
import {
    Card,
    Row,
    Col,
    Button,
    Badge,
    Spin,
    Statistic,
    Progress,
    Alert,
    List,
    Typography,
    Space,
    Tooltip,
    Tabs,
    Tag,
    Modal,
    Descriptions,
    notification
} from 'antd';
import {
    CheckCircleOutlined,
    WarningOutlined,
    CloseCircleOutlined,
    ReloadOutlined,
    BarChartOutlined,
    FileSearchOutlined,
    HeartOutlined,
    AlertOutlined
} from '@ant-design/icons';
import { dataValidationService } from '../services/dataValidationService';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface ValidationResult {
    check_name: string;
    status: 'pass' | 'warning' | 'error';
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affected_ids?: number[];
}

interface ValidationReport {
    total_checks: number;
    passed_checks: number;
    warning_checks: number;
    error_checks: number;
    overall_score: number;
    overall_status: 'healthy' | 'warning' | 'critical';
    validation_results: ValidationResult[];
    generated_at: string;
    user_id: number;
    summary: {
        total_timer_sessions: number;
        valid_sessions: number;
        data_quality_score: number;
        recommended_actions: string[];
        health_metrics: Record<string, any>;
        last_healthy_data_date?: string;
        efficiency_calculatable: boolean;
    };
}

interface HealthMetrics {
    status: 'pass' | 'warning' | 'error';
    score: number;
    recent_sessions: number;
    active_days: number;
    valid_sessions: number;
    efficiency_available: boolean;
    last_checked: string;
    recommendations: string[];
}

const DataValidationPanel: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<ValidationReport | null>(null);
    const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedResult, setSelectedResult] = useState<ValidationResult | null>(null);

    // Load initial data
    useEffect(() => {
        loadHealthMetrics();
    }, []);

    const loadHealthMetrics = async () => {
        try {
            setLoading(true);
            const response = await dataValidationService.getHealthMetrics();
            if (response.success) {
                setHealthMetrics(response.health);
            }
        } catch (error) {
            console.error('Failed to load health metrics:', error);
            notification.error({
                message: '加载失败',
                description: '获取健康指标失败'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadFullReport = async () => {
        try {
            setLoading(true);
            const response = await dataValidationService.getValidationReport();
            if (response.success) {
                setReport(response.report);
                notification.success({
                    message: '验证完成',
                    description: '数据验证报告已生成'
                });
            }
        } catch (error) {
            console.error('Failed to load validation report:', error);
            notification.error({
                message: '验证失败',
                description: '获取验证报告失败'
            });
        } finally {
            setLoading(false);
        }
    };

    const runValidation = async (quick: boolean = false) => {
        try {
            setLoading(true);
            const response = await dataValidationService.runValidation({ quick });
            if (response.success) {
                if (quick) {
                    await loadHealthMetrics();
                } else {
                    setReport(response.report);
                }
                notification.success({
                    message: '验证完成',
                    description: quick ? '快速验证完成' : '全面验证完成'
                });
            }
        } catch (error) {
            console.error('Failed to run validation:', error);
            notification.error({
                message: '验证失败',
                description: '运行数据验证失败'
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pass':
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            case 'warning':
                return <WarningOutlined style={{ color: '#faad14' }} />;
            case 'error':
                return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
            default:
                return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pass':
            case 'healthy':
                return '#52c41a';
            case 'warning':
                return '#faad14';
            case 'error':
            case 'critical':
                return '#f5222d';
            default:
                return '#d9d9d9';
        }
    };

    const getSeverityTag = (severity: string) => {
        const colorMap = {
            low: 'green',
            medium: 'orange',
            high: 'red',
            critical: 'red'
        };
        return <Tag color={colorMap[severity as keyof typeof colorMap]}>{severity.toUpperCase()}</Tag>;
    };

    const showResultDetails = (result: ValidationResult) => {
        setSelectedResult(result);
        setDetailsModalVisible(true);
    };

    const renderOverviewTab = () => (
        <Row gutter={[16, 16]}>
            {/* Health Status Card */}
            <Col span={24}>
                <Card title="数据健康状态" loading={loading}>
                    {healthMetrics ? (
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title="健康评分"
                                    value={healthMetrics.score}
                                    suffix="分"
                                    valueStyle={{ color: getStatusColor(healthMetrics.status) }}
                                    prefix={getStatusIcon(healthMetrics.status)}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="近期会话"
                                    value={healthMetrics.recent_sessions}
                                    suffix="个"
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="活跃天数"
                                    value={healthMetrics.active_days}
                                    suffix="天"
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="有效会话"
                                    value={healthMetrics.valid_sessions}
                                    suffix="个"
                                />
                            </Col>
                        </Row>
                    ) : (
                        <Alert message="暂无健康数据" type="info" />
                    )}
                </Card>
            </Col>

            {/* Quick Actions */}
            <Col span={24}>
                <Card title="快速操作">
                    <Space>
                        <Button
                            type="primary"
                            icon={<ReloadOutlined />}
                            onClick={() => loadHealthMetrics()}
                            loading={loading}
                        >
                            刷新状态
                        </Button>
                        <Button
                            icon={<HeartOutlined />}
                            onClick={() => runValidation(true)}
                            loading={loading}
                        >
                            快速检查
                        </Button>
                        <Button
                            icon={<FileSearchOutlined />}
                            onClick={() => runValidation(false)}
                            loading={loading}
                        >
                            全面验证
                        </Button>
                        <Button
                            icon={<BarChartOutlined />}
                            onClick={loadFullReport}
                            loading={loading}
                        >
                            生成报告
                        </Button>
                    </Space>
                </Card>
            </Col>

            {/* Recommendations */}
            {healthMetrics?.recommendations && (
                <Col span={24}>
                    <Card title="改进建议">
                        <List
                            dataSource={healthMetrics.recommendations}
                            renderItem={(item, index) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<AlertOutlined style={{ color: '#faad14' }} />}
                                        title={`建议 ${index + 1}`}
                                        description={item}
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            )}
        </Row>
    );

    const renderReportTab = () => {
        if (!report) {
            return (
                <Card>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Paragraph>
                            暂无验证报告，请点击"全面验证"或"生成报告"按钮开始验证。
                        </Paragraph>
                        <Button type="primary" onClick={loadFullReport} loading={loading}>
                            生成报告
                        </Button>
                    </div>
                </Card>
            );
        }

        return (
            <Row gutter={[16, 16]}>
                {/* Report Summary */}
                <Col span={24}>
                    <Card title="验证摘要">
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title="总体评分"
                                    value={report.overall_score}
                                    suffix="分"
                                    valueStyle={{ color: getStatusColor(report.overall_status) }}
                                />
                                <Progress
                                    percent={report.overall_score}
                                    strokeColor={getStatusColor(report.overall_status)}
                                    size="small"
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="通过检查"
                                    value={report.passed_checks}
                                    suffix={`/ ${report.total_checks}`}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="警告检查"
                                    value={report.warning_checks}
                                    valueStyle={{ color: '#faad14' }}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="错误检查"
                                    value={report.error_checks}
                                    valueStyle={{ color: '#f5222d' }}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* Validation Results */}
                <Col span={24}>
                    <Card title="详细检查结果">
                        <List
                            dataSource={report.validation_results}
                            renderItem={(result) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            type="link"
                                            onClick={() => showResultDetails(result)}
                                        >
                                            查看详情
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={getStatusIcon(result.status)}
                                        title={
                                            <Space>
                                                {result.check_name}
                                                {getSeverityTag(result.severity)}
                                                <Badge
                                                    status={
                                                        result.status === 'pass' ? 'success' :
                                                        result.status === 'warning' ? 'warning' : 'error'
                                                    }
                                                    text={result.status.toUpperCase()}
                                                />
                                            </Space>
                                        }
                                        description={result.message}
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>

                {/* Data Summary */}
                <Col span={24}>
                    <Card title="数据概况">
                        <Row gutter={16}>
                            <Col span={8}>
                                <Statistic
                                    title="计时会话总数"
                                    value={report.summary.total_timer_sessions}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="有效会话数"
                                    value={report.summary.valid_sessions}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="数据质量评分"
                                    value={report.summary.data_quality_score}
                                    suffix="分"
                                />
                            </Col>
                        </Row>
                        <div style={{ marginTop: 16 }}>
                            <Alert
                                message={
                                    report.summary.efficiency_calculatable
                                        ? "效率计算功能可用"
                                        : "效率计算功能不可用"
                                }
                                type={report.summary.efficiency_calculatable ? "success" : "warning"}
                                showIcon
                            />
                        </div>
                    </Card>
                </Col>

                {/* Recommended Actions */}
                {report.summary.recommended_actions.length > 0 && (
                    <Col span={24}>
                        <Card title="推荐操作">
                            <List
                                dataSource={report.summary.recommended_actions}
                                renderItem={(action, index) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<AlertOutlined style={{ color: '#1890ff' }} />}
                                            title={`操作 ${index + 1}`}
                                            description={action}
                                        />
                                    </List.Item>
                                )}
                            />
                        </Card>
                    </Col>
                )}
            </Row>
        );
    };

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Title level={2}>数据验证面板</Title>
                <Paragraph>
                    监控和验证计时器数据的质量，确保效率分析功能正常工作。
                </Paragraph>
            </div>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane
                    tab={
                        <span>
                            <HeartOutlined />
                            健康概览
                        </span>
                    }
                    key="overview"
                >
                    {renderOverviewTab()}
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <FileSearchOutlined />
                            验证报告
                        </span>
                    }
                    key="report"
                >
                    {renderReportTab()}
                </TabPane>
            </Tabs>

            {/* Result Details Modal */}
            <Modal
                title="检查详情"
                visible={detailsModalVisible}
                onCancel={() => setDetailsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailsModalVisible(false)}>
                        关闭
                    </Button>
                ]}
                width={800}
            >
                {selectedResult && (
                    <Descriptions column={1} bordered>
                        <Descriptions.Item label="检查名称">
                            {selectedResult.check_name}
                        </Descriptions.Item>
                        <Descriptions.Item label="状态">
                            <Space>
                                {getStatusIcon(selectedResult.status)}
                                <Badge
                                    status={
                                        selectedResult.status === 'pass' ? 'success' :
                                        selectedResult.status === 'warning' ? 'warning' : 'error'
                                    }
                                    text={selectedResult.status.toUpperCase()}
                                />
                                {getSeverityTag(selectedResult.severity)}
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="消息">
                            {selectedResult.message}
                        </Descriptions.Item>
                        <Descriptions.Item label="检查时间">
                            {new Date(selectedResult.timestamp).toLocaleString()}
                        </Descriptions.Item>
                        {selectedResult.details && Object.keys(selectedResult.details).length > 0 && (
                            <Descriptions.Item label="详细信息">
                                <pre style={{ backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                                    {JSON.stringify(selectedResult.details, null, 2)}
                                </pre>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default DataValidationPanel;