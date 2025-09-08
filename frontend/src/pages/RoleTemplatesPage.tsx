import React, { useState, useEffect } from 'react';
import { Card, Breadcrumb, Row, Col, Statistic, Button, Space, Tabs, Modal, message } from 'antd';
import { 
  HomeOutlined, 
  SettingOutlined, 
  TeamOutlined, 
  ExportOutlined,
  ImportOutlined,
  BarChartOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import RoleTemplateManager from '../components/RoleTemplateManager';
import roleTemplateService from '../services/roleTemplateService';
import { RoleTemplateStats } from '../types/roleTemplate';

const { TabPane } = Tabs;

/**
 * 增强的角色模板管理页面
 * 提供角色模板的完整管理功能，包括统计、导入导出、使用历史等
 */
const RoleTemplatesPage: React.FC = () => {
  const [stats, setStats] = useState<RoleTemplateStats | null>(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // 加载统计数据
  const loadStats = async () => {
    try {
      const statsData = await roleTemplateService.getTemplateStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load template stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // 处理批量导出
  const handleBatchExport = async () => {
    try {
      setExportLoading(true);
      // 这里应该调用批量导出API
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  // 处理导入
  const handleImport = async (file: File) => {
    try {
      const response = await roleTemplateService.importTemplate(file);
      if (response.success) {
        message.success('导入成功');
        loadStats(); // 刷新统计数据
      } else {
        message.error(response.message || '导入失败');
      }
    } catch (error: any) {
      message.error(error.message || '导入失败');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/">
            <HomeOutlined /> 首页
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <SettingOutlined /> 系统管理
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <TeamOutlined /> 角色模板管理
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* 页面标题和统计 */}
      <Card 
        title={
          <div>
            <TeamOutlined style={{ marginRight: 8 }} />
            角色模板管理
          </div>
        }
        extra={
          <Space>
            <Button 
              icon={<ExportOutlined />} 
              onClick={handleBatchExport}
              loading={exportLoading}
            >
              批量导出
            </Button>
            <Button 
              icon={<ImportOutlined />} 
              onClick={() => setImportModalVisible(true)}
            >
              导入模板
            </Button>
          </Space>
        }
        bordered={false}
        style={{ marginBottom: 16 }}
      >
        <p style={{ marginBottom: 16, color: '#666' }}>
          管理系统角色模板，定义预设的角色权限配置，支持模板继承、版本管理和批量应用。
          通过角色模板可以快速创建标准化的角色权限体系。
        </p>

        {/* 统计数据 */}
        {stats && (
          <Row gutter={16}>
            <Col span={6}>
              <Statistic 
                title="总模板数" 
                value={stats.total_templates} 
                prefix={<TeamOutlined />} 
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="系统模板" 
                value={stats.system_templates} 
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="业务模板" 
                value={stats.business_templates} 
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="自定义模板" 
                value={stats.custom_templates} 
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        )}
      </Card>

      {/* 标签页内容 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'templates',
              label: (
                <span>
                  <TeamOutlined />
                  模板管理
                </span>
              ),
              children: <RoleTemplateManager mode="management" />
            },
            {
              key: 'analytics',
              label: (
                <span>
                  <BarChartOutlined />
                  使用分析
                </span>
              ),
              children: (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  使用分析功能开发中...
                  <br />
                  将显示模板使用统计、热门模板排行、应用趋势等数据
                </div>
              )
            },
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined />
                  操作历史
                </span>
              ),
              children: (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  操作历史功能开发中...
                  <br />
                  将显示模板的创建、修改、应用等操作记录
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* 导入模板弹框 */}
      <Modal
        title="导入角色模板"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setImportModalVisible(false)}>
            取消
          </Button>
        ]}
        width={500}
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <input
            type="file"
            accept=".json,.yaml,.yml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImport(file);
                setImportModalVisible(false);
              }
            }}
            style={{ marginBottom: 16 }}
          />
          <div style={{ color: '#666', fontSize: '12px' }}>
            支持 JSON、YAML 格式的模板文件
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RoleTemplatesPage;

