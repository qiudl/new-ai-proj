import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ErrorBoundary from './components/ErrorBoundary';
import PrivateRoute from './components/PrivateRoute';
import PermissionRoute from './components/PermissionRoute';
import Layout from './components/Layout';
import { TimerProvider } from './contexts/TimerContext';
import { QueryProvider } from './providers/QueryProvider';
import { RefreshConfigProvider } from './contexts/RefreshConfigContext';
import FloatingTimer from './components/FloatingTimer';
// import UnifiedDebugPanel from './components/UnifiedDebugPanel'; // 隐藏调试功能
import { setNavigateFunction } from './services/api';
import { installPerformanceInterceptors, uninstallPerformanceInterceptors } from './utils/apiInterceptor';
import { getCurrentPerformanceConfig, memoryMonitor } from './config/performance';
import {
  COMPANY_PERMISSIONS,
  USER_PERMISSIONS,
  PERMISSION_PERMISSIONS,
  SYSTEM_PERMISSIONS,
  PROJECT_PERMISSIONS,
  TASK_PERMISSIONS,
  DASHBOARD_PERMISSIONS,
  TIME_PERMISSIONS,
  API_KEY_PERMISSIONS,
  AUDIT_PERMISSIONS,
  NAVIGATION_PERMISSIONS
} from './constants/permissions';
import './App.css';
import './styles/task-hierarchy.css';
import './styles/TaskDocuments.css';

// 开发环境调试工具将在 AppContent 中按路由条件加载

// Lazy load pages for code splitting
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import(/* webpackPrefetch: true */ './pages/DashboardPage'));
const ProjectsPage = React.lazy(() => import(/* webpackPrefetch: true */ './pages/ProjectsPage'));
const TasksPage = React.lazy(() => import(/* webpackPrefetch: true */ './pages/TasksPage'));
const TaskDetailPageNew = React.lazy(() => import(/* webpackPrefetch: true */ './pages/TaskDetailPageNew'));
const TaskEditPage = React.lazy(() => import('./pages/TaskEditPage'));
const AllFieldsTaskListPage = React.lazy(() => import('./pages/AllFieldsTaskListPage'));
const SmartSwimlanesPage = React.lazy(() => import('./pages/SmartSwimlanesPage'));
const TaskDashboardPage = React.lazy(() => import('./pages/TaskDashboardPage'));
const TaskCalendarPage = React.lazy(() => import('./pages/TaskCalendarPage'));
const BatchCascadePage = React.lazy(() => import('./pages/BatchCascadePage'));
const TimeWeeklyReportPage = React.lazy(() => import('./pages/TimeWeeklyReportPage'));
// const TimeAnalysisPage = React.lazy(() => import('./pages/TimeAnalysisPage'));
const BulkImportPage = React.lazy(() => import('./pages/BulkImportPage'));
const RecycleBinPage = React.lazy(() => import('./pages/RecycleBinPage'));
const AuditLogPage = React.lazy(() => import('./pages/AuditLogPage'));
const UserProfilePage = React.lazy(() => import('./pages/UserProfilePage'));
const CompanyListPage = React.lazy(() => import('./pages/CompanyListPage'));
const CompanyDetailPage = React.lazy(() => import('./pages/CompanyDetailPage'));
const CompanyCreatePage = React.lazy(() => import('./pages/CompanyCreatePage'));
const CompanyEditPage = React.lazy(() => import('./pages/CompanyEditPage'));
const PermissionManagementPage = React.lazy(() => import('./pages/PermissionManagementPage'));
const EnhancedPermissionManagementPage = React.lazy(() => import('./pages/EnhancedPermissionManagementPage'));
const RoleManagementPage = React.lazy(() => import('./pages/RoleManagementPage'));
const UserManagementPage = React.lazy(() => import('./pages/UserManagementPage'));
const CompanyUserManagementPage = React.lazy(() => import('./pages/CompanyUserManagementPage'));
const AIConfigPage = React.lazy(() => import('./pages/AIConfigPageCompact'));
const ProjectDetailPage = React.lazy(() => import('./pages/ProjectDetailPage'));
const ProjectEditPage = React.lazy(() => import('./pages/ProjectEditPageStandard'));
const NavigationManagementPage = React.lazy(() => import('./pages/NavigationManagementPage'));
const APIKeyManagement = React.lazy(() => import('./components/APIKeyManagement'));
const APIKeyDetail = React.lazy(() => import('./components/APIKeyDetail'));
const APIKeyEdit = React.lazy(() => import('./components/APIKeyEdit'));

const ModernDocumentManagerPage = React.lazy(() => import('./pages/ModernDocumentManagerPage'));
// const DocumentEditorPage = React.lazy(() => import('./pages/DocumentEditorPage')); // 已归档
const DropdownTestPage = React.lazy(() => import('./pages/DropdownTestPage'));
const TaskDocumentListPage = React.lazy(() => import('./pages/TaskDocumentListPage'));
const ArchivedTasksPage = React.lazy(() => import('./pages/ArchivedTasksPage'));
const PersonalTimerPage = React.lazy(() => import('./pages/PersonalTimerPage'));
const TimerAnalyticsPage = React.lazy(() => import('./pages/TimerAnalyticsPage'));
const TestCenter = React.lazy(() => import('./pages/TestCenter'));
const MCPTestPage = React.lazy(() => import('./pages/MCPTestPage'));
const MCPTestPageFixed = React.lazy(() => import('./pages/MCPTestPageFixed'));
const HierarchicalGanttTestPage = React.lazy(() => import('./pages/HierarchicalGanttTestPage'));
const InteractiveGanttTestPage = React.lazy(() => import('./pages/InteractiveGanttTestPage'));
const ProjectGlobalGanttTestPage = React.lazy(() => import('./pages/ProjectGlobalGanttTestPage'));
const InsightsPage = React.lazy(() => import('./pages/InsightsPage'));
const PermissionDemoPage = React.lazy(() => import('./pages/PermissionDemoPage'));
const RefreshTestPage = React.lazy(() => import('./pages/RefreshTestPage'));
// const WebSocketProgressTestPage = React.lazy(() => import('./pages/WebSocketProgressTestPage')); // DISABLED: WebSocket functionality

// Loading component for Suspense
const PageLoading = () => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh' 
  }}>
    <Spin size="large" />
    <div style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
      页面加载中...
    </div>
  </div>
);

// 内部App组件用于访问useNavigate
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 设置全局导航函数
  useEffect(() => {
    setNavigateFunction(navigate);
    }, [navigate]);

  const isLoginRoute = location.pathname === '/login';

  // 开发环境按需加载定时器诊断工具（登录页不加载）
  useEffect(() => {
    if (process.env['NODE_ENV'] === 'development' && !isLoginRoute) {
      import('./utils/timerDiagnostics.js').catch(error => {
        console.warn('Failed to load timer diagnostics:', error);
      });
      // 加载认证修复工具
      import('./utils/authFix').catch(error => {
        console.warn('Failed to load auth fix tool:', error);
      });
    }
  }, [isLoginRoute]);

  return (
    <div className="App">
      {!isLoginRoute ? (
        <TimerProvider>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* 将 Layout 提升为父级并由 PrivateRoute 保护，子路由不再重复包裹 */}
              <Route element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }>
                <Route index element={<DashboardPage />} />

                <Route path="/dashboard" element={
                  <PermissionRoute permission={DASHBOARD_PERMISSIONS.READ}>
                    <DashboardPage />
                  </PermissionRoute>
                } />

                <Route path="/personal-timer" element={
                  <PermissionRoute permission={TIME_PERMISSIONS.READ}>
                    <PersonalTimerPage />
                  </PermissionRoute>
                } />

                <Route path="/timer-analytics" element={
                  <PermissionRoute permission={TIME_PERMISSIONS.ANALYTICS_READ}>
                    <TimerAnalyticsPage />
                  </PermissionRoute>
                } />

                <Route path="/projects" element={
                  <PermissionRoute permission={PROJECT_PERMISSIONS.READ}>
                    <ProjectsPage />
                  </PermissionRoute>
                } />

                <Route path="/projects/:projectId" element={
                  <PermissionRoute permission={PROJECT_PERMISSIONS.READ}>
                    <ProjectDetailPage />
                  </PermissionRoute>
                } />

                <Route path="/projects/:projectId/edit" element={
                  <PermissionRoute permission={PROJECT_PERMISSIONS.UPDATE}>
                    <ProjectEditPage />
                  </PermissionRoute>
                } />

                <Route path="/projects/create" element={
                  <PermissionRoute permission={PROJECT_PERMISSIONS.CREATE}>
                    <ProjectEditPage />
                  </PermissionRoute>
                } />

                <Route path="/projects/:projectId/documents/new" element={
                  <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>📄 文档编辑器已归档</h2>
                    <p>复杂的文档编辑功能已简化，请使用任务详情页面中的文档编辑功能</p>
                  </div>
                } />

                <Route path="/documents/new" element={
                  <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>📄 文档编辑器已归档</h2>
                    <p>复杂的文档编辑功能已简化，请使用任务详情页面中的文档编辑功能</p>
                  </div>
                } />

                <Route path="/documents/:id/edit" element={
                  <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>📄 文档编辑器已归档</h2>
                    <p>复杂的文档编辑功能已简化，请使用任务详情页面中的文档编辑功能</p>
                  </div>
                } />

                <Route path="/documents/:id" element={
                  <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>📄 文档编辑器已归档</h2>
                    <p>复杂的文档编辑功能已简化，请使用任务详情页面中的文档编辑功能</p>
                  </div>
                } />

                {/* 全部任务（跨项目） */}
                <Route path="/tasks" element={
                  <PermissionRoute permission={TASK_PERMISSIONS.READ}>
                    <TasksPage />
                  </PermissionRoute>
                } />

                {/* 全局洞察 */}
                <Route path="/insights" element={
                  <PermissionRoute permission={DASHBOARD_PERMISSIONS.INSIGHTS_READ}>
                    <InsightsPage />
                  </PermissionRoute>
                } />

                <Route path="/projects/:projectId/insights" element={<InsightsPage />} />

                <Route path="/projects/:projectId/tasks" element={<TasksPage />} />

                {/* Beta MVP: 智能泳道视图 */}
                <Route path="/projects/:projectId/tasks/swimlanes" element={<SmartSwimlanesPage />} />

                {/* Beta MVP: 任务日历视图 */}
                <Route path="/projects/:projectId/tasks/calendar" element={<TaskCalendarPage />} />

                {/* Beta MVP: 批量级联页面 */}
                <Route path="/projects/:projectId/tasks/batch-cascade" element={<BatchCascadePage />} />

                {/* 项目任务列表 - 只支持项目内任务 */}
                <Route path="/projects/:projectId/tasks/all-fields" element={<AllFieldsTaskListPage />} />

                <Route path="/bulk-import" element={<BulkImportPage />} />

                <Route path="/projects/:projectId/bulk-import" element={<BulkImportPage />} />

                <Route path="/projects/:projectId/tasks/:taskId/edit" element={<TaskEditPage />} />

                <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPageNew />} />

                <Route path="/projects/:projectId/archived-tasks" element={<ArchivedTasksPage />} />

                <Route path="/task-dashboard" element={<TaskDashboardPage />} />

                <Route path="/time-analysis" element={<div>时间分析页面暂时不可用</div>} />

                <Route path="/time-weekly-report" element={
                  <PermissionRoute permission={TIME_PERMISSIONS.REPORT_READ}>
                    <TimeWeeklyReportPage />
                  </PermissionRoute>
                } />

                <Route path="/recycle-bin" element={<RecycleBinPage />} />

                <Route path="/audit-logs" element={
                  <PermissionRoute permission={AUDIT_PERMISSIONS.READ}>
                    <AuditLogPage />
                  </PermissionRoute>
                } />

                <Route path="/navigation-management" element={
                  <PermissionRoute permission={NAVIGATION_PERMISSIONS.ADMIN}>
                    <NavigationManagementPage />
                  </PermissionRoute>
                } />

                <Route path="/user-profile" element={
                  <PermissionRoute permission={USER_PERMISSIONS.PROFILE_READ}>
                    <UserProfilePage />
                  </PermissionRoute>
                } />

                {/* Enterprise customer management routes */}
                <Route path="/companies" element={
                  <PermissionRoute permission={COMPANY_PERMISSIONS.READ}>
                    <CompanyListPage />
                  </PermissionRoute>
                } />

                <Route path="/companies/:id" element={
                  <PermissionRoute permission={COMPANY_PERMISSIONS.READ}>
                    <CompanyDetailPage />
                  </PermissionRoute>
                } />

                <Route path="/companies/create" element={
                  <PermissionRoute permission={COMPANY_PERMISSIONS.CREATE}>
                    <CompanyCreatePage />
                  </PermissionRoute>
                } />

                <Route path="/companies/:id/edit" element={
                  <PermissionRoute permission={COMPANY_PERMISSIONS.UPDATE}>
                    <CompanyEditPage />
                  </PermissionRoute>
                } />

                <Route path="/document-manager" element={<ModernDocumentManagerPage />} />


                <Route path="/task-documents" element={<TaskDocumentListPage />} />

                {/* Permission management routes */}
                <Route path="/permissions" element={
                  <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                    <PermissionManagementPage />
                  </PermissionRoute>
                } />

                <Route path="/enhanced-permissions" element={
                  <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                    <EnhancedPermissionManagementPage />
                  </PermissionRoute>
                } />

                {/* Role management routes */}
                <Route path="/role-management" element={
                  <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                    <RoleManagementPage />
                  </PermissionRoute>
                } />

                <Route path="/role-management/:id" element={
                  <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                    <RoleManagementPage />
                  </PermissionRoute>
                } />

                {/* Permission demo page */}
                <Route path="/permission-demo" element={<PermissionDemoPage />} />

                {/* User management routes */}
                <Route path="/user-management" element={
                  <PermissionRoute permission={USER_PERMISSIONS.ADMIN}>
                    <UserManagementPage />
                  </PermissionRoute>
                } />

                <Route path="/company-user-management" element={
                  <PermissionRoute permission={COMPANY_PERMISSIONS.USER_ADMIN}>
                    <CompanyUserManagementPage />
                  </PermissionRoute>
                } />

                {/* AI configuration routes */}
                <Route path="/ai-config" element={
                  <PermissionRoute permission={SYSTEM_PERMISSIONS.ADMIN}>
                    <AIConfigPage />
                  </PermissionRoute>
                } />

                {/* API Key management routes */}
                <Route path="/api-keys" element={
                  <PermissionRoute permission={API_KEY_PERMISSIONS.READ}>
                    <APIKeyManagement />
                  </PermissionRoute>
                } />

                <Route path="/api-keys/:id" element={
                  <PermissionRoute permission={API_KEY_PERMISSIONS.READ}>
                    <APIKeyDetail />
                  </PermissionRoute>
                } />

                <Route path="/api-keys/:id/edit" element={
                  <PermissionRoute permission={API_KEY_PERMISSIONS.UPDATE}>
                    <APIKeyEdit />
                  </PermissionRoute>
                } />

                {/* 开发测试相关路由 */}
                <Route path="/test-center" element={<TestCenter />} />
                <Route path="/mcp-test" element={
                  <PermissionRoute permission={SYSTEM_PERMISSIONS.ADMIN}>
                    <MCPTestPage />
                  </PermissionRoute>
                } />
                <Route path="/mcp-test-fixed" element={
                  <PermissionRoute permission={SYSTEM_PERMISSIONS.ADMIN}>
                    <MCPTestPageFixed />
                  </PermissionRoute>
                } />
                <Route path="/dropdown-test" element={<DropdownTestPage />} />
                <Route path="/hierarchical-gantt-test" element={<HierarchicalGanttTestPage />} />
                <Route path="/interactive-gantt-test" element={<InteractiveGanttTestPage />} />
                <Route path="/project-global-gantt-test" element={<ProjectGlobalGanttTestPage />} />
                <Route path="/refresh-test" element={<RefreshTestPage />} />
              </Route>
            </Routes>
          </Suspense>

          {/* 悬浮计时器 */}
          <FloatingTimer />

        </TimerProvider>
      ) : (
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Suspense>
      )}

      {/* Unified Debug Panel - includes timer and JWT debug (隐藏调试功能) */}
      {/* <UnifiedDebugPanel /> */}
    </div>
  );
};

function App() {
  // 根据环境配置决定是否安装性能监控拦截器
  useEffect(() => {
    const config = getCurrentPerformanceConfig();
    
    if (config.enablePerformanceMonitoring) {
      installPerformanceInterceptors();
      if (process.env.NODE_ENV === 'development') {
        console.log('性能监控已启用');
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log('性能监控已禁用（优化内存使用）');
    }
    
    // 启动内存监控
    if (config.memoryCheckInterval > 0) {
      memoryMonitor.start();
    }
    
    return () => {
      uninstallPerformanceInterceptors();
      memoryMonitor.cleanup();
    };
  }, []);

  // 我们需要根据路由决定是否挂载 TimerProvider，但这里拿不到 location
  // 解决：将 Router 提到外层，TimerProvider 放到 AppContent 中按需包裹
  return (
    <QueryProvider>
      <RefreshConfigProvider>
        <ConfigProvider locale={zhCN}>
          <ErrorBoundary>
            <Router 
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              {/* 在 AppContent 内部按路由条件挂载 TimerProvider */}
              <AppContent />
            </Router>
          </ErrorBoundary>
        </ConfigProvider>
      </RefreshConfigProvider>
    </QueryProvider>
  );
}

export default App;