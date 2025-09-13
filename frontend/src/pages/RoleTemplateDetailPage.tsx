import React, { useEffect, useMemo, useState } from 'react';
import { 
  Card, 
  Typography, 
  Descriptions, 
  Space, 
  Tag, 
  Button, 
  Table, 
  Modal, 
  Select, 
  InputNumber, 
  message, 
  Tabs,
  List,
  Breadcrumb,
  Row,
  Col,
  Statistic,
  Tooltip,
  Divider,
  Badge,
  Input
} from 'antd';
import { 
  HomeOutlined, 
  SettingOutlined, 
  TeamOutlined, 
  EditOutlined, 
  CopyOutlined, 
  HistoryOutlined,
  UserOutlined,
  KeyOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import roleTemplateService from '../services/roleTemplateService';
import permissionService from '../services/permissionService';

const { Title, Text } = Typography;

interface RoleTemplateDetail {
  id: number;
  template_code: string;
  template_name: string;
  template_description?: string;
  category: 'system' | 'business' | 'custom';
  is_system_template: boolean;
  is_active: boolean;
  version: number;
  industry?: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

interface TemplatePermission {
  id: number;
  permission_id: number;
  is_required: boolean;
  is_default: boolean;
  priority: number;
  permission?: {
    id: number;
    permission_code: string;
    permission_name: string;
    description?: string;
  };
}

const RoleTemplateDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const templateId = Number(id);

  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<RoleTemplateDetail | null>(null);
  const [permissions, setPermissions] = useState<TemplatePermission[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [applyVisible, setApplyVisible] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [overrideMode, setOverrideMode] = useState<'replace' | 'merge' | 'append'>('replace');
  const [permissionDiff, setPermissionDiff] = useState<any>(null);

  const loadDetail = async () => {
    try {
      setLoading(true);
      
      // 并行加载模板详情和权限信息
      const [templateResponse, permissionResponse, rolesResponse] = await Promise.all([
        roleTemplateService.getRoleTemplateById(templateId),
        roleTemplateService.getTemplatePermissions(templateId),
        permissionService.getRoles().catch(() => ({ roles: [] }))
      ]);
      
      if (templateResponse.success && templateResponse.data) {
        setTemplate(templateResponse.data);
      } else {
        message.error('加载模板详情失败');
        return;
      }
      
      if (permissionResponse.success && permissionResponse.data) {
        setPermissions(permissionResponse.data.permissions || []);
      }
      
      // 加载可用角色列表
      const allRoles = (rolesResponse as any).roles || [];
      setRoles(allRoles);
      
      // 加载使用历史
      try {
        const historyResponse = await roleTemplateService.getTemplateUsageHistory(templateId);
        if (historyResponse.success && historyResponse.data) {
          setUsageHistory(historyResponse.data.usage_history || []);
        }
      } catch (error) {
        // 使用历史加载失败不影响主要功能
        console.warn('Failed to load usage history:', error);
      }
      
    } catch (err: any) {
      console.error('加载模板详情失败', err);
      message.error('加载模板详情失败');
      setTemplate(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isNaN(templateId)) {
      loadDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const columns = [
    {
      title: '权限代码',
      dataIndex: ['permission', 'permission_code'],
      key: 'permission_code',
      render: (_: any, record: TemplatePermission) => (
        <Text code>{record.permission?.permission_code}</Text>
      )
    },
    {
      title: '名称',
      dataIndex: ['permission', 'permission_name'],
      key: 'permission_name',
    },
    {
      title: '必需',
      dataIndex: 'is_required',
      key: 'is_required',
      render: (v: boolean) => v ? <Tag color="red">必需</Tag> : <Tag>可选</Tag>
    },
    {
      title: '默认',
      dataIndex: 'is_default',
      key: 'is_default',
      render: (v: boolean) => v ? <Tag color="blue">默认</Tag> : <Tag>手动</Tag>
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100
    }
  ];

  // 权限差异比较
  const comparePermissions = async (roleId: number) => {
    try {
      // 获取角色当前权限
      const roleResponse = await permissionService.getRolePermissions(roleId);
      const currentPermissions = (roleResponse as any).permissions || [];
      
      // 计算权限差异
      const templatePermissionIds = permissions.map(p => p.permission_id);
      const currentPermissionIds = currentPermissions.map((p: any) => p.id);
      
      const toAdd = templatePermissionIds.filter(id => !currentPermissionIds.includes(id));
      const toRemove = overrideMode === 'replace' ? 
        currentPermissionIds.filter(id => !templatePermissionIds.includes(id)) : [];
      const existing = templatePermissionIds.filter(id => currentPermissionIds.includes(id));
      
      setPermissionDiff({
        toAdd: permissions.filter(p => toAdd.includes(p.permission_id)),
        toRemove: currentPermissions.filter((p: any) => toRemove.includes(p.id)),
        existing: permissions.filter(p => existing.includes(p.permission_id)),
        mode: overrideMode
      });
    } catch (error) {
      console.error('Failed to compare permissions:', error);
      message.error('权限比较失败');
    }
  };

  // 处理角色选择变化
  const handleRoleChange = (roleId: number) => {
    setSelectedRoleId(roleId);
    if (roleId) {
      comparePermissions(roleId);
    } else {
      setPermissionDiff(null);
    }
  };

  // 处理覆盖模式变化
  const handleOverrideModeChange = (mode: 'replace' | 'merge' | 'append') => {
    setOverrideMode(mode);
    if (selectedRoleId) {
      comparePermissions(selectedRoleId);
    }
  };

  const handleApply = async () => {
    if (!selectedRoleId) {
      message.warning('请先选择角色');
      return;
    }
    try {
      setApplyLoading(true);
      const body: any = { role_id: selectedRoleId, override_mode: overrideMode };
      const result = await roleTemplateService.applyTemplateToRole(templateId, body);
      if (result.success) {
        message.success('模板应用成功');
        setApplyVisible(false);
        setSelectedRoleId(null);
        setPermissionDiff(null);
        // 刷新使用历史
        loadDetail();
      } else {
        message.error(result.message || '应用模板失败');
      }
    } catch (err: any) {
      console.error('应用模板失败', err);
      message.error(err.message || '应用模板失败');
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: 16 }}
        items={[
          { title: (<Link to="/"><HomeOutlined /> 首页</Link>) },
          { title: (<Link to="/admin/role-templates"><SettingOutlined /> 角色模板管理</Link>) },
          { title: (<><TeamOutlined /> 模板详情</>) }
        ]}
      />

      {/* 头部操作区 */}
      <Card 
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/admin/role-templates')}
            >
              返回列表
            </Button>
            <Divider type="vertical" />
            <TeamOutlined />
            <span>角色模板详情</span>
          </Space>
        }
        extra={
          template && (
            <Space>
              <Button 
                icon={<EditOutlined />}
                disabled={template.is_system_template}
              >
                编辑模板
              </Button>
              <Button 
                icon={<CopyOutlined />}
              >
                克隆模板
              </Button>
              <Button 
                type="primary" 
                icon={<UserOutlined />}
                onClick={() => setApplyVisible(true)}
              >
                应用到角色
              </Button>
            </Space>
          )
        }
        loading={loading}
      >
        {template && (
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="模板版本" value={template.version} />
            </Col>
            <Col span={6}>
              <Statistic title="权限数量" value={permissions.length} />
            </Col>
            <Col span={6}>
              <Statistic title="使用次数" value={usageHistory.length} />
            </Col>
            <Col span={6}>
              <Statistic 
                title="状态" 
                value={template.is_active ? '激活' : '停用'}
                valueStyle={{ color: template.is_active ? '#3f8600' : '#cf1322' }}
              />
            </Col>
          </Row>
        )}
      </Card>

      {/* 主要内容标签页 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <InfoCircleOutlined />
                  基本信息
                </span>
              ),
              children: template ? (
                <div>
                  <Descriptions bordered column={2} >
                    <Descriptions.Item label="模板名称">{template.template_name}</Descriptions.Item>
                    <Descriptions.Item label="模板代码">
                      <Text code>{template.template_code}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="模板描述" span={2}>
                      {template.template_description || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="分类">
                      <Tag color={template.category === 'system' ? 'red' : template.category === 'business' ? 'blue' : 'green'}>
                        {template.category === 'system' ? '系统模板' : template.category === 'business' ? '业务模板' : '自定义模板'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Space>
                        <Badge status={template.is_active ? 'success' : 'default'} />
                        <span>{template.is_active ? '激活' : '停用'}</span>
                        {template.is_system_template && <Tag  color="blue">系统</Tag>}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="行业">{template.industry || '-'}</Descriptions.Item>
                    <Descriptions.Item label="部门">{template.department || '-'}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{template.created_at}</Descriptions.Item>
                    <Descriptions.Item label="更新时间">{template.updated_at}</Descriptions.Item>
                  </Descriptions>
                </div>
              ) : null
            },
            {
              key: 'permissions',
              label: (
                <span>
                  <KeyOutlined />
                  权限配置 ({permissions.length})
                </span>
              ),
              children: (
                <Table
                  rowKey="id"
                  columns={columns as any}
                  dataSource={permissions}
                  pagination={{ 
                    pageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 项权限`
                  }}
                  
                />
              )
            },
            {
              key: 'usage',
              label: (
                <span>
                  <HistoryOutlined />
                  使用历史 ({usageHistory.length})
                </span>
              ),
              children: (
                <List
                  
                  dataSource={usageHistory}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`应用到角色: ${item.role_name}`}
                        description={`操作时间: ${item.applied_at} | 操作人: ${item.applied_by}`}
                      />
                      <div>
                        <Tag color={item.result === 'success' ? 'success' : 'error'}>
                          {item.result === 'success' ? '成功' : '失败'}
                        </Tag>
                      </div>
                    </List.Item>
                  )}
                  locale={{ emptyText: '暂无使用历史' }}
                />
              )
            }
          ]}
        />
      </Card>

      {/* 增强的应用模板对话框 */}
      <Modal
        title="应用模板到角色"
        open={applyVisible}
        onCancel={() => {
          setApplyVisible(false);
          setSelectedRoleId(null);
          setPermissionDiff(null);
        }}
        onOk={handleApply}
        confirmLoading={applyLoading}
        width={800}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 角色选择 */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
              选择目标角色：
            </label>
            <Select
              placeholder="请选择要应用模板的角色"
              style={{ width: '100%' }}
              value={selectedRoleId}
              onChange={handleRoleChange}
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {roles.map((role: any) => (
                <Select.Option key={role.id} value={role.id}>
                  {role.roleName} ({role.roleCode})
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* 覆盖策略 */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
              应用策略：
            </label>
            <Select 
              value={overrideMode} 
              onChange={handleOverrideModeChange} 
              style={{ width: '100%' }}
            >
              <Select.Option value="replace">
                <Space>
                  <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
                  <span>替换模式</span>
                </Space>
                <div style={{ fontSize: '12px', color: '#666', marginLeft: 20 }}>
                  完全覆盖角色当前权限，以模板权限为准
                </div>
              </Select.Option>
              <Select.Option value="merge">
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span>合并模式</span>
                </Space>
                <div style={{ fontSize: '12px', color: '#666', marginLeft: 20 }}>
                  保留角色现有权限，添加模板中的新权限
                </div>
              </Select.Option>
              <Select.Option value="append">
                <Space>
                  <CheckCircleOutlined style={{ color: '#1890ff' }} />
                  <span>追加模式</span>
                </Space>
                <div style={{ fontSize: '12px', color: '#666', marginLeft: 20 }}>
                  仅添加模板权限，不删除任何现有权限
                </div>
              </Select.Option>
            </Select>
          </div>

          {/* 权限差异预览 */}
          {permissionDiff && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                权限变更预览：
              </label>
              <Card >
                <Tabs  items={[
                  ...(permissionDiff.toAdd.length > 0 ? [{
                    key: 'add',
                    label: `新增权限 (${permissionDiff.toAdd.length})`,
                    children: (
                      <List
                        
                        dataSource={permissionDiff.toAdd}
                        renderItem={(item: any) => (
                          <List.Item>
                            <Space>
                              <Tag color="green" icon={<CheckCircleOutlined />}>新增</Tag>
                              <Text code>{item.permission?.permission_code}</Text>
                              <span>{item.permission?.permission_name}</span>
                            </Space>
                          </List.Item>
                        )}
                      />
                    )
                  }] : []),
                  ...(permissionDiff.toRemove.length > 0 ? [{
                    key: 'remove',
                    label: `删除权限 (${permissionDiff.toRemove.length})`,
                    children: (
                      <List
                        
                        dataSource={permissionDiff.toRemove}
                        renderItem={(item: any) => (
                          <List.Item>
                            <Space>
                              <Tag color="red" icon={<ExclamationCircleOutlined />}>删除</Tag>
                              <Text code>{item.permission_code}</Text>
                              <span>{item.permission_name}</span>
                            </Space>
                          </List.Item>
                        )}
                      />
                    )
                  }] : []),
                  ...(permissionDiff.existing.length > 0 ? [{
                    key: 'keep',
                    label: `保持不变 (${permissionDiff.existing.length})`,
                    children: (
                      <List
                        
                        dataSource={permissionDiff.existing}
                        renderItem={(item: any) => (
                          <List.Item>
                            <Space>
                              <Tag color="default">保持</Tag>
                              <Text code>{item.permission?.permission_code}</Text>
                              <span>{item.permission?.permission_name}</span>
                            </Space>
                          </List.Item>
                        )}
                      />
                    )
                  }] : [])
                ]} />
              </Card>
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default RoleTemplateDetailPage;

