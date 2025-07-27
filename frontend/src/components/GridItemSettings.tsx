import React, { useState } from 'react';
import { 
  Popover, 
  Button, 
  Form, 
  InputNumber, 
  Switch, 
  Space, 
  Divider,
  Typography,
  Select,
  Tooltip
} from 'antd';
import { 
  SettingOutlined, 
  ExpandOutlined,
  CompressOutlined,
  BorderOutlined,
  FullscreenOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

export interface GridItemConfig {
  width: number;
  height: number;
  autoWidth: boolean;
  autoHeight: boolean;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable: boolean;
  draggable: boolean;
}

interface GridItemSettingsProps {
  componentId: string;
  config: GridItemConfig;
  onConfigChange: (componentId: string, newConfig: Partial<GridItemConfig>) => void;
  gridCols: number;
  componentName?: string;
  isDragMode?: boolean;
}

const GridItemSettings: React.FC<GridItemSettingsProps> = ({
  componentId,
  config,
  onConfigChange,
  gridCols,
  componentName = '组件',
  isDragMode = false
}) => {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const handleConfigUpdate = (changedFields: Partial<GridItemConfig>) => {
    onConfigChange(componentId, changedFields);
  };

  const presetSizes = [
    { label: '小', width: Math.floor(gridCols * 0.25), height: 3 },
    { label: '中', width: Math.floor(gridCols * 0.5), height: 4 },
    { label: '大', width: Math.floor(gridCols * 0.75), height: 5 },
    { label: '全宽', width: gridCols, height: 4 }
  ];

  const settingsContent = (
    <div style={{ width: 280, padding: 8 }}>
      <div style={{ marginBottom: 16 }}>
        <Text strong>{componentName} 设置</Text>
      </div>
      
      <Form
        form={form}
        layout="vertical"
        initialValues={config}
        onValuesChange={(_, allValues) => handleConfigUpdate(allValues)}
      >
        {/* 快速尺寸预设 */}
        <Form.Item label="快速尺寸">
          <Space wrap>
            {presetSizes.map((preset) => (
              <Button
                key={preset.label}
                size="small"
                onClick={() => {
                  const newConfig = {
                    width: preset.width,
                    height: preset.height
                  };
                  form.setFieldsValue(newConfig);
                  handleConfigUpdate(newConfig);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </Space>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        {/* 宽度设置 */}
        <Form.Item label="宽度设置">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item 
              name="autoWidth" 
              valuePropName="checked" 
              style={{ marginBottom: 8 }}
            >
              <Switch 
                checkedChildren="自适应宽度" 
                unCheckedChildren="固定宽度"
                onChange={(checked) => {
                  if (checked) {
                    handleConfigUpdate({ autoWidth: checked, maxWidth: undefined });
                  }
                }}
              />
            </Form.Item>
            
            {!config.autoWidth && (
              <Form.Item name="width" style={{ marginBottom: 8 }}>
                <InputNumber
                  min={1}
                  max={gridCols}
                  style={{ width: '100%' }}
                  addonAfter={`/ ${gridCols}`}
                  placeholder="网格宽度"
                />
              </Form.Item>
            )}
            
            <Form.Item name="minWidth" style={{ marginBottom: 0 }}>
              <InputNumber
                min={1}
                max={gridCols}
                style={{ width: '100%' }}
                addonBefore="最小宽度"
                addonAfter={`/ ${gridCols}`}
              />
            </Form.Item>
          </Space>
        </Form.Item>

        {/* 高度设置 */}
        <Form.Item label="高度设置">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item 
              name="autoHeight" 
              valuePropName="checked" 
              style={{ marginBottom: 8 }}
            >
              <Switch 
                checkedChildren="内容自适应" 
                unCheckedChildren="固定高度"
                onChange={(checked) => {
                  if (checked) {
                    handleConfigUpdate({ autoHeight: checked, maxHeight: undefined });
                  }
                }}
              />
            </Form.Item>
            
            {!config.autoHeight && (
              <Form.Item name="height" style={{ marginBottom: 8 }}>
                <InputNumber
                  min={1}
                  max={20}
                  style={{ width: '100%' }}
                  addonAfter="格"
                  placeholder="网格高度"
                />
              </Form.Item>
            )}
            
            <Form.Item name="minHeight" style={{ marginBottom: 0 }}>
              <InputNumber
                min={1}
                max={20}
                style={{ width: '100%' }}
                addonBefore="最小高度"
                addonAfter="格"
              />
            </Form.Item>
          </Space>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        {/* 交互设置 */}
        <Form.Item label="交互设置">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item 
              name="resizable" 
              valuePropName="checked" 
              style={{ marginBottom: 8 }}
            >
              <Switch 
                checkedChildren={<><ExpandOutlined /> 可调整大小</>}
                unCheckedChildren={<><CompressOutlined /> 固定大小</>}
              />
            </Form.Item>
            
            <Form.Item 
              name="draggable" 
              valuePropName="checked" 
              style={{ marginBottom: 0 }}
            >
              <Switch 
                checkedChildren={<><BorderOutlined /> 可拖拽</>}
                unCheckedChildren={<><BorderOutlined /> 固定位置</>}
              />
            </Form.Item>
          </Space>
        </Form.Item>

        {/* 重置按钮 */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button 
            size="small" 
            onClick={() => {
              const defaultConfig: GridItemConfig = {
                width: Math.floor(gridCols * 0.5),
                height: 4,
                autoWidth: false,
                autoHeight: false,
                minWidth: 2,
                minHeight: 2,
                resizable: true,
                draggable: true
              };
              form.setFieldsValue(defaultConfig);
              handleConfigUpdate(defaultConfig);
            }}
          >
            重置为默认
          </Button>
        </div>
      </Form>
    </div>
  );

  return (
    <Popover
      content={settingsContent}
      title={null}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft" // 改为左侧避免与拖拽手柄重叠
      overlayStyle={{ zIndex: 1050 }}
    >
      <Tooltip title={`配置${componentName}`}>
        <Button
          type="text"
          size="small"
          icon={<SettingOutlined />}
          style={{
            width: 28,
            height: 28,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            fontSize: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            // 拖拽模式下改变样式
            ...(isDragMode && {
              backgroundColor: 'rgba(82, 196, 26, 0.1)',
              borderColor: '#52c41a',
              color: '#52c41a'
            })
          }}
          onMouseEnter={(e) => {
            const target = e.currentTarget;
            target.style.backgroundColor = isDragMode 
              ? 'rgba(82, 196, 26, 0.2)' 
              : 'rgba(24, 144, 255, 0.1)';
            target.style.borderColor = isDragMode ? '#52c41a' : '#40a9ff';
            target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            const target = e.currentTarget;
            target.style.backgroundColor = isDragMode 
              ? 'rgba(82, 196, 26, 0.1)' 
              : 'rgba(255, 255, 255, 0.95)';
            target.style.borderColor = isDragMode ? '#52c41a' : '#d9d9d9';
            target.style.color = isDragMode ? '#52c41a' : '';
            target.style.transform = 'scale(1)';
          }}
        />
      </Tooltip>
    </Popover>
  );
};

export default GridItemSettings;