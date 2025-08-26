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
import FloatingTimer from './components/FloatingTimer';
// import UnifiedDebugPanel from './components/UnifiedDebugPanel'; // 隐藏调试功能
import { setNavigateFunction } from './services/api';
import { installPerformanceInterceptors, uninstallPerformanceInterceptors } from './utils/apiInterceptor';
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
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage'));
const TasksPage = React.lazy(() => import('./pages/TasksPage'));
const TaskDetailPageNew = React.lazy(() => import('./pages/TaskDetailPageNew'));
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
const UserManagementPage = React.lazy(() => import('./pages/UserManagementPage'));
const CompanyUserManagementPage = React.lazy(() => import('./pages/CompanyUserManagementPage'));
const AIConfigPage = React.lazy(() => import('./pages/AIConfigPageCompact'));
const ProjectDetailPage = React.lazy(() => import('./pages/ProjectDetailPage'));
const ProjectEditPage = React.lazy(() => import('./pages/ProjectEditPageStandard'));
const NavigationManagementPage = React.lazy(() => import('./pages/NavigationManagementPage'));
const APIKeyManagement = React.lazy(() => import('./components/APIKeyManagement'));
const APIKeyDetail = React.lazy(() => import('./components/APIKeyDetail'));
const APIKeyEdit = React.lazy(() => import('./components/APIKeyEdit'));

const DocumentManagerPage = React.lazy(() => import('./pages/DocumentManagerPage'));
const ModernDocumentManagerPage = React.lazy(() => import('./pages/ModernDocumentManagerPage'));
// const DocumentEditorPage = React.lazy(() => import('./pages/DocumentEditorPage')); // 已归档
const TaskDocumentListPage = React.lazy(() => import('./pages/TaskDocumentListPage'));
const ArchivedTasksPage = React.lazy(() => import('./pages/ArchivedTasksPage'));
const PersonalTimerPage = React.lazy(() => import('./pages/PersonalTimerPage'));
const TimerAnalyticsPage = React.lazy(() => import('./pages/TimerAnalyticsPage'));
const TestCenter = React.lazy(() => import('./pages/TestCenter'));
const HierarchicalGanttTestPage = React.lazy(() => import('./pages/HierarchicalGanttTestPage'));
const InteractiveGanttTestPage = React.lazy(() => import('./pages/InteractiveGanttTestPage'));
const ProjectGlobalGanttTestPage = React.lazy(() => import('./pages/ProjectGlobalGanttTestPage'));
const InsightsPage = React.lazy(() => import('./pages/InsightsPage'));
const PermissionDemoPage = React.lazy(() => import('./pages/PermissionDemoPage'));

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
    if (process.env.NODE_ENV === 'development' && !isLoginRoute) {
      import('./utils/timerDiagnostics.js').catch(error => {
        console.warn('Failed to load timer diagnostics:', error);
      });
    }
  }, [isLoginRoute]);

  return (
    <div className="App">
      {!isLoginRoute ? (
        <TimerProvider>
          <Suspense fallback={<PageLoading />}>
            <Routes>
            {/* Private routes - all wrapped with TimerProvider */}
            <Route path="/" element={
              <PrivateRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <PermissionRoute permission={DASHBOARD_PERMISSIONS.READ}>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            <Route path="/personal-timer" element={
              <PrivateRoute>
                <PermissionRoute permission={TIME_PERMISSIONS.READ}>
                  <Layout>
                    <PersonalTimerPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            <Route path="/timer-analytics" element={
              <PrivateRoute>
                <PermissionRoute permission={TIME_PERMISSIONS.ANALYTICS_READ}>
                  <Layout>
                    <TimerAnalyticsPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            
            <Route path="/projects" element={
              <PrivateRoute>
                <PermissionRoute permission={PROJECT_PERMISSIONS.READ}>
                  <Layout>
                    <ProjectsPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />

            <Route path="/projects/:projectId" element={
              <PrivateRoute>
                <PermissionRoute permission={PROJECT_PERMISSIONS.READ}>
                  <Layout>
                    <ProjectDetailPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />

            <Route path="/projects/:projectId/edit" element={
              <PrivateRoute>
                <PermissionRoute permission={PROJECT_PERMISSIONS.UPDATE}>
                  <Layout>
                    <ProjectEditPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />

            <Route path="/projects/create" element={
              <PrivateRoute>
                <PermissionRoute permission={PROJECT_PERMISSIONS.CREATE}>
                  <Layout>
                    <ProjectEditPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />



            <Route path="/projects/:projectId/documents/new" element={
              <PrivateRoute>
                <Layout>
                  <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>📄 文档编辑器已归档</h2>
                    <p>复杂的文档编辑功能已简化，请使用任务详情页面中的文档编辑功能</p>
                  </div>
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/documents/new" element={
              <PrivateRoute>
                <Layout>
                  <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>📄 文档编辑器已归档</h2>
                    <p>复杂的文档编辑功能已简化，请使用任务详情页面中的文档编辑功能</p>
                  </div>
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/documents/:id/edit" element={
              <PrivateRoute>
                <Layout>
                  <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>📄 文档编辑器已归档</h2>
                    <p>复杂的文档编辑功能已简化，请使用任务详情页面中的文档编辑功能</p>
                  </div>
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/documents/:id" element={
              <PrivateRoute>
                <Layout>
                  <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>📄 文档编辑器已归档</h2>
                    <p>复杂的文档编辑功能已简化，请使用任务详情页面中的文档编辑功能</p>
                  </div>
                </Layout>
              </PrivateRoute>
            } />
            
            {/* 全部任务（跨项目） */}
<Route path="/tasks" element={
              <PrivateRoute>
                <PermissionRoute permission={TASK_PERMISSIONS.READ}>
                  <Layout>
                    <TasksPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />

            {/* 全局洞察 */}
            <Route path="/insights" element={
              <PrivateRoute>
                <PermissionRoute permission={DASHBOARD_PERMISSIONS.INSIGHTS_READ}>
                  <Layout>
                    <InsightsPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />

<Route path="/projects/:projectId/insights" element={
              <PrivateRoute>
                <Layout>
                  <InsightsPage />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/projects/:projectId/tasks" element={
              <PrivateRoute>
                <Layout>
                  <TasksPage />
                </Layout>
              </PrivateRoute>
            } />

{/* Beta MVP: 智能泳道视图 */}
            <Route path="/projects/:projectId/tasks/swimlanes" element={
              <PrivateRoute>
                <Layout>
                  <SmartSwimlanesPage />
                </Layout>
              </PrivateRoute>
            } />

            {/* Beta MVP: 任务日历视图 */}
            <Route path="/projects/:projectId/tasks/calendar" element={
              <PrivateRoute>
                <Layout>
                  <TaskCalendarPage />
                </Layout>
              </PrivateRoute>
            } />

            {/* Beta MVP: 批量级联页面 */}
            <Route path="/projects/:projectId/tasks/batch-cascade" element={
              <PrivateRoute>
                <Layout>
                  <BatchCascadePage />
                </Layout>
              </PrivateRoute>
            } />
            
            {/* 项目任务列表 - 只支持项目内任务 */}
            
            <Route path="/projects/:projectId/tasks/all-fields" element={
              <PrivateRoute>
                <Layout>
                  <AllFieldsTaskListPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/bulk-import" element={
              <PrivateRoute>
                <Layout>
                  <BulkImportPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/projects/:projectId/bulk-import" element={
              <PrivateRoute>
                <Layout>
                  <BulkImportPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/projects/:projectId/tasks/:taskId/edit" element={
              <PrivateRoute>
                <Layout>
                  <TaskEditPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/projects/:projectId/tasks/:taskId" element={
              <PrivateRoute>
                <Layout>
                  <TaskDetailPageNew />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/projects/:projectId/archived-tasks" element={
              <PrivateRoute>
                <Layout>
                  <ArchivedTasksPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/task-dashboard" element={
              <PrivateRoute>
                <Layout>
                  <TaskDashboardPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/time-analysis" element={
              <PrivateRoute>
                <Layout>
                  {/* <TimeAnalysisPage /> */}
                  <div>时间分析页面暂时不可用</div>
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/time-weekly-report" element={
              <PrivateRoute>
                <PermissionRoute permission={TIME_PERMISSIONS.REPORT_READ}>
                  <Layout>
                    <TimeWeeklyReportPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            <Route path="/recycle-bin" element={
              <PrivateRoute>
                <Layout>
                  <RecycleBinPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/audit-logs" element={
              <PrivateRoute>
                <PermissionRoute permission={AUDIT_PERMISSIONS.READ}>
                  <Layout>
                    <AuditLogPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            <Route path="/navigation-management" element={
              <PrivateRoute>
                <PermissionRoute permission={NAVIGATION_PERMISSIONS.ADMIN}>
                  <Layout>
                    <NavigationManagementPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            <Route path="/user-profile" element={
              <PrivateRoute>
                <PermissionRoute permission={USER_PERMISSIONS.PROFILE_READ}>
                  <Layout>
                    <UserProfilePage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            {/* Enterprise customer management routes */}
            <Route path="/companies" element={
              <PrivateRoute>
                <PermissionRoute permission={COMPANY_PERMISSIONS.READ}>
                  <Layout>
                    <CompanyListPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            <Route path="/companies/:id" element={
              <PrivateRoute>
                <PermissionRoute permission={COMPANY_PERMISSIONS.READ}>
                  <Layout>
                    <CompanyDetailPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            <Route path="/companies/create" element={
              <PrivateRoute>
                <PermissionRoute permission={COMPANY_PERMISSIONS.CREATE}>
                  <Layout>
                    <CompanyCreatePage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            <Route path="/companies/:id/edit" element={
              <PrivateRoute>
                <PermissionRoute permission={COMPANY_PERMISSIONS.UPDATE}>
                  <Layout>
                    <CompanyEditPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />


            
            <Route path="/document-manager" element={
              <PrivateRoute>
                <Layout>
                  <ModernDocumentManagerPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/document-manager-old" element={
              <PrivateRoute>
                <Layout>
                  <DocumentManagerPage />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/task-documents" element={
              <PrivateRoute>
                <Layout>
                  <TaskDocumentListPage />
                </Layout>
              </PrivateRoute>
            } />

            {/* Permission management routes */}
            <Route path="/permissions" element={
              <PrivateRoute>
                <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                  <Layout>
                    <PermissionManagementPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />

            <Route path="/enhanced-permissions" element={
              <PrivateRoute>
                <PermissionRoute permission={PERMISSION_PERMISSIONS.ADMIN}>
                  <Layout>
                    <EnhancedPermissionManagementPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />

            {/* Permission demo page */}
            <Route path="/permission-demo" element={
              <PrivateRoute>
                <Layout>
                  <PermissionDemoPage />
                </Layout>
              </PrivateRoute>
            } />

            {/* User management routes */}
            <Route path="/user-management" element={
              <PrivateRoute>
                <PermissionRoute permission={USER_PERMISSIONS.ADMIN}>
                  <Layout>
                    <UserManagementPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            <Route path="/company-user-management" element={
              <PrivateRoute>
                <PermissionRoute permission={COMPANY_PERMISSIONS.USER_ADMIN}>
                  <Layout>
                    <CompanyUserManagementPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />

            {/* AI configuration routes */}
            <Route path="/ai-config" element={
              <PrivateRoute>
                <PermissionRoute permission={SYSTEM_PERMISSIONS.ADMIN}>
                  <Layout>
                    <AIConfigPage />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />

            {/* API Key management routes */}
            <Route path="/api-keys" element={
              <PrivateRoute>
                <PermissionRoute permission={API_KEY_PERMISSIONS.READ}>
                  <Layout>
                    <APIKeyManagement />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            <Route path="/api-keys/:id" element={
              <PrivateRoute>
                <PermissionRoute permission={API_KEY_PERMISSIONS.READ}>
                  <Layout>
                    <APIKeyDetail />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />
            
            <Route path="/api-keys/:id/edit" element={
              <PrivateRoute>
                <PermissionRoute permission={API_KEY_PERMISSIONS.UPDATE}>
                  <Layout>
                    <APIKeyEdit />
                  </Layout>
                </PermissionRoute>
              </PrivateRoute>
            } />

            {/* Test Center route */}
            <Route path="/test-center" element={
              <PrivateRoute>
                <TestCenter />
              </PrivateRoute>
            } />
            
            {/* Hierarchical Gantt Test Page */}
            <Route path="/hierarchical-gantt-test" element={
              <PrivateRoute>
                <HierarchicalGanttTestPage />
              </PrivateRoute>
            } />
            
            {/* Interactive Gantt Test Page */}
            <Route path="/interactive-gantt-test" element={
              <PrivateRoute>
                <InteractiveGanttTestPage />
              </PrivateRoute>
            } />
            
            {/* Project Global Gantt Test Page */}
            <Route path="/project-global-gantt-test" element={
              <PrivateRoute>
                <ProjectGlobalGanttTestPage />
              </PrivateRoute>
            } />
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
  // 安装性能监控拦截器
  useEffect(() => {
    installPerformanceInterceptors();
    
    return () => {
      uninstallPerformanceInterceptors();
    };
  }, []);

  // 我们需要根据路由决定是否挂载 TimerProvider，但这里拿不到 location
  // 解决：将 Router 提到外层，TimerProvider 放到 AppContent 中按需包裹
  return (
    <QueryProvider>
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
    </QueryProvider>
  );
}

export default App;