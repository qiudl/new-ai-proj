// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
 Modal,
 Form,
 Input,
 Select, 
 InputNumber,
 TreeSelect, 
 Alert,
 Card,
 Row,
 Col,
 Typography, 
 message
} from 'antd';
import {
 
 SettingOutlined
} from '@ant-design/icons';
import { MenuItem, MenuItemRequest, ICON_OPTIONS, PERMISSION_LEVELS, MENU_TYPES } from '../types/navigation';
import { navigationService } from '../services/navigationService';
import IconSelector from './IconSelector';



const { Title, Text } = Typography;

interface MenuItemFormProps {
  visible: boolean;
  onCancel: () => void;
  onSave: () => void;
  menuItem?: MenuItem | null;
  menuItems: MenuItem[];
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({
  visible,
  onCancel,
  onSave,
  menuItem,
  menuItems
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [menuType, setMenuType] = useState<string>('page');
  const [selectedIcon, setSelectedIcon] = useState<string>('');

  useEffect(() => {
    if (visible) {
      if (menuItem) {
        // 编辑模式
        form.setFieldsValue({
          key: menuItem.key,
          label: menuItem.label,
          icon: menuItem.icon,
          path: menuItem.path,
          parent_id: menuItem.parent_id,
          sort_order: menuItem.sort_order,
          is_visible: menuItem.is_visible,
          is_enabled: menuItem.is_enabled,
          permission: menuItem.permission,
          component: menuItem.component});
        setSelectedIcon(menuItem.icon || '');
        
        // 根据菜单项特征推断类型
        if (menuItem.path && menuItem.component) {
          setMenuType('page');
        } else if (menuItem.children && menuItem.children.length > 0) {
          setMenuType('group');
        } else if (menuItem.path && menuItem.path.startsWith('http')) {
          setMenuType('link');
        } else {
          setMenuType('action');
        }
      } else {
        // 新增模式
        form.resetFields();
        form.setFieldsValue({
          sort_order: (menuItems.length + 1) * 10,
          is_visible: true,
          is_enabled: true});
        setSelectedIcon('');
        setMenuType('page');
      }
    }
  }, [visible, menuItem, menuItems, form]);

  // 构建父菜单选项树
  const buildParentTreeData = () => {
    const buildTree = (items: MenuItem[], excludeId?: string): any[] => {
      return items
        .filter(item => item.id !== excludeId) // 排除自己
        .filter(item => !item.parent_id) // 只显示顶级菜单作为可选父级
        .map(item => ({
          value: item.id,
          title: `${item.label} (${item.key})`,
          disabled: item.id === excludeId}));
    };

    return buildTree(menuItems, menuItem?.id);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 根据菜单类型调整字段
      const menuItemData: MenuItemRequest = {
        ...values,
        icon: selectedIcon};

      // 如果是分组菜单，清除路径和组件
      if (menuType === 'group') {
        menuItemData.path = undefined;
        menuItemData.component = undefined;
      }

      // 如果是外部链接，确保路径以http开头
      if (menuType === 'link' && menuItemData.path && !menuItemData.path.startsWith('http')) {
        menuItemData.path = `https://${menuItemData.path}`;
      }

      if (menuItem?.id) {
        await navigationService.updateMenuItem(menuItem.id, menuItemData);
        message.success('菜单项更新成功');
      } else {
        await navigationService.createMenuItem(menuItemData);
        message.success('菜单项创建成功');
      }

      onSave();
    } catch (error) {
      console.error('Save menu item failed:', error);
      if (error instanceof Error) {
        message.error(`保存失败: ${error.message}`);
      } else {
        message.error('保存失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    // 自动生成路径（如果是页面菜单且路径为空）
    if (menuType === 'page' && key && !form.getFieldValue('path')) {
      const path = key.startsWith('/') ? key : `/${key}`;
      form.setFieldValue('path', path);
    }
  };

  const handleMenuTypeChange = (type: string) => {
    setMenuType(type);
    
    // 根据类型设置默认值
    if (type === 'group') {
      form.setFieldsValue({
        path: undefined,
        component: undefined});
    } else if (type === 'action') {
      form.setFieldsValue({
        component: undefined});
    }
  };

  return (
    <Modal
      title={menuItem ? '编辑菜单项' : '新增菜单项'}
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
          message="菜单项配置说明"
          description="配置菜单项的基本信息、显示样式、权限和行为。请确保菜单键值的唯一性。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          closable
        />

        {/* 基本信息 */}
        <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="菜单类型"
                name="menuType"
                tooltip="选择菜单项的类型，不同类型有不同的配置选项"
              >
                <Select
                  value={menuType}
                  onChange={handleMenuTypeChange}
                  placeholder="请选择菜单类型"
                >
                  {MENU_TYPES.map(type => (
                    <Option key={type.value} value={type.value}>
                      <div>
                        <div>{type.label}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {type.description}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="父级菜单"
                name="parent_id"
                tooltip="选择此菜单项的父级菜单，留空则为顶级菜单"
              >
                <TreeSelect
                  placeholder="请选择父级菜单"
                  allowClear
                  treeData={buildParentTreeData()}
                  showSearch
                  treeNodeFilterProp="title"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="菜单键值"
                name="key"
                rules={[
                  { required: true, message: '请输入菜单键值' },
                  { pattern: /^[a-zA-Z0-9\-_/]+$/, message: '只能包含字母、数字、短横线、下划线和斜杠' }
                ]}
                tooltip="唯一标识此菜单项的键值，建议使用路径格式如 /users 或 /system/settings"
              >
                <Input
                  placeholder="例如: /users, /system/settings"
                  onChange={handleKeyChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="菜单标签"
                name="label"
                rules={[{ required: true, message: '请输入菜单标签' }]}
                tooltip="显示在菜单中的文本标签"
              >
                <Input placeholder="例如: 用户管理, 系统设置" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 显示配置 */}
        <Card title="显示配置" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="菜单图标"
                name="icon"
                tooltip="选择菜单项的图标"
              >
                <IconSelector
                  value={selectedIcon}
                  onChange={setSelectedIcon}
                  options={ICON_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="排序顺序"
                name="sort_order"
                rules={[{ required: true, message: '请输入排序顺序' }]}
                tooltip="用于控制菜单项的显示顺序，数值越小越靠前"
              >
                <InputNumber
                  min={0}
                  max={9999}
                  style={{ width: '100%' }}
                  placeholder="例如: 10, 20, 30"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="可见性"
                name="is_visible"
                valuePropName="checked"
                tooltip="控制菜单项是否在导航中显示"
              >
                <Switch checkedChildren="可见" unCheckedChildren="隐藏" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="启用状态"
                name="is_enabled"
                valuePropName="checked"
                tooltip="控制菜单项是否可以点击和使用"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 路由配置 */}
        {menuType !== 'group' && (
          <Card title="路由配置" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="路由路径"
                  name="path"
                  rules={
                    menuType === 'page' 
                      ? [{ required: true, message: '页面菜单必须设置路由路径' }]
                      : undefined
                  }
                  tooltip={
                    menuType === 'link' 
                      ? "外部链接的完整URL地址" 
                      : "应用内的路由路径，必须以 / 开头"
                  }
                >
                  <Input
                    placeholder={
                      menuType === 'link' 
                        ? "例如: https://example.com" 
                        : "例如: /users, /system/settings"
                    }
                    addonBefore={menuType === 'link' ? <LinkOutlined /> : '/'}
                  />
                </Form.Item>
              </Col>
              {menuType === 'page' && (
                <Col span={12}>
                  <Form.Item
                    label="关联组件"
                    name="component"
                    tooltip="页面对应的React组件名称"
                  >
                    <Select
                      placeholder="选择或输入组件名称"
                      showSearch
                      allowClear
                      optionFilterProp="children"
                    >
                      {['DashboardPage', 'ProjectsPage', 'TasksPage', 'UserManagementPage', 'CompanyListPage'].map(component => (
                        <Option key={component} value={component}>
                          {component}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
            </Row>
          </Card>
        )}

        {/* 权限配置 */}
        <Card title="权限配置" size="small">
          <Form.Item
            label="访问权限"
            name="permission"
            tooltip="设置访问此菜单项所需的权限，留空则表示所有已登录用户都可访问"
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

          <Alert
            message="权限说明"
            description="权限配置将决定哪些用户可以看到和访问此菜单项。建议为敏感功能设置适当的权限级别。"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Card>
      </Form>
    </Modal>
  );
};

export default MenuItemForm;