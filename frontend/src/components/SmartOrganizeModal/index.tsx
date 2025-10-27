import React, { useState, useEffect } from 'react';
import { Modal, Button, Spin, Alert, Table, Space, Typography, Statistic, Row, Col, Progress, message, Tag, Collapse, Tooltip } from 'antd';
import { CheckCircleOutlined, SyncOutlined, WarningOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import taskOrganizationService, {
  OrphanScanResult,
  OrganizeResult,
  TaskBrief,
} from '../../services/taskOrganizationService';
import './styles.css';

const { Text } = Typography;

export interface SmartOrganizeModalProps {
  visible: boolean;
  projectId: number;
  onCancel: () => void;
  onComplete: () => void;
}

type ModalStep = 'scan' | 'preview' | 'organizing' | 'complete';

const SmartOrganizeModal: React.FC<SmartOrganizeModalProps> = ({
  visible,
  projectId,
  onCancel,
  onComplete,
}) => {
  const [step, setStep] = useState<ModalStep>('scan');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<OrphanScanResult | null>(null);
  const [organizeResult, setOrganizeResult] = useState<OrganizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState<string>('');

  const resetModal = () => {
    setStep('scan');
    setLoading(false);
    setScanResult(null);
    setOrganizeResult(null);
    setError(null);
    setProgress(0);
    setCurrentTask('');
  };

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 开始扫描孤立任务，项目ID:', projectId);
      const result = await taskOrganizationService.scanOrphanTasks(projectId);
      console.log('✅ 扫描结果:', result);
      setScanResult(result);
      setStep('preview');
    } catch (err: any) {
      console.error('❌ 扫描失败:', err);
      setError(err.message || '扫描失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOrganize = async () => {
    if (!scanResult || scanResult.organizable === 0) return;

    setStep('organizing');
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const taskIds = scanResult.preview.flatMap((week) => week.task_ids);
      const totalTasks = taskIds.length;

      setCurrentTask(`准备组织 ${totalTasks} 个任务...`);
      setProgress(10);

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 300);

      const result = await taskOrganizationService.organizeTasksToWeeks(projectId, {
        task_ids: taskIds,
        auto_create_weeks: true,
      });

      clearInterval(progressInterval);
      setProgress(100);
      setCurrentTask('组织完成！');

      setOrganizeResult(result);
      setTimeout(() => setStep('complete'), 500);
    } catch (err: any) {
      setError(err.message || '组织失败');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      resetModal();
      handleScan();
    }
  }, [visible, projectId]);

  const columns = [
    {
      title: '周次',
      dataIndex: 'week_number',
      key: 'week_number',
      width: 100,
      render: (weekNum: number) => <Text strong>Week {weekNum}</Text>,
    },
    {
      title: '日期范围',
      dataIndex: 'week_range',
      key: 'week_range',
      width: 120,
    },
    {
      title: '任务数量',
      dataIndex: 'task_count',
      key: 'task_count',
      width: 100,
      render: (count: number) => <Text type="secondary">{count} 个任务</Text>,
    },
    {
      title: '可组织任务',
      dataIndex: 'tasks',
      key: 'tasks',
      render: (tasks: TaskBrief[]) => (
        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
          {tasks.map((task) => (
            <div key={task.id} style={{ marginBottom: '4px' }}>
              <Text code style={{ marginRight: '8px' }}>#{task.id}</Text>
              <Tooltip title={task.title}>
                <Text ellipsis style={{ maxWidth: '300px', display: 'inline-block' }}>
                  {task.title}
                </Text>
              </Tooltip>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const renderContent = () => {
    if (step === 'scan') {
      return (
        <div className="scan-step">
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>正在扫描孤立任务...</p>
        </div>
      );
    }

    if (step === 'preview' && scanResult) {
      return (
        <div className="preview-step">
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic
                title="孤立任务总数"
                value={scanResult.total_orphans}
                prefix={<WarningOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="可组织任务"
                value={scanResult.organizable}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic title="已归档任务" value={scanResult.archived} />
            </Col>
          </Row>

          {scanResult.organizable === 0 ? (
            <Alert message="没有需要组织的任务" type="success" showIcon />
          ) : (
            <>
              <Alert
                message={`发现 ${scanResult.organizable} 个任务可自动组织`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table
                dataSource={scanResult.preview}
                columns={columns}
                rowKey="week_number"
                pagination={false}
                size="small"
              />
            </>
          )}
        </div>
      );
    }

    if (step === 'organizing') {
      return (
        <div className="organizing-step">
          <Progress
            type="circle"
            percent={progress}
            status="active"
            format={(percent) => `${percent}%`}
          />
          <p style={{ marginTop: 16, fontSize: 16, fontWeight: 500 }}>{currentTask}</p>
          {scanResult && (
            <p style={{ marginTop: 8, color: '#8c8c8c' }}>
              正在处理 {scanResult.organizable} 个任务到 {scanResult.preview.length} 个周汇总
            </p>
          )}
        </div>
      );
    }

    if (step === 'complete' && organizeResult) {
      const successDetails = organizeResult.details.filter((d) => d.success);
      const failedDetails = organizeResult.details.filter((d) => !d.success);

      const detailColumns = [
        {
          title: '任务ID',
          dataIndex: 'task_id',
          key: 'task_id',
          width: 100,
          render: (id: number) => <Text code>#{id}</Text>,
        },
        {
          title: '任务名称',
          dataIndex: 'task_title',
          key: 'task_title',
          ellipsis: true,
          render: (title: string | undefined) => title || <Text type="secondary">-</Text>,
        },
        {
          title: '状态',
          dataIndex: 'success',
          key: 'status',
          width: 80,
          render: (success: boolean) =>
            success ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                成功
              </Tag>
            ) : (
              <Tag color="error" icon={<CloseCircleOutlined />}>
                失败
              </Tag>
            ),
        },
        {
          title: '说明',
          dataIndex: 'message',
          key: 'message',
          ellipsis: true,
          render: (message: string, record: any) => {
            // 失败任务显示详细错误信息
            if (!record.success) {
              return (
                <Tooltip title={message}>
                  <Text type="danger" ellipsis style={{ maxWidth: '300px', display: 'inline-block' }}>
                    {message}
                  </Text>
                </Tooltip>
              );
            }
            return message;
          },
        },
        {
          title: '父任务ID',
          dataIndex: 'parent_id',
          key: 'parent_id',
          width: 120,
          render: (parentId: number | undefined) =>
            parentId ? <Text code>#{parentId}</Text> : <Text type="secondary">-</Text>,
        },
      ];

      return (
        <div className="complete-step">
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic
                title="成功组织"
                value={organizeResult.organized}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="跳过"
                value={organizeResult.skipped}
                prefix={<InfoCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="失败"
                value={organizeResult.failed}
                valueStyle={{ color: organizeResult.failed > 0 ? '#cf1322' : '#8c8c8c' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
          </Row>

          <Alert
            message={
              organizeResult.failed === 0
                ? '✅ 所有任务组织成功！'
                : `⚠️ 组织完成，但有 ${organizeResult.failed} 个任务失败`
            }
            description={
              organizeResult.failed === 0
                ? `成功将 ${organizeResult.organized} 个任务组织到对应的周汇总下`
                : `成功 ${organizeResult.organized} 个，失败 ${organizeResult.failed} 个，跳过 ${organizeResult.skipped} 个`
            }
            type={organizeResult.failed === 0 ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Collapse
            defaultActiveKey={organizeResult.failed > 0 ? ['failed'] : ['success']}
          >
            {successDetails.length > 0 && (
              <Collapse.Panel
                key="success"
                header={
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>成功的任务 ({successDetails.length})</span>
                  </Space>
                }
              >
                <Table
                  dataSource={successDetails}
                  columns={detailColumns}
                  rowKey="task_id"
                  pagination={successDetails.length > 10 ? { pageSize: 10 } : false}
                  size="small"
                />
              </Collapse.Panel>
            )}
            {failedDetails.length > 0 && (
              <Collapse.Panel
                key="failed"
                header={
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    <span>失败的任务 ({failedDetails.length})</span>
                  </Space>
                }
              >
                <Alert
                  message="失败原因汇总"
                  description={
                    <div>
                      {/* 统计各种失败原因 */}
                      {(() => {
                        const reasonCounts = failedDetails.reduce((acc, detail) => {
                          const reason = detail.message || '未知原因';
                          acc[reason] = (acc[reason] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);

                        return (
                          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                            {Object.entries(reasonCounts).map(([reason, count]) => (
                              <li key={reason}>
                                <Text strong>{reason}</Text>: {count} 个任务
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                  }
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                />
                <Table
                  dataSource={failedDetails}
                  columns={detailColumns}
                  rowKey="task_id"
                  pagination={failedDetails.length > 10 ? { pageSize: 10 } : false}
                  size="small"
                />
              </Collapse.Panel>
            )}
          </Collapse>
        </div>
      );
    }

    return null;
  };

  const renderFooter = () => {
    if (step === 'scan' || step === 'organizing') return null;

    if (step === 'preview') {
      return [
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="organize"
          type="primary"
          onClick={handleOrganize}
          disabled={!scanResult || scanResult.organizable === 0}
        >
          开始组织
        </Button>,
      ];
    }

    if (step === 'complete') {
      return [
        <Button
          key="close"
          type="primary"
          onClick={() => {
            message.success('任务组织完成');
            onComplete();
            resetModal();
          }}
        >
          完成
        </Button>,
      ];
    }

    return null;
  };

  return (
    <Modal
      title={
        <Space>
          <SyncOutlined spin={step === 'scan' || step === 'organizing'} />
          <span>智能组织任务</span>
        </Space>
      }
      open={visible}
      onCancel={() => {
        onCancel();
        resetModal();
      }}
      footer={renderFooter()}
      width={800}
      centered
      maskClosable={false}
    >
      {error && (
        <Alert
          message="操作失败"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}
      {renderContent()}
    </Modal>
  );
};

export default SmartOrganizeModal;
