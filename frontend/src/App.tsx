import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ErrorBoundary from './components/ErrorBoundary';
import PrivateRoute from './components/PrivateRoute';
import PermissionRoute from './components/PermissionRoute';
import Layout from './components/Layout';
import { TimerProvider } from './contexts/TimerContext';
import { QueryProvider } from './providers/QueryProvider';
import { RefreshConfigProvider } from './contexts/RefreshConfigContext';
import { EnterpriseProvider } from './contexts/EnterpriseContext';
import { ImpersonationProvider } from './contexts/ImpersonationContext';
import FloatingTimer from './components/FloatingTimer';
// import UnifiedDebugPanel from './components/UnifiedDebugPanel'; // 隐藏调试功能
import { CacheProvider, DeveloperDebugPanel } from './components/cache';
import { setNavigateFunction } from './services/api';
import { installPerformanceInterceptors, uninstallPerformanceInterceptors } from './utils/apiInterceptor';
import { getCurrentPerformanceConfig, memoryMonitor } from './config/performance';
import { setupModalCleanup } from './utils/modalCleanup';
import { enableGlobalModalHeightManagement, disableGlobalModalHeightManagement } from './utils/modalHeightManager';
import { initSecurityCheck } from './utils/securityCheck';
import {
  ENTERPRISE_PERMISSIONS,
  USER_PERMISSIONS,
  PERMISSION_PERMISSIONS,
  SYSTEM_PERMISSIONS,
  PROJECT_PERMISSIONS,
  TASK_PERMISSIONS,
  DASHBOARD_PERMISSIONS,
  TIME_PERMISSIONS,
  API_KEY_PERMISSIONS,
  AUDIT_PERMISSIONS,
  NAVIGATION_PERMISSIONS,
  ORGANIZATION_PERMISSIONS,
  REQUIREMENT_PERMISSIONS
} from './constants/permissions';
import './App.css';
import './styles/task-hierarchy.css';
import './styles/TaskDocuments.css';
import './styles/modal-text-selection-fix.css';

// 开发环境调试工具将在 AppContent 中按路由条件加载

// Lazy load pages for code splitting
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import(/* webpackPrefetch: true */ './pages/DashboardPage'));
const ProjectsPage = React.lazy(() => import(/* webpackPrefetch: true */ './pages/ProjectsPage'));
const TasksPage = React.lazy(() => import(/* webpackPrefetch: true */ './pages/TasksPage'));
const TaskDetailRouter = React.lazy(() => import('./routes/TaskDetailRouter'));
const GrayReleasePanel = React.lazy(() => import('./components/admin/GrayReleasePanel'));
const TaskEditPage = React.lazy(() => import('./pages/TaskEditPage'));
const AllFieldsTaskListPage = React.lazy(() => import('./pages/AllFieldsTaskListPage'));
const SmartSwimlanesPage = React.lazy(() => import('./pages/SmartSwimlanesPage'));
const TaskCalendarPage = React.lazy(() => import('./pages/TaskCalendarPage'));
const BatchCascadePage = React.lazy(() => import('./pages/BatchCascadePage'));
const TimeWeeklyReportPage = React.lazy(() => import('./pages/TimeWeeklyReportPage'));
// const TimeAnalysisPage = React.lazy(() => import('./pages/TimeAnalysisPage'));
const BulkImportPage = React.lazy(() => import('./pages/BulkImportPage'));
const RecycleBinPage = React.lazy(() => import('./pages/RecycleBinPage'));
const AuditLogPage = React.lazy(() => import('./pages/AuditLogPage'));
const UserProfilePage = React.lazy(() => import('./pages/UserProfilePage'));
const PermissionManagementPage = React.lazy(() => import('./pages/PermissionManagementPage'));
const EnhancedPermissionManagementPage = React.lazy(() => import('./pages/EnhancedPermissionManagementPage'));
const PermissionOverviewPage = React.lazy(() => import('./pages/PermissionOverviewPage'));
const RoleManagementPage = React.lazy(() => import('./pages/RoleManagementPage'));
const AdminRoleListPage = React.lazy(() => import('./pages/AdminRoleListPage'));
const AdminRoleDetailPage = React.lazy(() => import('./pages/AdminRoleDetailPage'));
const UserManagementPage = React.lazy(() => import('./pages/UserManagementPage'));
const UserManagementPageTabbed = React.lazy(() => import('./pages/UserManagementPageTabbed'));
const UserDetailPage = React.lazy(() => import('./pages/UserDetailPage'));
const AIConfigPage = React.lazy(() => import('./pages/AIConfigPageCompact'));
const ProjectDetailPage = React.lazy(() => import('./pages/ProjectDetailPage'));
const ProjectEditPage = React.lazy(() => import('./pages/ProjectEditPageStandard'));
const NavigationManagementPage = React.lazy(() => import('./pages/NavigationManagementPage'));
const APIKeyManagement = React.lazy(() => import('./components/APIKeyManagement'));
const APIKeyDetail = React.lazy(() => import('./components/APIKeyDetail'));
const APIKeyEdit = React.lazy(() => import('./components/APIKeyEdit'));

// Enterprise Organization Management Pages
const EnterpriseManagementPage = React.lazy(() => import('./pages/EnterpriseManagementPage'));
const EnterpriseDetailPage = React.lazy(() => import('./pages/EnterpriseDetailPage'));
const EnterpriseEditPage = React.lazy(() => import('./pages/EnterpriseEditPage'));
const EnterpriseCreatePage = React.lazy(() => import('./pages/EnterpriseCreatePage'));
const OrganizationStructurePage = React.lazy(() => import('./pages/OrganizationStructurePage'));
const PositionManagementPage = React.lazy(() => import('./pages/PositionManagementPage'));
const EnterpriseRoleManagementPage = React.lazy(() => import('./pages/EnterpriseRoleManagementPage'));
const EnterpriseUserManagementPage = React.lazy(() => import('./pages/EnterpriseUserManagementPage'));
const EnterpriseUserDetailPage = React.lazy(() => import('./pages/EnterpriseUserDetailPage'));
const EnterpriseCurrentInfoPage = React.lazy(() => import('./pages/EnterpriseCurrentInfoPage'));
const EnterpriseDepartmentsRedirectPage = React.lazy(() => import('./pages/EnterpriseDepartmentsRedirectPage'));
const EnterpriseUsersRedirectPage = React.lazy(() => import('./pages/EnterpriseUsersRedirectPage'));

const DocumentManagerPage = React.lazy(() => import('./pages/DocumentManagerPage'));
// const DocumentEditorPage = React.lazy(() => import('./pages/DocumentEditorPage')); // 已归档
const RequirementListPage = React.lazy(() => import('./pages/RequirementListPage'));
const RequirementDetailPage = React.lazy(() => import('./pages/RequirementDetailPage'));
const RequirementFormPage = React.lazy(() => import('./pages/RequirementFormPage'));
const DropdownTestPage = React.lazy(() => import('./pages/DropdownTestPage'));
const TaskDocumentListPage = React.lazy(() => import('./pages/TaskDocumentListPage'));
const FullscreenDocumentPreviewPage = React.lazy(() => import('./pages/FullscreenDocumentPreviewPage'));
const ArchivedTasksPage = React.lazy(() => import('./pages/ArchivedTasksPage'));
const TestCenter = React.lazy(() => import('./pages/TestCenter'));
const MCPTestPage = React.lazy(() => import('./pages/MCPTestPage'));
const MCPTestPageFixed = React.lazy(() => import('./pages/MCPTestPageFixed'));
const HierarchicalGanttTestPage = React.lazy(() => import('./pages/HierarchicalGanttTestPage'));
const InteractiveGanttTestPage = React.lazy(() => import('./pages/InteractiveGanttTestPage'));
const ProjectGlobalGanttTestPage = React.lazy(() => import('./pages/ProjectGlobalGanttTestPage'));
const InsightsPage = React.lazy(() => import('./pages/InsightsPage'));
const PermissionDemoPage = React.lazy(() => import('./pages/PermissionDemoPage'));
const RefreshTestPage = React.lazy(() => import('./pages/RefreshTestPage'));
const TestDataGeneratorPage = React.lazy(() => import('./components/TestDataGenerator'));
const DataValidationPage = React.lazy(() => import('./pages/DataValidationPage'));
// const WebSocketProgressTestPage = React.lazy(() => import('./pages/WebSocketProgressTestPage')); // DISABLED: WebSocket functionality
const RoleTemplatesPage = React.lazy(() => import('./pages/RoleTemplatesPage'));
const CacheMonitoringHub = React.lazy(() => import('./components/cache/CacheMonitoringHub'));
const RoleTemplateDetailPage = React.lazy(() => import('./pages/RoleTemplateDetailPage'));
const VersionHistoryPage = React.lazy(() => import('./pages/VersionHistoryPage'));
const VersionHistoryDemoPage = React.lazy(() => import('./pages/VersionHistoryDemoPage'));
const EnhancedTaskHeaderCardDemo = React.lazy(() => import('./pages/TaskDetail/demo/EnhancedTaskHeaderCardDemo'));
const TaskDetailComponentsDemo = React.lazy(() => import('./pages/TaskDetail/demo/TaskDetailComponentsDemo'));
const TodayTasksDashboard = React.lazy(() => import('./pages/TodayTasksDashboard'));
const TodayTasksDetailPage = React.lazy(() => import('./pages/TodayTasksDetailPage'));

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

  // 初始化Modal清理系统和高度管理
  useEffect(() => {
    const modalCleanup = setupModalCleanup();
    
    // 全局启用Modal高度管理（只启用一次）
    enableGlobalModalHeightManagement({
      maxHeightRatio: 0.9,
      topMargin: 20,
      bottomMargin: 20,
      enableAutoScroll: true,
      debug: false // 关闭调试日志避免循环输出
    });
    
    return () => {
      modalCleanup();
      disableGlobalModalHeightManagement();
    };
  }, []);

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
      // 加载API集成测试
      import('./test/apiIntegrationTest').then(({ runAllApiTests }) => {
      }).catch(error => {
        console.warn('API测试加载失败:', error);
      });
    }
  }, [isLoginRoute]);

  return (
    <div className="App">
      {!isLoginRoute ? (
        <CacheProvider debug={process.env.NODE_ENV === 'development'}>
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

                {/* 今日任务路由 */}
                <Route path="/today-tasks" element={
                  <PermissionRoute permissions={[TASK_PERMISSIONS.LIST_READ, TASK_PERMISSIONS.READ]}>
                    <TodayTasksDashboard />
                  </PermissionRoute>
                } />

                <Route path="/today-tasks/detail" element={
                  <PermissionRoute permissions={[TASK_PERMISSIONS.DETAIL_READ, TASK_PERMISSIONS.READ]}>
                    <TodayTasksDetailPage />
                  </PermissionRoute>
                } />

                <Route path="/projects" element={
                  <PermissionRoute permissions={[PROJECT_PERMISSIONS.LIST_READ, PROJECT_PERMISSIONS.READ]}>
                    <ProjectsPage />
                  </PermissionRoute>
                } />

                <Route path="/projects/:projectId" element={
                  <PermissionRoute permissions={[PROJECT_PERMISSIONS.DETAIL_READ, PROJECT_PERMISSIONS.READ]}>
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
                  <PermissionRoute permissions={[TASK_PERMISSIONS.LIST_READ, TASK_PERMISSIONS.READ]}>
                    <TasksPage />
                  </PermissionRoute>
                } />

                {/* 全局洞察 */}
                <Route path="/insights" element={
                  <PermissionRoute permission={DASHBOARD_PERMISSIONS.READ}>
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

                {/* 使用TaskDetailRouter进行灰度发布 */}
                <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailRouter />} />

                <Route path="/projects/:projectId/archived-tasks" element={<ArchivedTasksPage />} />


                <Route path="/time-analysis" element={<div>时间分析页面暂时不可用</div>} />

                <Route path="/time-weekly-report" element={
                  <PermissionRoute permission={TIME_PERMISSIONS.MANAGE}>
                    <TimeWeeklyReportPage />
                  </PermissionRoute>
                } />

                <Route path="/recycle-bin" element={<RecycleBinPage />} />

                <Route path="/audit-logs" element={
                  <PermissionRoute permission={AUDIT_PERMISSIONS.LOGS_READ}>
                    <AuditLogPage />
                  </PermissionRoute>
                } />

                <Route path="/navigation-management" element={
                  <PermissionRoute permission={NAVIGATION_PERMISSIONS.ADMIN}>
                    <NavigationManagementPage />
                  </PermissionRoute>
                } />

                <Route path="/user-profile" element={
                  <PermissionRoute permission={USER_PERMISSIONS.READ}>
                    <UserProfilePage />
                  </PermissionRoute>
                } />

                {/* Enterprise management routes */}
                <Route path="/enterprises" element={<EnterpriseManagementPage />} />
                <Route path="/enterprises/create" element={<EnterpriseCreatePage />} />
                <Route path="/enterprises/:id" element={<EnterpriseDetailPage />} />
                <Route path="/enterprises/:id/edit" element={<EnterpriseEditPage />} />
                <Route path="/enterprises/:id/info" element={<EnterpriseDetailPage />} />

                {/* Enterprise current info route - for impersonation mode */}
                <Route path="/enterprise" element={<EnterpriseCurrentInfoPage />} />
                <Route path="/enterprise/info" element={<EnterpriseCurrentInfoPage />} />

                {/* Enterprise departments route - redirect to organization structure */}
                <Route path="/enterprise/departments" element={<EnterpriseDepartmentsRedirectPage />} />

                {/* Enterprise users route - redirect to current enterprise users */}
                <Route path="/enterprise/users" element={<EnterpriseUsersRedirectPage />} />

                {/* Enterprise customer management routes (legacy) */}

                <Route path="/work-note" element={<DocumentManagerPage />} />


                <Route path="/task-documents" element={<TaskDocumentListPage />} />

                {/* Requirement management routes */}
                <Route path="/requirements" element={
                  <PermissionRoute permissions={[REQUIREMENT_PERMISSIONS.LIST_READ, REQUIREMENT_PERMISSIONS.READ]}>
                    <RequirementListPage />
                  </PermissionRoute>
                } />

                <Route path="/requirements/new" element={
                  <PermissionRoute permission={REQUIREMENT_PERMISSIONS.CREATE}>
                    <RequirementFormPage />
                  </PermissionRoute>
                } />

                <Route path="/requirements/:id" element={
                  <PermissionRoute permissions={[REQUIREMENT_PERMISSIONS.DETAIL_READ, REQUIREMENT_PERMISSIONS.READ]}>
                    <RequirementDetailPage />
                  </PermissionRoute>
                } />

                <Route path="/requirements/:id/edit" element={
                  <PermissionRoute permission={REQUIREMENT_PERMISSIONS.UPDATE}>
                    <RequirementFormPage />
                  </PermissionRoute>
                } />

                {/* Fullscreen document preview route */}
                <Route path="/projects/:projectId/tasks/:taskId/document-preview" element={<FullscreenDocumentPreviewPage />} />

                {/* Version History routes */}
                <Route path="/version-history" element={<VersionHistoryPage />} />
                <Route path="/version-history-demo" element={<VersionHistoryDemoPage />} />
                <Route path="/documents/:documentId/version-history" element={<VersionHistoryPage />} />
                <Route path="/tasks/:taskId/version-history" element={<VersionHistoryPage />} />

                {/* Admin routes - 系统管理 */}
                <Route path="/admin/permissions" element={
                  <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                    <PermissionOverviewPage />
                  </PermissionRoute>
                } />

                <Route path="/admin/roles" element={
                  <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                    <AdminRoleListPage />
                  </PermissionRoute>
                } />

                <Route path="/admin/roles/:id" element={
                  <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                    <AdminRoleDetailPage />
                  </PermissionRoute>
                } />

                {/* 向后兼容的旧路由 - 重定向到新路由 */}
                <Route path="/permissions" element={
                  <Navigate to="/admin/permissions" replace />
                } />

                <Route path="/enhanced-permissions" element={
                  <Navigate to="/admin/permissions" replace />
                } />

                <Route path="/admin/role-templates" element={
                  <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                    <RoleTemplatesPage />
                  </PermissionRoute>
                } />

                <Route path="/admin/role-templates/:id" element={
                  <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                    <RoleTemplateDetailPage />
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
                    <UserManagementPageTabbed />
                  </PermissionRoute>
                } />
                
                <Route path="/users/:userId" element={
                  <PermissionRoute permission={USER_PERMISSIONS.ADMIN}>
                    <UserDetailPage />
                  </PermissionRoute>
                } />
                
                {/* 原用户管理页面临时路由 */}
                <Route path="/user-management-old" element={
                  <PermissionRoute permission={USER_PERMISSIONS.ADMIN}>
                    <UserManagementPage />
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

                {/* Enterprise Organization Management Routes */}
                <Route path="/organization-structure" element={
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.STRUCTURE_READ}>
                    <OrganizationStructurePage />
                  </PermissionRoute>
                } />

                <Route path="/position-management" element={
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.POSITION_READ}>
                    <PositionManagementPage />
                  </PermissionRoute>
                } />

                <Route path="/enterprise-roles" element={
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.ROLE_READ}>
                    <EnterpriseRoleManagementPage />
                  </PermissionRoute>
                } />

                <Route path="/enterprises/:enterpriseId/users" element={
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.USER_READ}>
                    <EnterpriseUserManagementPage />
                  </PermissionRoute>
                } />
                <Route path="/enterprises/:enterpriseId/users/:userId" element={
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.USER_READ}>
                    <EnterpriseUserDetailPage />
                  </PermissionRoute>
                } />

                <Route path="/enterprises/:enterpriseId/organization" element={
                  <PermissionRoute permission={ORGANIZATION_PERMISSIONS.STRUCTURE_READ}>
                    <OrganizationStructurePage />
                  </PermissionRoute>
                } />

                {/* 开发测试相关路由 */}
                <Route path="/test-center" element={<TestCenter />} />
                <Route path="/demo/enhanced-task-header-card" element={<EnhancedTaskHeaderCardDemo />} />
                <Route path="/demo/task-detail-components" element={<TaskDetailComponentsDemo />} />

                {/* 灰度发布管理面板 */}
                <Route path="/admin/gray-release" element={
                  <PermissionRoute permission={SYSTEM_PERMISSIONS.ADMIN}>
                    <GrayReleasePanel />
                  </PermissionRoute>
                } />
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
                <Route path="/test-data-generator" element={
                  <PermissionRoute permission={SYSTEM_PERMISSIONS.ADMIN}>
                    <TestDataGeneratorPage />
                  </PermissionRoute>
                } />
                <Route path="/data-validation" element={
                  <PermissionRoute permission={SYSTEM_PERMISSIONS.ADMIN}>
                    <DataValidationPage />
                  </PermissionRoute>
                } />
                
                {/* 缓存监控中心 - 仅开发环境可用 */}
                {process.env.NODE_ENV === 'development' && (
                  <Route path="/cache-monitoring" element={
                    <PermissionRoute permission={SYSTEM_PERMISSIONS.ADMIN}>
                      <CacheMonitoringHub />
                    </PermissionRoute>
                  } />
                )}
              </Route>
            </Routes>
          </Suspense>

          {/* 悬浮计时器 */}
          <FloatingTimer />

          {/* 开发者缓存调试面板 - 仅开发环境可用 */}
          {process.env.NODE_ENV === 'development' && (
            <DeveloperDebugPanel
              defaultVisible={false}
              enableFloatingTrigger={true}
            />
          )}

        </TimerProvider>
        </CacheProvider>
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
    // 初始化安全检查(HTTPS检测等)
    initSecurityCheck();

    const config = getCurrentPerformanceConfig();

    if (config.enablePerformanceMonitoring) {
      installPerformanceInterceptors();
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
        <EnterpriseProvider>
          <ImpersonationProvider>
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
          </ImpersonationProvider>
        </EnterpriseProvider>
      </RefreshConfigProvider>
    </QueryProvider>
  );
}

export default App;