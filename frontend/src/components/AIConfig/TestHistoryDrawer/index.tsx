import React, { useState } from 'react';
import { Drawer, Space } from 'antd';
import { FilterBar } from './FilterBar';
import { StatisticsCard } from './StatisticsCard';
import { TestTimeline } from './TestTimeline';
import { TestDetailModal } from './TestDetailModal';
import { useTestHistory } from '../hooks/useTestHistory';
import type { AIProvider, TestLog } from '../../../types/aiConfig';

interface TestHistoryDrawerProps {
  provider: AIProvider;
  visible: boolean;
  onClose: () => void;
}

export const TestHistoryDrawer: React.FC<TestHistoryDrawerProps> = ({
  provider,
  visible,
  onClose
}) => {
  const [selectedLog, setSelectedLog] = useState<TestLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const {
    logs,
    pagination,
    statistics,
    loading,
    filters,
    updateFilters,
    refresh
  } = useTestHistory(provider);

  /**
   * 查看详情
   */
  const handleViewDetail = (log: TestLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  };

  /**
   * 关闭详情弹窗
   */
  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedLog(null);
  };

  /**
   * 重试测试
   */
  const handleRetry = (log: TestLog) => {
    // TODO: 实现重试逻辑
    console.log('Retry test:', log);
  };

  /**
   * 分页变化
   */
  const handlePageChange = (page: number, pageSize: number) => {
    updateFilters({ page, limit: pageSize });
  };

  return (
    <>
      <Drawer
        title={`测试历史 - ${provider.toUpperCase()}`}
        placement="right"
        width={720}
        open={visible}
        onClose={onClose}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <FilterBar
            filters={filters}
            onFiltersChange={updateFilters}
          />

          <StatisticsCard
            statistics={statistics}
            loading={loading}
          />

          <TestTimeline
            logs={logs}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onViewDetail={handleViewDetail}
            onRetry={handleRetry}
          />
        </Space>
      </Drawer>

      <TestDetailModal
        log={selectedLog}
        visible={detailModalVisible}
        onClose={handleCloseDetail}
      />
    </>
  );
};
