import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  Input,
  message,
  Tag,
  Tooltip,
  Divider,
  Typography,
  Collapse,
  Empty
} from 'antd';
import {
  LinkOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  ShareAltOutlined,
  EyeOutlined,
  CopyOutlined,
  ReloadOutlined,
  PartitionOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;
const { Option } = Select;

// 类型定义
interface DocumentRelation {
  id: number;
  document_id: number;
  entity_type: 'customer' | 'project' | 'task';
  entity_id: number;
  relation_type: string;
  description?: string;
  created_at: string;
  created_by: number;
  entity_name: string;
  creator_name: string;
}

interface EntityOption {
  id: number;
  name: string;
  description?: string;
}

interface DocumentRelationsPanelProps {
  documentId: number;
  onRelationChange?: () => void;
}

// 关系类型配置
const RELATION_TYPES = {
  customer: [
    { value: 'requirement', label: '需求文档', description: '客户需求相关文档' },
    { value: 'contract', label: '合同文档', description: '合同协议相关文档' },
    { value: 'communication', label: '沟通记录', description: '与客户沟通记录' },
    { value: 'feedback', label: '反馈意见', description: '客户反馈和意见' },
    { value: 'reference', label: '参考资料', description: '客户提供的参考资料' }
  ],
  project: [
    { value: 'specification', label: '项目规范', description: '项目技术规范文档' },
    { value: 'design', label: '设计文档', description: '项目设计相关文档' },
    { value: 'plan', label: '项目计划', description: '项目计划和进度文档' },
    { value: 'report', label: '项目报告', description: '项目进展和总结报告' },
    { value: 'manual', label: '使用手册', description: '项目使用说明文档' },
    { value: 'archive', label: '项目存档', description: '项目归档文档' }
  ],
  task: [
    { value: 'instruction', label: '任务说明', description: '任务执行说明文档' },
    { value: 'checklist', label: '检查清单', description: '任务检查和验收清单' },
    { value: 'log', label: '执行日志', description: '任务执行过程记录' },
    { value: 'result', label: '执行结果', description: '任务执行结果文档' },
    { value: 'attachment', label: '任务附件', description: '任务相关附件' }
  ]
};

// 实体类型配置
const ENTITY_CONFIG = {
  customer: {
    icon: <UserOutlined />,
    label: '客户',
    color: '#52c41a'
  },
  project: {
    icon: <ProjectOutlined />,
    label: '项目',
    color: '#1890ff'
  },
  task: {
    icon: <CheckSquareOutlined />,
    label: '任务',
    color: '#fa8c16'
  }
};

const DocumentRelationsPanel: React.FC<DocumentRelationsPanelProps> = ({
  documentId,
  onRelationChange
}) => {
  const [loading, setLoading] = useState(false);
  const [relations, setRelations] = useState<DocumentRelation[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRelation, setEditingRelation] = useState<DocumentRelation | null>(null);
  const [entityOptions, setEntityOptions] = useState<Record<string, EntityOption[]>>({
    customer: [],
    project: [],
    task: []
  });
  
  const [form] = Form.useForm();
  const watchedEntityType = Form.useWatch('entity_type', form);

  // 加载关联关系
  const loadRelations = async () => {
    try {
      setLoading(true);
      // TODO: 调用API获取文档关联关系
      // const response = await documentRelationApi.getByDocumentId(documentId);
      // setRelations(response.data.relations);
      
      // 临时模拟数据
      const mockRelations: DocumentRelation[] = [
        {
          id: 1,
          document_id: documentId,
          entity_type: 'customer',
          entity_id: 1,
          relation_type: 'requirement',
          description: '客户需求说明文档',
          created_at: '2024-01-01T00:00:00Z',
          created_by: 1,
          entity_name: '阿里巴巴集团',
          creator_name: 'Admin'
        },
        {
          id: 2,
          document_id: documentId,
          entity_type: 'project',
          entity_id: 1,
          relation_type: 'design',
          description: '项目UI设计规范',
          created_at: '2024-01-02T00:00:00Z',
          created_by: 1,
          entity_name: 'AI项目管理平台',
          creator_name: 'Admin'
        },
        {
          id: 3,
          document_id: documentId,
          entity_type: 'task',
          entity_id: 5,
          relation_type: 'instruction',
          description: '任务执行步骤说明',
          created_at: '2024-01-03T00:00:00Z',
          created_by: 1,
          entity_name: '实现用户认证功能',
          creator_name: 'Admin'
        }
      ];
      setRelations(mockRelations);
    } catch (error) {
      message.error('加载关联关系失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载实体选项
  const loadEntityOptions = async (entityType: string) => {
    try {
      // TODO: 根据实体类型调用不同的API
      // const response = await entityApi.getOptions(entityType);
      // setEntityOptions(prev => ({
      //   ...prev,
      //   [entityType]: response.data.options
      // }));
      
      // 临时模拟数据
      const mockOptions: Record<string, EntityOption[]> = {
        customer: [
          { id: 1, name: '阿里巴巴集团', description: '大型互联网公司' },
          { id: 2, name: '腾讯科技', description: '社交媒体和游戏公司' },
          { id: 3, name: '百度公司', description: '搜索引擎和AI公司' }
        ],
        project: [
          { id: 1, name: 'AI项目管理平台', description: '智能项目管理系统' },
          { id: 2, name: '企业ERP系统', description: '企业资源规划系统' },
          { id: 3, name: '移动应用开发', description: '移动端应用程序' }
        ],
        task: [
          { id: 1, name: '需求分析', description: '项目需求收集和分析' },
          { id: 2, name: '系统设计', description: '系统架构和详细设计' },
          { id: 3, name: '前端开发', description: '用户界面开发' },
          { id: 4, name: '后端开发', description: '服务端逻辑开发' },
          { id: 5, name: '实现用户认证功能', description: '用户登录注册功能' }
        ]
      };
      
      setEntityOptions(mockOptions);
    } catch (error) {
      console.error('Error loading entity options:', error);
    }
  };

  useEffect(() => {
    if (documentId) {
      loadRelations();
      // 加载所有实体类型的选项
      Object.keys(ENTITY_CONFIG).forEach(loadEntityOptions);
    }
  }, [documentId]);

  // 处理创建/编辑关联关系
  const handleSubmit = async (values: any) => {
    try {
      if (editingRelation) {
        // TODO: 调用更新API
        // await documentRelationApi.update(editingRelation.id, values);
        message.success('关联关系更新成功');
      } else {
        // TODO: 调用创建API
        // await documentRelationApi.create({
        //   document_id: documentId,
        //   ...values
        // });
        message.success('关联关系创建成功');
      }
      
      setModalVisible(false);
      setEditingRelation(null);
      form.resetFields();
      loadRelations();
      onRelationChange?.();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 处理删除关联关系
  const handleDelete = async (relationId: number) => {
    try {
      // TODO: 调用删除API
      // await documentRelationApi.delete(relationId);
      message.success('关联关系删除成功');
      loadRelations();
      onRelationChange?.();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 打开创建/编辑模态框
  const openModal = (relation?: DocumentRelation) => {
    if (relation) {
      setEditingRelation(relation);
      form.setFieldsValue({
        entity_type: relation.entity_type,
        entity_id: relation.entity_id,
        relation_type: relation.relation_type,
        description: relation.description
      });
    } else {
      setEditingRelation(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 获取关系类型标签
  const getRelationTypeLabel = (entityType: string, relationType: string) => {
    const typeConfig = RELATION_TYPES[entityType as keyof typeof RELATION_TYPES];
    const type = typeConfig?.find(t => t.value === relationType);
    return type?.label || relationType;
  };

  // 按实体类型分组关系
  const groupedRelations = relations.reduce((groups, relation) => {
    const key = relation.entity_type;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(relation);
    return groups;
  }, {} as Record<string, DocumentRelation[]>);

  // 表格列定义
  const getColumns = (entityType: string): ColumnsType<DocumentRelation> => [
    {
      title: '实体名称',
      key: 'entity_name',
      render: (_, record) => (
        <Space>
          <span style={{ color: ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG].color }}>
            {ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG].icon}
          </span>
          <strong>{record.entity_name}</strong>
        </Space>
      )
    },
    {
      title: '关系类型',
      key: 'relation_type',
      render: (_, record) => (
        <Tag color={ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG].color}>
          {getRelationTypeLabel(record.entity_type, record.relation_type)}
        </Tag>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text) => new Date(text).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '确认删除',
                  content: '确定要删除这个关联关系吗？',
                  okText: '删除',
                  okType: 'danger',
                  cancelText: '取消',
                  onOk: () => handleDelete(record.id)
                });
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];


  return (
    <div>
      <Card
        title={
          <Space>
            <LinkOutlined />
            <span>文档关联关系</span>
            <Text type="secondary">({relations.length})</Text>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            添加关联
          </Button>
        }
        loading={loading}
      >
        {relations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_DEFAULT}
            description={
              <div>
                <p>暂无关联关系</p>
                <Text type="secondary">
                  点击“添加关联”按钮为此文档建立与客户、项目或任务的关联关系
                </Text>
              </div>
            }
          />
        ) : (
          <Collapse
            defaultActiveKey={Object.keys(groupedRelations)}
            ghost
          >
            {Object.entries(groupedRelations).map(([entityType, entityRelations]) => (
              <Panel
                key={entityType}
                header={
                  <Space>
                    <span style={{ color: ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG].color }}>
                      {ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG].icon}
                    </span>
                    <strong>{ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG].label}</strong>
                    <Tag color={ENTITY_CONFIG[entityType as keyof typeof ENTITY_CONFIG].color}>
                      {entityRelations.length}
                    </Tag>
                  </Space>
                }
              >
                <Table
                  dataSource={entityRelations}
                  columns={getColumns(entityType)}
                  rowKey="id"
                      pagination={false}
                />
              </Panel>
            ))}
          </Collapse>
        )}
      </Card>

      {/* 创建/编辑关联关系模态框 */}
      <Modal
        title={editingRelation ? '编辑关联关系' : '添加关联关系'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          setEditingRelation(null);
          form.resetFields();
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="entity_type"
            label="实体类型"
            rules={[{ required: true, message: '请选择实体类型' }]}
          >
            <Select
              placeholder="选择实体类型"
              onChange={(value) => {
                form.setFieldsValue({ entity_id: undefined, relation_type: undefined });
              }}
            >
              {Object.entries(ENTITY_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span style={{ color: config.color }}>
                      {config.icon}
                    </span>
                    {config.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="entity_id"
            label="选择实体"
            rules={[{ required: true, message: '请选择具体实体' }]}
          >
            <Select
              placeholder="选择具体实体"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase()) || false
              }
            >
              {watchedEntityType && 
                entityOptions[watchedEntityType]?.map(option => (
                  <Option key={option.id} value={option.id}>
                    <div>
                      <div>{option.name}</div>
                      {option.description && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {option.description}
                        </Text>
                      )}
                    </div>
                  </Option>
                ))
              }
            </Select>
          </Form.Item>

          <Form.Item
            name="relation_type"
            label="关系类型"
            rules={[{ required: true, message: '请选择关系类型' }]}
          >
            <Select
              placeholder="选择关系类型"
              notFoundContent="请先选择实体类型"
            >
              {watchedEntityType && 
                RELATION_TYPES[watchedEntityType as keyof typeof RELATION_TYPES]?.map(type => (
                  <Option key={type.value} value={type.value}>
                    <div>
                      <div>{type.label}</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {type.description}
                      </Text>
                    </div>
                  </Option>
                ))
              }
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={
              <Space>
                <span>描述</span>
                <Tooltip title="详细说明此关联关系的具体内容和用途">
                  <InfoCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              </Space>
            }
          >
            <TextArea
              rows={3}
              placeholder="请描述此关联关系的具体内容和用途（可选）"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentRelationsPanel;