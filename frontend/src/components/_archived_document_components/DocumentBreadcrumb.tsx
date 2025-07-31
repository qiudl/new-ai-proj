/**
 * 文档面包屑导航组件
 * 提供智能的面包屑导航，根据文档上下文动态生成正确的导航链接
 */

import React from 'react';
import { Breadcrumb } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  FileTextOutlined,
  ProjectOutlined,
  UserOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  FolderOutlined
} from '@ant-design/icons';
import type { Document } from '../types/document';

interface DocumentBreadcrumbProps {
  document?: Document;
  mode?: 'view' | 'edit' | 'new';
  projectId?: number;
  customerId?: number;
  folderId?: number;
  projectName?: string;
  customerName?: string;
  folderName?: string;
  customItems?: Array<{
    title: string | React.ReactNode;
    href?: string;
  }>;
}

const DocumentBreadcrumb: React.FC<DocumentBreadcrumbProps> = ({
  document,
  mode = 'view',
  projectId,
  customerId,
  folderId,
  projectName,
  customerName,
  folderName,
  customItems
}) => {
  const location = useLocation();

  // 构建面包屑项目
  const buildBreadcrumbItems = () => {
    const items: any[] = [];

    // 首页
    items.push({
      title: (
        <Link to="/dashboard">
          <HomeOutlined />
          <span style={{ marginLeft: 4 }}>首页</span>
        </Link>
      )
    });

    // 根据文档或参数确定上下文
    const contextProjectId = document?.project_id || projectId;
    const contextCustomerId = document?.customer_id || customerId;
    const contextProjectName = document?.project_name || projectName;
    const contextCustomerName = document?.customer_name || customerName;

    // 项目上下文
    if (contextProjectId) {
      items.push({
        title: (
          <Link to="/projects">
            <ProjectOutlined />
            <span style={{ marginLeft: 4 }}>项目管理</span>
          </Link>
        )
      });

      if (contextProjectName) {
        items.push({
          title: (
            <Link to={`/projects/${contextProjectId}`}>
              <span>{contextProjectName}</span>
            </Link>
          )
        });
      }

      // 项目文档列表
      items.push({
        title: (
          <Link to={`/projects/${contextProjectId}/documents`}>
            <FileTextOutlined />
            <span style={{ marginLeft: 4 }}>文档管理</span>
          </Link>
        )
      });
    }
    // 客户上下文
    else if (contextCustomerId) {
      items.push({
        title: (
          <Link to="/customers">
            <UserOutlined />
            <span style={{ marginLeft: 4 }}>客户管理</span>
          </Link>
        )
      });

      if (contextCustomerName) {
        items.push({
          title: (
            <Link to={`/customers/${contextCustomerId}`}>
              <span>{contextCustomerName}</span>
            </Link>
          )
        });
      }

      // 客户文档列表
      items.push({
        title: (
          <Link to={`/customers/${contextCustomerId}/documents`}>
            <FileTextOutlined />
            <span style={{ marginLeft: 4 }}>文档管理</span>
          </Link>
        )
      });
    }
    // 文件夹上下文
    else if (folderId) {
      items.push({
        title: (
          <Link to="/documents">
            <FileTextOutlined />
            <span style={{ marginLeft: 4 }}>文档管理</span>
          </Link>
        )
      });

      if (folderName) {
        items.push({
          title: (
            <Link to={`/documents/folders/${folderId}`}>
              <FolderOutlined />
              <span style={{ marginLeft: 4 }}>{folderName}</span>
            </Link>
          )
        });
      }
    }
    // 默认文档管理
    else {
      // 检查是否从特定页面路由过来
      if (location.pathname.includes('/projects/')) {
        items.push({
          title: (
            <Link to="/projects">
              <ProjectOutlined />
              <span style={{ marginLeft: 4 }}>项目管理</span>
            </Link>
          )
        });
      } else if (location.pathname.includes('/customers/')) {
        items.push({
          title: (
            <Link to="/customers">
              <UserOutlined />
              <span style={{ marginLeft: 4 }}>客户管理</span>
            </Link>
          )
        });
      }

      items.push({
        title: (
          <Link to="/documents">
            <FileTextOutlined />
            <span style={{ marginLeft: 4 }}>文档管理</span>
          </Link>
        )
      });
    }

    // 添加自定义项目
    if (customItems) {
      customItems.forEach(item => {
        items.push({
          title: item.href ? (
            <Link to={item.href}>{item.title}</Link>
          ) : item.title
        });
      });
    }

    // 最终页面项目
    if (document || mode) {
      if (mode === 'new') {
        items.push({
          title: (
            <span>
              <PlusOutlined style={{ marginRight: 4 }} />
              新建文档
            </span>
          )
        });
      } else if (document) {
        const documentTitle = document.title || `文档 #${document.id}`;
        
        if (mode === 'edit') {
          // 编辑模式：先显示文档链接，再显示编辑状态
          items.push({
            title: (
              <Link to={`/documents/${document.id}`}>
                {documentTitle}
              </Link>
            )
          });
          items.push({
            title: (
              <span>
                <EditOutlined style={{ marginRight: 4 }} />
                编辑文档
              </span>
            )
          });
        } else {
          // 查看模式：直接显示文档标题
          items.push({
            title: (
              <span>
                <EyeOutlined style={{ marginRight: 4 }} />
                {documentTitle}
              </span>
            )
          });
        }
      }
    }

    return items;
  };

  return (
    <Breadcrumb
      items={buildBreadcrumbItems()}
      style={{ marginBottom: 16 }}
    />
  );
};

export default DocumentBreadcrumb;