import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ErrorBoundary from './components/ErrorBoundary';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import './App.css';
import './styles/task-hierarchy.css';

// Lazy load pages for code splitting
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const OptimizedDashboardPage = React.lazy(() => import('./pages/OptimizedDashboardPage'));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage'));
const ProjectDashboardPage = React.lazy(() => import('./pages/ProjectDashboardPage'));
const TasksPage = React.lazy(() => import('./pages/TasksPage'));
const TaskDetailPageNew = React.lazy(() => import('./pages/TaskDetailPageNew'));
const TaskEditPage = React.lazy(() => import('./pages/TaskEditPage'));
const AllFieldsTaskListPage = React.lazy(() => import('./pages/AllFieldsTaskListPage'));
const TaskDashboardPage = React.lazy(() => import('./pages/TaskDashboardPage'));
const BulkImportPage = React.lazy(() => import('./pages/BulkImportPage'));
const RecycleBinPage = React.lazy(() => import('./pages/RecycleBinPage'));
const AuditLogPage = React.lazy(() => import('./pages/AuditLogPage'));
const UserProfilePage = React.lazy(() => import('./pages/UserProfilePage'));
const CustomerListPage = React.lazy(() => import('./pages/CustomerListPage'));
const CustomerCreatePage = React.lazy(() => import('./pages/CustomerCreatePage'));
const CustomerEditPage = React.lazy(() => import('./pages/CustomerEditPage'));
const CustomerDetailPage = React.lazy(() => import('./pages/CustomerDetailPage'));
const CompanyListPage = React.lazy(() => import('./pages/CompanyListPage'));
const CompanyCreatePage = React.lazy(() => import('./pages/CompanyCreatePage'));
const PermissionManagementPage = React.lazy(() => import('./pages/PermissionManagementPage'));

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

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <ErrorBoundary>
        <Router 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <div className="App">
          <Suspense fallback={<PageLoading />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

         
            
            {/* Private routes */}
            <Route path="/" element={
              <PrivateRoute>
                <Layout>
                  <OptimizedDashboardPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/dashboard-optimized" element={
              <PrivateRoute>
                <Layout>
                  <OptimizedDashboardPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/project-dashboard" element={
              <PrivateRoute>
                <Layout>
                  <ProjectDashboardPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/projects" element={
              <PrivateRoute>
                <Layout>
                  <ProjectsPage />
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
            
            {/* 任务列表页面 - 统一使用TasksPage */}
            <Route path="/task-list" element={
              <PrivateRoute>
                <Layout>
                  <TasksPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/tasks" element={
              <PrivateRoute>
                <Layout>
                  <TasksPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/tasks/all-fields" element={
              <PrivateRoute>
                <Layout>
                  <AllFieldsTaskListPage />
                </Layout>
              </PrivateRoute>
            } />
            
            {/* 项目任务列表 - 统一使用TasksPage */}
            <Route path="/projects/:projectId/task-list" element={
              <PrivateRoute>
                <Layout>
                  <TasksPage />
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
            
            <Route path="/task-dashboard" element={
              <PrivateRoute>
                <Layout>
                  <TaskDashboardPage />
                </Layout>
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
                <Layout>
                  <AuditLogPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/user-profile" element={
              <PrivateRoute>
                <Layout>
                  <UserProfilePage />
                </Layout>
              </PrivateRoute>
            } />
            
            {/* Legacy customer management routes */}
            <Route path="/customers" element={
              <PrivateRoute>
                <Layout>
                  <CustomerListPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/customers/create" element={
              <PrivateRoute>
                <Layout>
                  <CustomerCreatePage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/customers/:customerId/edit" element={
              <PrivateRoute>
                <Layout>
                  <CustomerEditPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/customers/:customerId" element={
              <PrivateRoute>
                <Layout>
                  <CustomerDetailPage />
                </Layout>
              </PrivateRoute>
            } />

            {/* New enterprise customer management routes */}
            <Route path="/companies" element={
              <PrivateRoute>
                <Layout>
                  <CompanyListPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/companies/create" element={
              <PrivateRoute>
                <Layout>
                  <CompanyCreatePage />
                </Layout>
              </PrivateRoute>
            } />

            {/* Permission management routes */}
            <Route path="/permissions" element={
              <PrivateRoute>
                <Layout>
                  <PermissionManagementPage />
                </Layout>
              </PrivateRoute>
            } />
          </Routes>
          </Suspense>
          </div>
        </Router>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;