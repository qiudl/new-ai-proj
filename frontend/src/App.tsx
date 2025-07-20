import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';
import './styles/task-hierarchy.css';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OptimizedDashboardPage from './pages/OptimizedDashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import TasksPage from './pages/TasksPage';
import TaskBoardPage from './pages/TaskBoardPage';
import TaskDetailPageNew from './pages/TaskDetailPageNew';
import TaskDashboardPage from './pages/TaskDashboardPage';
import BulkImportPage from './pages/BulkImportPage';
import RecycleBinPage from './pages/RecycleBinPage';
import AuditLogPage from './pages/AuditLogPage';
import UserProfilePage from './pages/UserProfilePage';

// Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

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
            
            <Route path="/task-board" element={
              <PrivateRoute>
                <Layout>
                  <TaskBoardPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/projects/:projectId/task-board" element={
              <PrivateRoute>
                <Layout>
                  <TaskBoardPage />
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
          </Routes>
          </div>
        </Router>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;