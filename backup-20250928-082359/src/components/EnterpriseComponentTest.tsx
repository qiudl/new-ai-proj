import React, { useState, useEffect } from 'react';
import { Card, Button, Space, message, Form, Modal, Divider, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import EnterpriseTable from './EnterpriseTable';
import EnterpriseSelector from './EnterpriseSelector';
import EnterpriseForm from './EnterpriseForm';
import enterpriseService from '../services/enterpriseService';
import { Enterprise, EnterpriseRequest } from '../types/enterprise';

const { Title } = Typography;

/**
 * 企业组件测试页面
 * 用于测试新的Enterprise组件与API的集成
 */
const EnterpriseComponentTest: React.FC = () => {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEnterprise, setSelectedEnterprise] = useState<number | undefined>();
  const [selectedEnterpriseData, setSelectedEnterpriseData] = useState<Enterprise | undefined>();
  
  const [form] = Form.useForm();

  // 加载企业列表
  const loadEnterprises = async () => {
    setLoading(true);
    try {
      const result = await enterpriseService.getEnterprises(1, 50);
      setEnterprises(result.data);
      message.success(`加载了 ${result.data.length} 个企业`);
    } catch (error) {
      console.error('加载企业列表失败:', error);
      message.error('加载企业列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnterprises();
  }, []);

  // 处理创建企业
  const handleCreate = async (values: any) => {
    try {
      const createData: EnterpriseRequest = values;
      await enterpriseService.createEnterprise(createData);
      message.success('创建企业成功');
      setModalVisible(false);
      form.resetFields();
      loadEnterprises(); // 重新加载列表
    } catch (error) {
      console.error('创建企业失败:', error);
      message.error('创建企业失败');
    }
  };

  // 处理表格操作
  const handleView = (enterprise: Enterprise) => {
    message.info(`查看企业: ${enterprise.name}`);
  };

  const handleEdit = (enterprise: Enterprise) => {
    message.info(`编辑企业: ${enterprise.name}`);
  };

  const handleDelete = (enterprise: Enterprise) => {
    message.warning(`删除企业功能需要确认对话框: ${enterprise.name}`);
  };

  const handleManageUsers = (enterprise: Enterprise) => {
    message.info(`管理 ${enterprise.name} 的用户`);
  };

  const handleManageDepartments = (enterprise: Enterprise) => {
    message.info(`管理 ${enterprise.name} 的部门`);
  };

  // 处理选择器变化
  const handleSelectorChange = (value: number | undefined, enterprise?: Enterprise) => {
    setSelectedEnterprise(value);
    setSelectedEnterpriseData(enterprise);
    if (enterprise) {
      message.info(`选中企业: ${enterprise.name}`);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Enterprise 组件测试</Title>
      
      {/* Enterprise Selector 测试 */}
      <Card title="Enterprise Selector 测试" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>企业选择器:</strong>
            <EnterpriseSelector
              value={selectedEnterprise}
              onChange={handleSelectorChange}
              style={{ width: '300px', marginLeft: '16px' }}
            />
          </div>
          {selectedEnterpriseData && (
            <div>
              <strong>已选择:</strong> {selectedEnterpriseData.name} ({selectedEnterpriseData.code})
            </div>
          )}
        </Space>
      </Card>

      {/* Enterprise Table 测试 */}
      <Card 
        title="Enterprise Table 测试"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              创建企业
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadEnterprises}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <EnterpriseTable
          data={enterprises}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onManageUsers={handleManageUsers}
          onManageDepartments={handleManageDepartments}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      {/* 创建企业对话框 */}
      <Modal
        title="创建企业"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={800}
        footer={null}
      >
        <Form
          form={form}
          onFinish={handleCreate}
        >
          <EnterpriseForm
            form={form}
            requiredFields={['name', 'code', 'business_type', 'status']}
          />
          
          <Divider />
          
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default EnterpriseComponentTest;