import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ErrorBoundary from './components/ErrorBoundary';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import { TimerProvider } from './contexts/TimerContext';
import FloatingTimer from './components/FloatingTimer';
import './App.css';
import './styles/task-hierarchy.css';

// Lazy load pages for code splitting
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage'));
const TasksPage = React.lazy(() => import('./pages/TasksPage'));
const TaskDetailPageNew = React.lazy(() => import('./pages/TaskDetailPageNew'));
const TaskEditPage = React.lazy(() => import('./pages/TaskEditPage'));
const AllFieldsTaskListPage = React.lazy(() => import('./pages/AllFieldsTaskListPage'));
const TaskDashboardPage = React.lazy(() => import('./pages/TaskDashboardPage'));
const BulkImportPage = React.lazy(() => import('./pages/BulkImportPage'));
const RecycleBinPage = React.lazy(() => import('./pages/RecycleBinPage'));
const AuditLogPage = React.lazy(() => import('./pages/AuditLogPage'));
const UserProfilePage = React.lazy(() => import('./pages/UserProfilePage'));
const CompanyListPage = React.lazy(() => import('./pages/CompanyListPage'));
const CompanyDetailPage = React.lazy(() => import('./pages/CompanyDetailPage'));
const CompanyCreatePage = React.lazy(() => import('./pages/CompanyCreatePage'));
const CompanyEditPage = React.lazy(() => import('./pages/CompanyEditPage'));
const PermissionManagementPage = React.lazy(() => import('./pages/PermissionManagementPage'));
const UserManagementPage = React.lazy(() => import('./pages/UserManagementPage'));
const AIConfigPage = React.lazy(() => import('./pages/AIConfigPage'));
const ProjectDetailPage = React.lazy(() => import('./pages/ProjectDetailPage'));
const ProjectEditPage = React.lazy(() => import('./pages/ProjectEditPageStandard'));
const DocumentListPage = React.lazy(() => import('./pages/DocumentListPage'));
const DocumentManagerPage = React.lazy(() => import('./pages/DocumentManagerPage'));
const DocumentEditorPage = React.lazy(() => import('./pages/DocumentEditorPage'));

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
        <TimerProvider>
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
                  <DashboardPage />
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
            
            
            <Route path="/projects" element={
              <PrivateRoute>
                <Layout>
                  <ProjectsPage />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/projects/:projectId" element={
              <PrivateRoute>
                <Layout>
                  <ProjectDetailPage />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/projects/:projectId/edit" element={
              <PrivateRoute>
                <Layout>
                  <ProjectEditPage />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/projects/create" element={
              <PrivateRoute>
                <Layout>
                  <ProjectEditPage />
                </Layout>
              </PrivateRoute>
            } />

            {/* Document management routes */}
            <Route path="/projects/:projectId/documents" element={
              <PrivateRoute>
                <Layout>
                  <DocumentListPage />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/projects/:projectId/documents/new" element={
              <PrivateRoute>
                <Layout>
                  <DocumentEditorPage />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/documents/new" element={
              <PrivateRoute>
                <Layout>
                  <DocumentEditorPage />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/documents/:id/edit" element={
              <PrivateRoute>
                <Layout>
                  <DocumentEditorPage />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/documents/:id" element={
              <PrivateRoute>
                <Layout>
                  <DocumentEditorPage />
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
            
            {/* Enterprise customer management routes */}
            <Route path="/companies" element={
              <PrivateRoute>
                <Layout>
                  <CompanyListPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/companies/:id" element={
              <PrivateRoute>
                <Layout>
                  <CompanyDetailPage />
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
            
            <Route path="/companies/:id/edit" element={
              <PrivateRoute>
                <Layout>
                  <CompanyEditPage />
                </Layout>
              </PrivateRoute>
            } />

            {/* Global document management routes */}
            <Route path="/documents" element={
              <PrivateRoute>
                <Layout>
                  <DocumentListPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/document-manager" element={
              <PrivateRoute>
                <Layout>
                  <DocumentManagerPage />
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

            {/* User management routes */}
            <Route path="/user-management" element={
              <PrivateRoute>
                <Layout>
                  <UserManagementPage />
                </Layout>
              </PrivateRoute>
            } />

            {/* AI configuration routes */}
            <Route path="/ai-config" element={
              <PrivateRoute>
                <Layout>
                  <AIConfigPage />
                </Layout>
              </PrivateRoute>
            } />


          </Routes>
          </Suspense>
          
          {/* Global Floating Timer - only shows when timer is running */}
          <FloatingTimer />
          
          </div>
        </Router>
        </TimerProvider>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;