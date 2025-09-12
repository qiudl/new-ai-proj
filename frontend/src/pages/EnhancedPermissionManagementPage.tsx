import React, { useState, useEffect } from 'react';
import { Card, Tabs, Spin, message, Breadcrumb } from 'antd';
import { useNavigate } from 'react-router-dom';
import { SettingOutlined, UserOutlined, SecurityScanOutlined, BarChartOutlined } from '@ant-design/icons';
import EnhancedPermissionManager from '../components/EnhancedPermissionManager';
import enhancedPermissionService from '../services/enhancedPermissionService';
import type { RoleTemplate, PermissionTemplate } from '../services/enhancedPermissionService';

const { TabPane } = Tabs;

const EnhancedPermissionManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [permissionTemplates, setPermissionTemplates] = useState<PermissionTemplate[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [roleTemplatesData, permissionTemplatesData] = await Promise.all([
        enhancedPermissionService.getRoleTemplates().catch(() => []),
        enhancedPermissionService.getPermissionTemplates().catch(() => []),
      ]);
      
      setRoleTemplates(Array.isArray(roleTemplatesData) ? roleTemplatesData : []);
      setPermissionTemplates(Array.isArray(permissionTemplatesData) ? permissionTemplatesData : []);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      message.error('加载数据失败');
      // 兜底
      setRoleTemplates([]);
      setPermissionTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = () => {
    loadInitialData();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" tip="加载权限管理数据..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '16px' }}>
        <Breadcrumb>
          <Breadcrumb.Item>
            <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              首页
            </span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <span onClick={() => navigate('/admin/permissions')} style={{ cursor: 'pointer' }}>
              系统管理
            </span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>增强权限管理</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SecurityScanOutlined />
            <span>增强权限管理</span>
          </div>
        }
        bordered={false}
        style={{ background: '#fff' }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
        >
          <TabPane
            tab={
              <span>
                <SettingOutlined />
                权限管理
              </span>
            }
            key="overview"
          >
            {React.createElement(EnhancedPermissionManager as any, {
              onRefresh: handleRefreshData,
              roleTemplates: roleTemplates,
              permissionTemplates: permissionTemplates
            })}
          </TabPane>

          <TabPane
            tab={
              <span>
                <UserOutlined />
                角色模板
              </span>
            }
            key="templates"
          >
            <div style={{ padding: '16px' }}>
              <h3>内置角色模板</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {(roleTemplates || []).map(template => (
                  <Card
                    key={template?.id}
                    
                    title={template?.name || '模板'}
                    extra={
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        background: enhancedPermissionService.getCategoryColor(template.category) === 'blue' ? '#e6f7ff' : 
                                  enhancedPermissionService.getCategoryColor(template.category) === 'green' ? '#f6ffed' :
                                  enhancedPermissionService.getCategoryColor(template.category) === 'purple' ? '#f9f0ff' :
                                  enhancedPermissionService.getCategoryColor(template.category) === 'orange' ? '#fff7e6' : '#f5f5f5',
                        color: enhancedPermissionService.getCategoryColor(template.category) === 'blue' ? '#1890ff' :
                              enhancedPermissionService.getCategoryColor(template.category) === 'green' ? '#52c41a' :
                              enhancedPermissionService.getCategoryColor(template.category) === 'purple' ? '#722ed1' :
                              enhancedPermissionService.getCategoryColor(template.category) === 'orange' ? '#fa8c16' : '#8c8c8c',
                        fontSize: '12px'
                      }}>
                        {enhancedPermissionService.getCategoryText(template.category)}
                      </span>
                    }
                  >
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                      {template.description}
                    </p>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      <div>默认权限: {template.default_permissions.length} 项</div>
                      <div>推荐用于: {template.recommended_for.join('、')}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabPane>

          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                权限分析
              </span>
            }
            key="analytics"
          >
            <div style={{ padding: '16px' }}>
              <h3>权限使用分析</h3>
              <div style={{ marginTop: '16px', color: '#666' }}>
                <p>🔍 实时监控权限使用情况</p>
                <p>📊 分析用户权限使用模式</p>
                <p>🎯 智能推荐权限优化方案</p>
                <p>🛡️ 检测权限冲突和安全风险</p>
                <div style={{ marginTop: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
                  <strong>功能特性：</strong>
                  <ul style={{ marginTop: '8px', marginBottom: '0' }}>
                    <li>动态权限分析：基于实际使用情况分析权限配置</li>
                    <li>智能优化建议：AI驱动的权限优化建议</li>
                    <li>安全风险评估：识别潜在的权限安全风险</li>
                    <li>使用趋势分析：追踪权限使用趋势和变化</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default EnhancedPermissionManagementPage;