import React from 'react';
import { Timeline, Empty, Spin, Pagination } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { TestLogCard } from './TestLogCard';
import type { TestLog, TestHistoryPagination } from '@/types/aiConfig';

interface TestTimelineProps {
  logs: TestLog[];
  loading: boolean;
  pagination: TestHistoryPagination | null;
  onPageChange: (page: number, pageSize: number) => void;
  onViewDetail: (log: TestLog) => void;
  onRetry?: (log: TestLog) => void;
}

export const TestTimeline: React.FC<TestTimelineProps> = ({
  logs,
  loading,
  pagination,
  onPageChange,
  onViewDetail,
  onRetry
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" tip="加载测试历史...">
          <div style={{ minHeight: '100px' }} />
        </Spin>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无测试记录"
      />
    );
  }

  return (
    <>
      <Timeline mode="left">
        {logs.map((log) => (
          <Timeline.Item
            key={log.id}
            dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
          >
            <TestLogCard
              log={log}
              onViewDetail={onViewDetail}
              onRetry={onRetry}
            />
          </Timeline.Item>
        ))}
      </Timeline>

      {pagination && pagination.totalPages > 1 && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Pagination
            current={pagination.page}
            pageSize={pagination.limit}
            total={pagination.total}
            showSizeChanger
            showQuickJumper
            showTotal={(total) => `共 ${total} 条记录`}
            onChange={onPageChange}
          />
        </div>
      )}
    </>
  );
};
