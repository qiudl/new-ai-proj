import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Card,
  Row,
  Col,
  Alert,
  Typography,
  Space,
  Divider,
  message
} from 'antd';
import {
  LinkOutlined,
  LockOutlined,
  UnlockOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { RouteConfig, MenuItem, COMPONENT_OPTIONS, PERMISSION_LEVELS } from '../types/navigation';
import { navigationService } from '../services/navigationService';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface RouteConfigFormProps {
  visible: boolean;
  onCancel: () => void;
  onSave: () => void;
  route?: RouteConfig | null;
  menuItems: MenuItem[];
}

const RouteConfigForm: React.FC<RouteConfigFormProps> = ({
  visible,
  onCancel,
  onSave,
  route,
  menuItems
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isProtected, setIsProtected] = useState(true);

  useEffect(() => {
    if (visible) {
      if (route) {
        // 编辑模式
        form.setFieldsValue({
          path: route.path,
          component: route.component,
          menu_item_id: route.menu_item_id,
          is_protected: route.is_protected,
          permission: route.permission,
          redirect: route.redirect,
          exact: route.exact,
          meta: route.meta ? {
            title: route.meta.title,
            description: route.meta.description,
            keywords: route.meta.keywords,
          } : undefined,
        });
        setIsProtected(route.is_protected);
      } else {
        // 新增模式
        form.resetFields();
        form.setFieldsValue({
          is_protected: true,
          exact: true,
        });
        setIsProtected(true);
      }
    }
  }, [visible, route, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const routeData: Omit<RouteConfig, 'id' | 'created_at' | 'updated_at'> = {
        path: values.path,
        component: values.component,
        menu_item_id: values.menu_item_id,
        is_protected: values.is_protected,
        permission: values.permission,
        redirect: values.redirect,
        exact: values.exact,
        meta: values.meta ? {
          title: values.meta.title,
          description: values.meta.description,
          keywords: values.meta.keywords,
        } : undefined,
      };

      if (route?.id) {
        await navigationService.updateRoute(route.id, routeData);
        message.success('路由配置更新成功');
      } else {
        await navigationService.createRoute(routeData);
        message.success('路由配置创建成功');
      }

      onSave();
    } catch (error) {
      console.error('Save route failed:', error);
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const path = e.target.value;
    // 如果没有设置组件，尝试根据路径推断组件
    if (path && !form.getFieldValue('component')) {
      const pathSegments = path.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const lastSegment = pathSegments[pathSegments.length - 1];
        const componentName = lastSegment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('') + 'Page';
        
        // 检查是否存在预定义组件
        const matchingComponent = COMPONENT_OPTIONS.find(
          option => option.name.toLowerCase().includes(lastSegment.toLowerCase())
        );
        
        if (matchingComponent) {
          form.setFieldValue('component', matchingComponent.name);
        }
      }
    }
  };

  return (
    <Modal
      title={route ? '编辑路由配置' : '新增路由配置'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={800}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Alert
          message="路由配置说明"
          description="配置应用的路由信息，包括路径、组件、权限等。确保路径的唯一性和组件的正确性。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          closable
        />

        {/* 基本配置 */}
        <Card title="基本配置"  style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="路由路径"
                name="path"
                rules={[
                  { required: true, message: '请输入路由路径' },
                  { pattern: /^\//, message: '路径必须以 / 开头' }
                ]}
                tooltip="应用内的路由路径，必须以 / 开头，例如 /users 或 /system/settings"
              >
                <Input
                  placeholder="例如: /users, /system/settings"
                  onChange={handlePathChange}
                  addonBefore={<LinkOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="关联组件"
                name="component"
                rules={[{ required: true, message: '请选择或输入组件名称' }]}
                tooltip="页面对应的React组件名称"
              >
                <Select
                  placeholder="选择或输入组件名称"
                  showSearch
                  allowClear
                  optionFilterProp="children"
                  dropdownRender={menu => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ padding: '4px 8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          可以直接输入自定义组件名称
                        </Text>
                      </div>
                    </>
                  )}
                >
                  {COMPONENT_OPTIONS.map(option => (
                    <Option key={option.name} value={option.name}>
                      <div>
                        <div>{option.name}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {option.description} - {option.category}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="关联菜单项"
                name="menu_item_id"
                tooltip="选择与此路由关联的菜单项"
              >
                <Select
                  placeholder="选择关联的菜单项"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {menuItems.map(item => (
                    <Option key={item.id} value={item.id}>
                      {item.label} ({item.key})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="重定向路径"
                name="redirect"
                tooltip="可选的重定向路径，当访问此路由时自动跳转"
              >
                <Input
                  placeholder="例如: /dashboard"
                  addonBefore="➜"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 权限配置 */}
        <Card title="权限配置"  style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="保护状态"
                name="is_protected"
                valuePropName="checked"
                tooltip="是否需要用户登录才能访问此路由"
              >
                <Switch
                  checkedChildren={<><LockOutlined /> 需要认证</>}
                  unCheckedChildren={<><UnlockOutlined /> 公开访问</>}
                  onChange={setIsProtected}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="精确匹配"
                name="exact"
                valuePropName="checked"
                tooltip="是否需要路径完全匹配才能激活此路由"
              >
                <Switch
                  checkedChildren="精确匹配"
                  unCheckedChildren="模糊匹配"
                />
              </Form.Item>
            </Col>
          </Row>

          {isProtected && (
            <Form.Item
              label="访问权限"
              name="permission"
              tooltip="设置访问此路由所需的具体权限"
            >
              <Select
                placeholder="选择权限级别"
                allowClear
                showSearch
              >
                {PERMISSION_LEVELS.map(level => (
                  <Option key={level.value} value={level.value}>
                    <div>
                      <div>{level.label}</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {level.description}
                      </Text>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Card>

        {/* 页面元信息 */}
        <Card title="页面元信息" >
          <Form.Item
            label="页面标题"
            name={['meta', 'title']}
            tooltip="页面的标题，用于浏览器标签页和SEO"
          >
            <Input placeholder="例如: 用户管理 - AI上下文任务系统" />
          </Form.Item>

          <Form.Item
            label="页面描述"
            name={['meta', 'description']}
            tooltip="页面的描述信息，用于SEO优化"
          >
            <TextArea
              placeholder="页面功能和内容的简要描述..."
              rows={3}
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            label="关键词"
            name={['meta', 'keywords']}
            tooltip="页面相关的关键词，用逗号分隔"
          >
            <Input placeholder="例如: 用户管理,权限,系统设置" />
          </Form.Item>

          <Alert
            message="SEO提示"
            description="合理设置页面元信息有助于搜索引擎优化和用户体验。建议为每个页面设置独特的标题和描述。"
            type="info"
            showIcon
          />
        </Card>
      </Form>
    </Modal>
  );
};

export default RouteConfigForm;