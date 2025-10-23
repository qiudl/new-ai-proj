/**
 * GrayReleasePanel - 灰度发布管理面板
 *
 * 提供灰度发布的管理界面，包括：
 * - 灰度开关
 * - 流量比例调整
 * - 白名单/黑名单管理
 * - 快速操作
 * - 实时统计
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Slider,
  Switch,
  Input,
  Button,
  Space,
  message,
  Statistic,
  Row,
  Col,
  Tag,
  Divider,
  Alert,
} from 'antd';
import {
  ThunderboltOutlined,
  UserOutlined,
  TeamOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { FeatureFlagService, FeatureFlag } from '../../utils/featureFlags';

const { TextArea } = Input;

export const GrayReleasePanel: React.FC = () => {
  const [rolloutPercentage, setRolloutPercentage] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [whitelistInput, setWhitelistInput] = useState('');
  const [blacklistInput, setBlacklistInput] = useState('');
  const [whitelist, setWhitelist] = useState<number[]>([]);
  const [blacklist, setBlacklist] = useState<number[]>([]);
  const [totalUsers] = useState(1000); // 假设总用户数

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = () => {
    const config = FeatureFlagService.getConfig(FeatureFlag.NEW_TASK_DETAIL);
    if (config) {
      setEnabled(config.enabled);
      setRolloutPercentage(config.rolloutPercentage);
      setWhitelist(config.whitelistUsers || []);
      setBlacklist(config.blacklistUsers || []);
      setWhitelistInput((config.whitelistUsers || []).join(', '));
      setBlacklistInput((config.blacklistUsers || []).join(', '));
    }
  };

  const handleRolloutChange = (value: number) => {
    setRolloutPercentage(value);
    if (enabled) {
      FeatureFlagService.setRolloutPercentage(FeatureFlag.NEW_TASK_DETAIL, value);
      message.success(`灰度比例已更新为 ${value}%`);
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    FeatureFlagService.setEnabled(FeatureFlag.NEW_TASK_DETAIL, checked);
    message.success(checked ? '灰度发布已启用' : '灰度发布已关闭');

    // 如果启用，同时更新灰度比例
    if (checked) {
      FeatureFlagService.setRolloutPercentage(FeatureFlag.NEW_TASK_DETAIL, rolloutPercentage);
    }
  };

  const handleWhitelistUpdate = () => {
    const ids = whitelistInput
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    setWhitelist(ids);
    FeatureFlagService.setWhitelist(FeatureFlag.NEW_TASK_DETAIL, ids);
    message.success(`白名单已更新，共 ${ids.length} 个用户`);
  };

  const handleBlacklistUpdate = () => {
    const ids = blacklistInput
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    setBlacklist(ids);
    FeatureFlagService.setBlacklist(FeatureFlag.NEW_TASK_DETAIL, ids);
    message.success(`黑名单已更新，共 ${ids.length} 个用户`);
  };

  const estimateAffectedUsers = () => {
    // 基础灰度用户
    const baseUsers = Math.round(totalUsers * (rolloutPercentage / 100));
    // 加上白名单用户（去重）
    return baseUsers + whitelist.length;
  };

  const quickSetPercentage = (percentage: number) => {
    setRolloutPercentage(percentage);
    if (enabled) {
      FeatureFlagService.setRolloutPercentage(FeatureFlag.NEW_TASK_DETAIL, percentage);
      message.success(`灰度比例已设置为 ${percentage}%`);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
              TaskDetail 灰度发布控制面板
            </span>
          </Space>
        }
        extra={
          <Tag color={enabled ? 'success' : 'default'} style={{ fontSize: '14px' }}>
            {enabled ? '已启用' : '未启用'}
          </Tag>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 警告提示 */}
          {enabled && (
            <Alert
              message="灰度发布已启用"
              description={`当前有 ${estimateAffectedUsers()} 个用户可以看到新版本TaskDetail页面`}
              type="info"
              showIcon
            />
          )}

          {/* 总开关 */}
          <Card size="small" title="灰度发布总开关">
            <Space>
              <Switch
                checked={enabled}
                onChange={handleToggle}
                checkedChildren="开启"
                unCheckedChildren="关闭"
                size="default"
              />
              <span style={{ color: '#8c8c8c' }}>
                {enabled ? '灰度发布功能已开启' : '灰度发布功能已关闭'}
              </span>
            </Space>
          </Card>

          {/* 流量比例 */}
          <Card size="small" title={`灰度流量比例: ${rolloutPercentage}%`}>
            <Slider
              min={0}
              max={100}
              step={5}
              value={rolloutPercentage}
              onChange={handleRolloutChange}
              disabled={!enabled}
              marks={{
                0: '0%',
                25: '25%',
                50: '50%',
                75: '75%',
                100: '100%',
              }}
              tooltip={{
                formatter: (value) => `${value}%`,
              }}
            />
            <div style={{ marginTop: '16px', color: '#8c8c8c', fontSize: '12px' }}>
              <PercentageOutlined /> 基于用户ID哈希的稳定分流，同一用户始终看到相同版本
            </div>
          </Card>

          {/* 白名单 */}
          <Card size="small" title={`白名单管理 (${whitelist.length} 个用户)`}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ color: '#8c8c8c', fontSize: '12px', marginBottom: '8px' }}>
                <UserOutlined /> 白名单用户将始终看到新版本，不受灰度比例限制
              </div>
              <TextArea
                value={whitelistInput}
                onChange={(e) => setWhitelistInput(e.target.value)}
                placeholder="输入用户ID，用逗号分隔。例如: 111, 222, 333"
                rows={3}
                disabled={!enabled}
              />
              <Button
                type="primary"
                onClick={handleWhitelistUpdate}
                disabled={!enabled}
              >
                更新白名单
              </Button>
              {whitelist.length > 0 && (
                <div>
                  <span style={{ marginRight: '8px' }}>当前白名单:</span>
                  {whitelist.map((id) => (
                    <Tag key={id} color="blue">
                      {id}
                    </Tag>
                  ))}
                </div>
              )}
            </Space>
          </Card>

          {/* 黑名单 */}
          <Card size="small" title={`黑名单管理 (${blacklist.length} 个用户)`}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ color: '#8c8c8c', fontSize: '12px', marginBottom: '8px' }}>
                <UserOutlined /> 黑名单用户将始终看到旧版本，优先级最高
              </div>
              <TextArea
                value={blacklistInput}
                onChange={(e) => setBlacklistInput(e.target.value)}
                placeholder="输入用户ID，用逗号分隔。例如: 444, 555, 666"
                rows={3}
                disabled={!enabled}
              />
              <Button
                type="primary"
                danger
                onClick={handleBlacklistUpdate}
                disabled={!enabled}
              >
                更新黑名单
              </Button>
              {blacklist.length > 0 && (
                <div>
                  <span style={{ marginRight: '8px' }}>当前黑名单:</span>
                  {blacklist.map((id) => (
                    <Tag key={id} color="red">
                      {id}
                    </Tag>
                  ))}
                </div>
              )}
            </Space>
          </Card>

          <Divider />

          {/* 快速操作 */}
          <Card size="small" title="快速操作">
            <Space wrap>
              <Button onClick={() => quickSetPercentage(0)} disabled={!enabled}>
                关闭灰度 (0%)
              </Button>
              <Button onClick={() => quickSetPercentage(5)} disabled={!enabled}>
                小范围测试 (5%)
              </Button>
              <Button onClick={() => quickSetPercentage(10)} disabled={!enabled}>
                10% 灰度
              </Button>
              <Button onClick={() => quickSetPercentage(20)} disabled={!enabled}>
                20% 灰度
              </Button>
              <Button onClick={() => quickSetPercentage(50)} disabled={!enabled}>
                50% 灰度
              </Button>
              <Button onClick={() => quickSetPercentage(80)} disabled={!enabled}>
                80% 灰度
              </Button>
              <Button
                type="primary"
                onClick={() => quickSetPercentage(100)}
                disabled={!enabled}
              >
                全量发布 (100%)
              </Button>
            </Space>
          </Card>

          {/* 当前状态统计 */}
          <Card title="当前状态统计" size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="灰度比例"
                  value={rolloutPercentage}
                  suffix="%"
                  prefix={<PercentageOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="预估影响用户"
                  value={estimateAffectedUsers()}
                  suffix="人"
                  prefix={<TeamOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="白名单用户"
                  value={whitelist.length}
                  suffix="人"
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="黑名单用户"
                  value={blacklist.length}
                  suffix="人"
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
            </Row>
          </Card>

          {/* 使用说明 */}
          <Card title="使用说明" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <strong>1. 灰度发布流程：</strong>
                <div style={{ marginLeft: '16px', color: '#8c8c8c' }}>
                  关闭(0%) → 小范围测试(5%) → 逐步扩大(10%/20%/50%) → 大规模灰度(80%) → 全量发布(100%)
                </div>
              </div>
              <div>
                <strong>2. 优先级规则：</strong>
                <div style={{ marginLeft: '16px', color: '#8c8c8c' }}>
                  开发环境 {'>'} 黑名单（禁用） {'>'} 白名单（启用） {'>'} 灰度比例 {'>'} 总开关
                </div>
              </div>
              <div>
                <strong>3. 建议：</strong>
                <div style={{ marginLeft: '16px', color: '#8c8c8c' }}>
                  • 先添加开发团队到白名单进行内部测试<br />
                  • 逐步提高灰度比例，观察3天稳定性后再继续<br />
                  • 发现问题立即降低灰度比例或添加到黑名单<br />
                  • 全量发布前确保所有验证通过
                </div>
              </div>
            </Space>
          </Card>
        </Space>
      </Card>
    </div>
  );
};

GrayReleasePanel.displayName = 'GrayReleasePanel';

export default GrayReleasePanel;
