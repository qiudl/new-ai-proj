import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import TaskBoardPage from './pages/TaskBoardPage';
import TaskListPage from './pages/TaskListPage';
import TaskDetailPage from './pages/TaskDetailPage';
import BulkImportPage from './pages/BulkImportPage';
import RecycleBinPage from './pages/RecycleBinPage';
import AuditLogPage from './pages/AuditLogPage';

// Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <div className="App">
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
            
            <Route path="/task-list" element={
              <PrivateRoute>
                <Layout>
                  <TaskListPage />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/projects/:projectId/task-list" element={
              <PrivateRoute>
                <Layout>
                  <TaskListPage />
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
                  <TaskDetailPage />
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
          </Routes>
        </div>
      </Router>
    </ConfigProvider>
  );
}

export default App;