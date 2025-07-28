import React, { useState } from 'react';
import {
  Input,
  Button,
  Popover,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Tabs,
  Empty,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  ClearOutlined,
  // 导入所有可能用到的图标
  DashboardOutlined,
  ProjectOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  FileTextOutlined,
  FolderOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  ToolOutlined,
  BugOutlined,
  CodeOutlined,
  ApiOutlined,
  DatabaseOutlined,
  ShopOutlined,
  CustomerServiceOutlined,
  MoneyCollectOutlined,
  CreditCardOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  AuditOutlined,
  DeleteOutlined,
  RobotOutlined,
  PlusOutlined,
  EditOutlined,
  SaveOutlined,
  ImportOutlined,
  ExportOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  AppstoreOutlined,
  TableOutlined
} from '@ant-design/icons';
import { IconOption } from '../types/navigation';

const { Text } = Typography;
const { TabPane } = Tabs;

interface IconSelectorProps {
  value?: string;
  onChange?: (iconName: string) => void;
  options: IconOption[];
}

// 图标组件映射
const ICON_COMPONENTS: Record<string, React.ComponentType> = {
  DashboardOutlined,
  ProjectOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  FileTextOutlined,
  FolderOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  ToolOutlined,
  BugOutlined,
  CodeOutlined,
  ApiOutlined,
  DatabaseOutlined,
  ShopOutlined,
  CustomerServiceOutlined,
  MoneyCollectOutlined,
  CreditCardOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  AuditOutlined,
  DeleteOutlined,
  RobotOutlined,
  PlusOutlined,
  EditOutlined,
  SaveOutlined,
  ImportOutlined,
  ExportOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  AppstoreOutlined,
  TableOutlined,
};

const IconSelector: React.FC<IconSelectorProps> = ({
  value,
  onChange,
  options
}) => {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('基础');

  // 获取图标组件
  const getIconComponent = (iconName: string) => {
    const IconComponent = ICON_COMPONENTS[iconName];
    return IconComponent ? <IconComponent /> : null;
  };

  // 过滤图标
  const filteredOptions = options.filter(option => {
    const matchesSearch = !searchQuery || 
      option.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || option.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // 获取所有分类
  const categories = Array.from(new Set(options.map(option => option.category)));

  // 处理图标选择
  const handleIconSelect = (iconName: string) => {
    onChange?.(iconName);
    setVisible(false);
  };

  // 清除选择
  const handleClear = () => {
    onChange?.('');
    setVisible(false);
  };

  // 渲染图标网格
  const renderIconGrid = (icons: IconOption[]) => {
    if (icons.length === 0) {
      return (
        <Empty 
          description="没有找到匹配的图标"
          style={{ padding: '20px 0' }}
        />
      );
    }

    return (
      <Row gutter={[8, 8]}>
        {icons.map(option => (
          <Col span={6} key={option.name}>
            <Tooltip title={option.name}>
              <Card
                size="small"
                hoverable
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: value === option.name ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  backgroundColor: value === option.name ? '#f0f8ff' : undefined
                }}
                bodyStyle={{ padding: '8px' }}
                onClick={() => handleIconSelect(option.name)}
              >
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>
                  {getIconComponent(option.name)}
                </div>
                <Text 
                  style={{ 
                    fontSize: '10px', 
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {option.name.replace('Outlined', '')}
                </Text>
              </Card>
            </Tooltip>
          </Col>
        ))}
      </Row>
    );
  };

  const content = (
    <div style={{ width: 400, maxHeight: 500, overflow: 'auto' }}>
      {/* 搜索栏 */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索图标..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>

      {/* 操作按钮 */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Space>
          <Button size="small" onClick={handleClear}>
            清除选择
          </Button>
        </Space>
      </div>

      {/* 分类标签页 */}
      <Tabs
        activeKey={activeCategory}
        onChange={setActiveCategory}
        size="small"
        tabPosition="top"
      >
        <TabPane tab="全部" key="">
          {renderIconGrid(filteredOptions)}
        </TabPane>
        {categories.map(category => (
          <TabPane tab={category} key={category}>
            {renderIconGrid(filteredOptions.filter(opt => opt.category === category))}
          </TabPane>
        ))}
      </Tabs>
    </div>
  );

  return (
    <Popover
      content={content}
      title="选择图标"
      trigger="click"
      open={visible}
      onOpenChange={setVisible}
      placement="bottomLeft"
    >
      <Input
        value={value}
        placeholder="点击选择图标"
        readOnly
        style={{ cursor: 'pointer' }}
        prefix={value ? getIconComponent(value) : <SearchOutlined />}
        suffix={
          <Space>
            {value && (
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              />
            )}
          </Space>
        }
      />
    </Popover>
  );
};

export default IconSelector;