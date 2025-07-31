// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Card,
  Radio,
  Select,
  Space,
  Typography,
  Alert,
  Spin,
  Row,
  Col,
  Tag,
  Empty,
  Button} from 'antd';
import {
  ProjectOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined} from '@ant-design/icons';
import {
  DocumentAssociation,
  DocumentAssociationType,
  ProjectOption,
  CustomerOption} from '../types/document';
import { projectService } from '../services/projectService';
import companyService from '../services/companyService';

const { Title, Text } = Typography;

interface DocumentAssociationSelectorProps {
  value?: DocumentAssociation;
  onChange?: (association: DocumentAssociation) => void;
  disabled?: boolean;
  showDescription?: boolean;
  mode?: 'card' | 'inline'; // 显示模式
}

const DocumentAssociationSelector: React.FC<DocumentAssociationSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showDescription = true,
  mode = 'card'}) => {
  // 状态管理
  const defaultAssociationType: DocumentAssociationType = {
    key: 'personal',
    label: '个人文档',
    description: '个人私有文档，只有您自己可以访问和编辑'
  };
  
  const [associationType, setAssociationType] = useState<DocumentAssociationType>(
    value?.type || defaultAssociationType
  );
  const [selectedId, setSelectedId] = useState<number | undefined>(value?.id);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);

  // 关联类型配置
  const associationTypeConfig = {
    project: {
      label: '项目文档',
      icon: <ProjectOutlined style={{ color: '#1890ff' }} />,
      description: '文档将关联到特定项目，项目成员可以访问',
      color: '#1890ff'},
    customer: {
      label: '客户文档',
      icon: <TeamOutlined style={{ color: '#52c41a' }} />,
      description: '文档将关联到特定客户，客户公司成员可以访问',
      color: '#52c41a'},
    personal: {
      label: '个人文档',
      icon: <UserOutlined style={{ color: '#faad14' }} />,
      description: '个人私有文档，只有您自己可以访问和编辑',
      color: '#faad14'}};

  // 加载项目列表
  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const projectResponse = await projectService.getProjects();
      const projectList = Array.isArray(projectResponse) ? projectResponse : projectResponse.data || [];
      const projectOptions: ProjectOption[] = projectList.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        can_create_documents: true, // 假设所有项目都允许创建文档
      }));
      setProjects(projectOptions);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  // 加载客户列表
  const loadCustomers = async () => {
    setCustomersLoading(true);
    try {
      const customerResponse = await companyService.getCompanies();
      const customerList = Array.isArray(customerResponse) ? customerResponse : customerResponse.data || [];
      const customerOptions: CustomerOption[] = customerList.map((company: any) => ({
        id: company.id,
        name: company.company_name || company.name || 'Unknown Customer',
        company_name: company.company_name,
        industry: company.industry}));
      setCustomers(customerOptions);
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  // 处理关联类型变化
  const handleTypeChange = (type: DocumentAssociationType) => {
    setAssociationType(type);
    setSelectedId(undefined);
    
    const newAssociation: DocumentAssociation = {
      id: 0,
      document_id: 0,
      entity_type: type.key as 'project' | 'customer' | 'task',
      entity_id: 0,
      entity_name: '',
      association_type: type.key,
      type,
      created_at: new Date().toISOString(),
      created_by: 1
    };
    
    onChange?.(newAssociation);

    // 根据类型加载相应的选项
    if (type.key === 'project' && projects.length === 0) {
      loadProjects();
    } else if (type.key === 'customer' && customers.length === 0) {
      loadCustomers();
    }
  };

  // 处理关联对象选择
  const handleSelectionChange = (id: number) => {
    setSelectedId(id);
    
    let name: string | undefined;
    
    if (associationType.key === 'project') {
      const project = projects.find(p => p.id === id);
      name = project?.name;
    } else if (associationType.key === 'customer') {
      const customer = customers.find(c => c.id === id);
      name = customer?.company_name;
    }
    
    const newAssociation: DocumentAssociation = {
      id: 0,
      document_id: 0,
      entity_type: associationType.key as 'project' | 'customer' | 'task',
      entity_id: id,
      entity_name: name || '',
      association_type: associationType.key,
      type: associationType,
      created_at: new Date().toISOString(),
      created_by: 1
    };
    
    onChange?.(newAssociation);
  };

  // 组件加载时初始化
  useEffect(() => {
    if (value) {
      setAssociationType(value.type);
      setSelectedId(value.id);
      
      // 预加载选项
      if (value.type.key === 'project' && projects.length === 0) {
        loadProjects();
      } else if (value.type.key === 'customer' && customers.length === 0) {
        loadCustomers();
      }
    }
  }, [value]);

  // 渲染关联类型选择
  const renderTypeSelector = () => (
    <div style={{ marginBottom: mode === 'card' ? 24 : 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Text strong>选择文档关联类型</Text>
      </div>
      <Radio.Group
        value={associationType}
        onChange={(e) => handleTypeChange(e.target.value)}
        disabled={disabled}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {Object.entries(associationTypeConfig).map(([type, config]) => (
            <Radio key={type} value={type} style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ marginLeft: 8, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  {config.icon}
                  <Text strong style={{ marginLeft: 8 }}>
                    {config.label}
                  </Text>
                </div>
                {showDescription && (
                  <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                    {config.description}
                  </Text>
                )}
              </div>
            </Radio>
          ))}
        </Space>
      </Radio.Group>
    </div>
  );

  // 渲染关联对象选择
  const renderAssociationSelector = () => {
    if (associationType.key === 'personal') {
      return (
        <Alert
          message="个人文档"
          description="此文档将作为您的个人文档，只有您可以访问和编辑。"
          type="info"
          icon={<UserOutlined />}
          showIcon
        />
      );
    }

    const isProject = associationType.key === 'project';
    const options = isProject ? projects : customers;
    const loading = isProject ? projectsLoading : customersLoading;
    const placeholder = isProject ? '请选择关联的项目' : '请选择关联的客户';
    const emptyText = isProject ? '暂无可用项目' : '暂无可用客户';

    return (
      <div>
        <div style={{ marginBottom: 12 }}>
          <Text strong>
            选择关联的{isProject ? '项目' : '客户'}
          </Text>
        </div>
        
        <Spin spinning={loading}>
          <Select
            style={{ width: '100%' }}
            placeholder={placeholder}
            value={selectedId}
            onChange={handleSelectionChange}
            disabled={disabled || loading}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent={loading ? <Spin size="small" /> : <Empty description={emptyText} />}
            options={options.map(option => ({
              value: option.id,
              label: isProject 
                ? (option as ProjectOption).name
                : (option as CustomerOption).name}))}
          />
        </Spin>

        {selectedId && (
          <div style={{ marginTop: 12 }}>
            {isProject ? (
              (() => {
                const project = projects.find(p => p.id === selectedId);
                return project ? (
                  <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <ProjectOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      <div>
                        <Text strong>{project.name}</Text>
                        {project.description && (
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {project.description}
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ) : null;
              })()
            ) : (
              (() => {
                const customer = customers.find(c => c.id === selectedId);
                return customer ? (
                  <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <TeamOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      <div>
                        <Text strong>{customer.company_name}</Text>
                        {customer.industry && (
                          <div>
                            <Tag color="blue" style={{ fontSize: '10px', marginTop: 4 }}>
                              {customer.industry}
                            </Tag>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ) : null;
              })()
            )}
          </div>
        )}

        {!loading && options.length === 0 && (
          <Alert
            message={`暂无可用${isProject ? '项目' : '客户'}`}
            description={`请先创建${isProject ? '项目' : '客户'}后再创建关联文档。`}
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
            action={
              <Button size="small" type="primary">
                创建{isProject ? '项目' : '客户'}
              </Button>
            }
          />
        )}
      </div>
    );
  };

  // 卡片模式渲染
  if (mode === 'card') {
    return (
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            文档关联设置
          </div>
        }
        style={{ width: '100%' }}
      >
        {renderTypeSelector()}
        {renderAssociationSelector()}
      </Card>
    );
  }

  // 内联模式渲染
  return (
    <div>
      {renderTypeSelector()}
      {renderAssociationSelector()}
    </div>
  );
};

export default DocumentAssociationSelector;