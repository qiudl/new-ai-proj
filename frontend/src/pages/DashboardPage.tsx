import React from 'react';
import { 
  Button, 
  Spin, 
  Alert,
  Typography,
  Space
} from 'antd';
import { 
  TrophyOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { 
  DashboardService, 
  DashboardStats, 
  ProjectProgressInfo, 
  UserWorkload 
} from '../services/dashboardService';
import { TimelineEvent } from '../types/task';
import { useCache } from '../hooks/useCache';
import DraggableDashboard from '../components/DraggableDashboard';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  // 使用缓存钩子加载各类数据
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useCache<DashboardStats>(
    'dashboard-stats',
    () => DashboardService.getDashboardStats(),
    { ttl: 2 * 60 * 1000 } // 2分钟缓存
  );

  const {
    data: recentActivities,
    loading: activitiesLoading,
    refresh: refreshActivities
  } = useCache<TimelineEvent[]>(
    'dashboard-activities',
    () => DashboardService.getRecentActivities(6),
    { ttl: 1 * 60 * 1000 } // 1分钟缓存
  );

  const {
    data: projectProgress,
    loading: progressLoading,
    refresh: refreshProgress
  } = useCache<ProjectProgressInfo[]>(
    'dashboard-progress',
    () => DashboardService.getProjectProgress(),
    { ttl: 5 * 60 * 1000 } // 5分钟缓存
  );

  const {
    data: userWorkload,
    loading: workloadLoading,
    refresh: refreshWorkload
  } = useCache<UserWorkload[]>(
    'dashboard-workload',
    () => DashboardService.getUserWorkload(),
    { ttl: 3 * 60 * 1000 } // 3分钟缓存
  );

  const {
    data: productivityStats,
    loading: productivityLoading,
    refresh: refreshProductivity
  } = useCache(
    'dashboard-productivity',
    () => DashboardService.getProductivityStats(),
    { ttl: 10 * 60 * 1000 } // 10分钟缓存
  );

  // 计算加载状态
  const isLoading = statsLoading || activitiesLoading || progressLoading || workloadLoading || productivityLoading;
  const hasError = statsError;

  // 刷新所有数据
  const refreshAllData = async () => {
    await Promise.all([
      refreshStats(),
      refreshActivities(),
      refreshProgress(),
      refreshWorkload(),
      refreshProductivity()
    ]);
  };

  if (isLoading && !stats) {
    return (
      <div className="page-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" tip="加载工作台数据...">
          <div style={{ height: '200px', width: '100%' }} />
        </Spin>
      </div>
    );
  }

  // 显示部分错误状态但继续显示可用数据
  const hasPartialData = stats || recentActivities || projectProgress || userWorkload || productivityStats;
  
  if (hasError && !hasPartialData) {
    return (
      <div className="page-container">
        <Alert
          message="数据加载失败"
          description="无法加载工作台数据，请检查网络连接或刷新页面重试"
          type="error"
          showIcon
          action={
            <Button size="small" onClick={refreshAllData} loading={isLoading}>
              重新加载
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* 部分错误提示 */}
      {hasError && hasPartialData && (
        <Alert
          message="部分数据加载失败"
          description="某些模块数据无法加载，显示的数据可能不完整"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
          action={
            <Button size="small" onClick={refreshAllData} loading={isLoading}>
              重试
            </Button>
          }
        />
      )}
      
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <Space>
                <TrophyOutlined style={{ color: '#faad14' }} />
                工作台
              </Space>
            </Title>
            <Text type="secondary">项目和任务概览 · 可拖拽布局</Text>
          </div>
        </div>
      </div>

      <DraggableDashboard
        stats={stats}
        recentActivities={recentActivities}
        projectProgress={projectProgress}
        userWorkload={userWorkload}
        productivityStats={productivityStats}
        activitiesLoading={activitiesLoading}
        progressLoading={progressLoading}
        workloadLoading={workloadLoading}
        productivityLoading={productivityLoading}
        refreshAllData={refreshAllData}
        isLoading={isLoading}
      />
    </div>
  );
};

export default DashboardPage;
