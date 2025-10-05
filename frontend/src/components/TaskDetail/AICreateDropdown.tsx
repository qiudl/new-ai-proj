import React, { useState, useEffect, useMemo } from 'react';
import { Dropdown, Button, message, Tooltip, Spin } from 'antd';
import { RobotOutlined, DownOutlined } from '@ant-design/icons';
import { fetchAIModelsFromAPI, DEFAULT_AI_MODELS, AIModel } from '../../config/aiModels';
import type { MenuProps } from 'antd';

interface AICreateDropdownProps {
  taskId: number;
  onModelSelect: (modelKey: string, modelInfo: AIModel) => void;
  disabled?: boolean;
}

const AICreateDropdown: React.FC<AICreateDropdownProps> = ({
  taskId,
  onModelSelect,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [models, setModels] = useState<AIModel[]>(DEFAULT_AI_MODELS);

  // 加载AI模型配置
  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const fetchedModels = await fetchAIModelsFromAPI();
        setModels(fetchedModels);
      } catch (error) {
        console.error('Failed to load AI models:', error);
        message.warning('加载AI模型配置失败，使用默认配置');
      } finally {
        setModelsLoading(false);
      }
    };

    loadModels();
  }, []);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const selectedModel = models.find(m => m.key === key);

    if (!selectedModel) return;

    if (!selectedModel.enabled) {
      message.warning(`${selectedModel.label} 未配置，请联系管理员`);
      return;
    }

    setLoading(true);
    onModelSelect(key, selectedModel);

    // 模拟加载完成（实际由父组件控制）
    setTimeout(() => setLoading(false), 500);
  };

  // 使用useMemo缓存menuItems，避免每次渲染都重新创建导致DOM错误
  const menuItems: MenuProps['items'] = useMemo(() => [
    {
      type: 'group',
      label: '选择AI模型',
      children: models.map(model => ({
        key: model.key,
        disabled: !model.enabled,
        label: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>{model.icon}</span>
              <span>{model.label}</span>
              {!model.enabled && (
                <span style={{ fontSize: '12px', color: '#999' }}>(未配置)</span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#666', paddingLeft: '24px' }}>
              {model.description}
            </div>
          </div>
        )
      }))
    }
  ], [models]);

  // 计算启用的模型数量
  const enabledModelsCount = useMemo(() =>
    models.filter(m => m.enabled).length,
    [models]
  );

  if (modelsLoading) {
    return (
      <Button disabled icon={<Spin size="small" />}>
        加载中...
      </Button>
    );
  }

  return (
    <Tooltip title={enabledModelsCount > 0 ? "使用AI智能生成子任务" : "暂无可用的AI模型"}>
      <Dropdown
        menu={{ items: menuItems, onClick: handleMenuClick }}
        placement="bottomRight"
        disabled={disabled || loading || enabledModelsCount === 0}
      >
        <Button loading={loading}>
          <RobotOutlined /> AI创建 <DownOutlined />
        </Button>
      </Dropdown>
    </Tooltip>
  );
};

export default AICreateDropdown;
