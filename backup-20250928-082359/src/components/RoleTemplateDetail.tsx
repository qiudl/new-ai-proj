import React, { useState, useEffect } from 'react';
import {
  Descriptions,
  Tag,
  Space,
  Button,
  Tabs,
  Table,
  Card,
  List,
  Badge,
  Typography,
  Spin,
  Row,
  Col,
  Statistic,
  Timeline,
  Tooltip,
  message
} from 'antd';
import {
  EditOutlined,
  CopyOutlined,
  SettingOutlined,
  TeamOutlined,
  HistoryOutlined,
  BranchesOutlined,
  TagOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import {
  RoleTemplate,
  RoleTemplatePermission,
  RoleTemplateUsage,
  RoleTemplateVersion,
  TemplateCategory
} from '../types/roleTemplate';
import roleTemplateService from '../services/roleTemplateService';
import { formatDate } from '../utils/dateUtils';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface RoleTemplateDetailProps {
  template: RoleTemplate;
  onEdit?: () => void;
  onClone?: () => void;
}

const RoleTemplateDetail: React.FC<RoleTemplateDetailProps> = ({
  template,
  onEdit,
  onClone
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<RoleTemplatePermission[]>([]);
  const [usageHistory, setUsageHistory] = useState<RoleTemplateUsage[]>([]);
  const [versions, setVersions] = useState<RoleTemplateVersion[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  // 加载详细数据
  useEffect(() => {
    if (activeTab === 'permissions') {
      loadPermissions();
    } else if (activeTab === 'usage') {
      loadUsageHistory();
    } else if (activeTab === 'versions') {
      loadVersions();
    }
  }, [activeTab, template.id]);

  // 加载权限数据
  const loadPermissions = async () => {
    setLoading(true);
    try {
      const response = await roleTemplateService.getTemplatePermissions(template.id);
      if (response.success && response.data) {
        setPermissions(response.data.permissions);
      }
    } catch (error: any) {
      message.error('加载权限数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载使用历史
  const loadUsageHistory = async () => {
    setLoading(true);
    try {
      const response = await roleTemplateService.getTemplateUsageHistory(template.id);
      if (response.success && response.data) {
        setUsageHistory(response.data.usage_history || []);
      }
    } catch (error: any) {
      message.error('加载使用历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载版本历史
  const loadVersions = async () => {
    setLoading(true);
    try {
      const response = await roleTemplateService.getTemplateVersions(template.id);
      if (response.success && response.data) {
        setVersions(response.data.versions || []);
      }
    } catch (error: any) {
      message.error('加载版本历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取分类标签颜色
  const getCategoryTagColor = (category: TemplateCategory) => {
    switch (category) {
      case 'system': return 'red';
      case 'business': return 'blue';
      case 'custom': return 'green';
      default: return 'default';
    }
  };

  // 获取级别标签
  const getLevelTag = (level: number) => {
    const levelMap: Record<number, { text: string; color: string }> = {
      1: { text: 'L1-高级', color: 'red' },
      2: { text: 'L2-中级', color: 'orange' },
      3: { text: 'L3-基础', color: 'blue' },
      4: { text: 'L4-受限', color: 'gray' }
    };
    return levelMap[level] || { text: `L${level}`, color: 'default' };
  };

  // 权限表格列定义
  const permissionColumns: ColumnsType<RoleTemplatePermission> = [
    {
      title: '权限代码',
      dataIndex: ['permission', 'permission_code'],
      key: 'permission_code',
      width: 200
    },
    {
      title: '权限名称',
      dataIndex: ['permission', 'permission_name'],
      key: 'permission_name',
      width: 200
    },
    {
      title: '权限描述',
      dataIndex: ['permission', 'description'],
      key: 'description'
    },
    {
      title: '是否必需',
      dataIndex: 'is_required',
      key: 'is_required',
      width: 100,
      render: (required: boolean) => (
        <Badge status={required ? 'error' : 'default'} />
      )
    },
    {
      title: '默认启用',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 100,
      render: (defaultEnabled: boolean) => (
        <Badge status={defaultEnabled ? 'success' : 'default'} />
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: true
    }
  ];

  // 使用历史表格列定义
  const usageColumns: ColumnsType<RoleTemplateUsage> = [
    {
      title: '角色名称',
      dataIndex: ['role', 'role_name'],
      key: 'role_name'
    },
    {
      title: '使用类型',
      dataIndex: 'usage_type',
      key: 'usage_type',
      render: (type: string) => {
        const typeMap = {
          created: { text: '创建', color: 'blue' },
          updated: { text: '更新', color: 'orange' },
          applied: { text: '应用', color: 'green' }
        };
        const typeInfo = typeMap[type as keyof typeof typeMap] || { text: type, color: 'default' };
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      }
    },
    {
      title: '操作人',
      dataIndex: ['applied_by_user', 'name'],
      key: 'applied_by',
      render: (name: string, record) => (
        name || record.applied_by_user?.username || '系统'
      )
    },
    {
      title: '应用时间',
      dataIndex: 'applied_at',
      key: 'applied_at',
      render: (date: string) => formatDate(date)
    },
    {
      title: '当前使用',
      dataIndex: 'is_current_template',
      key: 'is_current_template',
      render: (current: boolean) => (
        current ? <Badge status="success" text="是" /> : <Badge status="default" text="否" />
      )
    }
  ];

  // 版本历史表格列定义
  const versionColumns: ColumnsType<RoleTemplateVersion> = [
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (version: number) => <Tag color="blue">v{version}</Tag>
    },
    {
      title: '版本名称',
      dataIndex: 'template_name',
      key: 'template_name'
    },
    {
      title: '变更日志',
      dataIndex: 'change_log',
      key: 'change_log',
      ellipsis: true,
      render: (log: string) => (
        <Tooltip title={log}>
          <Text ellipsis>{log}</Text>
        </Tooltip>
      )
    },
    {
      title: '创建人',
      dataIndex: ['created_by_user', 'name'],
      key: 'created_by',
      render: (name: string, record) => (
        name || record.created_by_user?.username || '系统'
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDate(date)
    }
  ];

  // 渲染基本信息
  const renderBasicInfo = () => (
    <Row gutter={16}>
      <Col span={16}>
        <Descriptions title="模板信息" bordered column={2}>
          <Descriptions.Item label="模板代码">
            <Text code>{template.template_code}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="模板名称">
            {template.template_name}
          </Descriptions.Item>
          <Descriptions.Item label="模板分类">
            <Tag color={getCategoryTagColor(template.category)}>
              {template.category === 'system' ? '系统' : template.category === 'business' ? '业务' : '自定义'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="模板级别">
            {(() => {
              const levelInfo = getLevelTag(template.level);
              return <Tag color={levelInfo.color}>{levelInfo.text}</Tag>;
            })()}
          </Descriptions.Item>
          <Descriptions.Item label="适用行业">
            {template.industry || '通用'}
          </Descriptions.Item>
          <Descriptions.Item label="适用部门">
            {template.department || '通用'}
          </Descriptions.Item>
          <Descriptions.Item label="模板状态">
            <Space>
              <Badge status={template.is_active ? 'success' : 'default'} />
              <span>{template.is_active ? '激活' : '停用'}</span>
              {template.is_system_template && <Tag  color="blue">系统</Tag>}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="当前版本">
            <Tag color="blue">v{template.version}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {formatDate(template.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间" span={2}>
            {formatDate(template.updated_at)}
          </Descriptions.Item>
          <Descriptions.Item label="模板描述" span={2}>
            {template.template_description || '无描述'}
          </Descriptions.Item>
        </Descriptions>

        {/* 标签展示 */}
        {template.tags && template.tags.length > 0 && (
          <Card title={<><TagOutlined /> 模板标签</>} style={{ marginTop: 16 }} >
            <Space wrap>
              {template.tags.map(tag => (
                <Tag key={tag.id} color="geekblue">
                  {tag.tag_name}
                </Tag>
              ))}
            </Space>
          </Card>
        )}

        {/* 配置信息 */}
        {template.configuration && Object.keys(template.configuration).length > 0 && (
          <Card title={<><SettingOutlined /> 配置信息</>} style={{ marginTop: 16 }} >
            <Descriptions column={1} >
              {Object.entries(template.configuration).map(([key, value]) => (
                <Descriptions.Item label={key} key={key}>
                  <Text code>{String(value)}</Text>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        )}

        {/* 元数据信息 */}
        {template.metadata && Object.keys(template.metadata).length > 0 && (
          <Card title="元数据信息" style={{ marginTop: 16 }} >
            <Descriptions column={1} >
              {Object.entries(template.metadata).map(([key, value]) => (
                <Descriptions.Item label={key} key={key}>
                  <Text>{String(value)}</Text>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        )}
      </Col>

      <Col span={8}>
        {/* 统计信息 */}
        <Card title="统计信息" >
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title="使用次数" value={template.usage_count || 0} />
            </Col>
            <Col span={12}>
              <Statistic title="权限数量" value={permissions.length} />
            </Col>
          </Row>
        </Card>

        {/* 继承关系 */}
        {template.parent_template && (
          <Card title={<><BranchesOutlined /> 继承关系</>} style={{ marginTop: 16 }} >
            <List >
              <List.Item>
                <Text>父模板: </Text>
                <Tag>{template.parent_template.template_name}</Tag>
              </List.Item>
            </List>
          </Card>
        )}

        {/* 子模板 */}
        {template.child_templates && template.child_templates.length > 0 && (
          <Card title="子模板" style={{ marginTop: 16 }} >
            <List
              
              dataSource={template.child_templates}
              renderItem={child => (
                <List.Item>
                  <Tag>{child.template_name}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Col>
    </Row>
  );

  return (
    <div>
      {/* 操作按钮 */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Space>
          {onEdit && (
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={onEdit}
              disabled={template.is_system_template}
            >
              编辑模板
            </Button>
          )}
          {onClone && (
            <Button icon={<CopyOutlined />} onClick={onClone}>
              克隆模板
            </Button>
          )}
        </Space>
      </div>

      {/* 标签页 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="基本信息" key="basic" icon={<SettingOutlined />}>
          {renderBasicInfo()}
        </TabPane>

        <TabPane tab="权限配置" key="permissions" icon={<TeamOutlined />}>
          <Spin spinning={loading}>
            <Table
              dataSource={permissions}
              columns={permissionColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              
            />
          </Spin>
        </TabPane>

        <TabPane tab="使用历史" key="usage" icon={<HistoryOutlined />}>
          <Spin spinning={loading}>
            <Table
              dataSource={usageHistory}
              columns={usageColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              
            />
          </Spin>
        </TabPane>

        <TabPane tab="版本历史" key="versions" icon={<BranchesOutlined />}>
          <Spin spinning={loading}>
            <Table
              dataSource={versions}
              columns={versionColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              
            />
          </Spin>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default RoleTemplateDetail;