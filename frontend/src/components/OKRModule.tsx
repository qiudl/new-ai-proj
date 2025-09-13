import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Progress,
  Tag,
  Collapse,
  Row,
  Col,
  Statistic,
  Alert,
  Empty,
  Spin,
  message,
  InputNumber,
  Dropdown
} from 'antd';
import {
  PlusOutlined,
  SettingOutlined,
  TrophyOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  RightOutlined,
  DownOutlined
} from '@ant-design/icons';
import { OKRObjective, OKRStats, OKRProgressLog } from '../types/okr';
import okrService from '../services/okrService';
import CreateOKRModal from './CreateOKRModal';
import { createDeleteConfirmModal } from '../utils/modalUtils';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface OKRModuleProps {
  quarter?: string;
  style?: React.CSSProperties;
}

const OKRModule: React.FC<OKRModuleProps> = ({ quarter, style }) => {
  const [objectives, setObjectives] = useState<OKRObjective[]>([]);
  const [stats, setStats] = useState<OKRStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingObjective, setEditingObjective] = useState<OKRObjective | null>(null);
  const [krEdits, setKrEdits] = useState<Record<number, number>>({});
  const [objectiveLogs, setObjectiveLogs] = useState<Record<number, { total: number; logs: OKRProgressLog[] }>>({});
  const [showLogs, setShowLogs] = useState<Record<number, boolean>>({});
  const [loadingLogs, setLoadingLogs] = useState<Record<number, boolean>>({});
  const [expandedObjectives, setExpandedObjectives] = useState<Record<number, boolean>>({});

  const currentQuarter = quarter || okrService.getCurrentQuarter();

  useEffect(() => {
    loadOKRData();
  }, [currentQuarter]);

  const loadOKRData = async () => {
    setLoading(true);
    try {
      const [objectivesData, statsData] = await Promise.all([
        okrService.getObjectives(currentQuarter),
        okrService.getOKRStats(currentQuarter)
      ]);
      setObjectives(objectivesData.objectives || []);
      setStats(statsData);
      // initialize KR edits map
      const init: Record<number, number> = {};
      for (const obj of objectivesData.objectives || []) {
        for (const kr of obj.keyResults || []) {
          init[kr.id] = kr.currentValue;
        }
      }
      setKrEdits(init);
    } catch (error) {
      console.error('Failed to load OKR data:', error);
      message.error('加载OKR数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 组织目标为树形结构
  const organizeObjectivesTree = (objectives: OKRObjective[]): OKRObjective[] => {
    if (!objectives) return [];
    
    // 将目标组织为父子关系的层级结构
    const objectiveMap = new Map<number, OKRObjective>();
    const rootObjectives: OKRObjective[] = [];
    
    // 首先创建所有目标的映射
    objectives.forEach(obj => {
      const objectiveWithMeta = {
        ...obj,
        level: obj.parentId ? 2 : 1,
        subObjectives: [] as OKRObjective[],
        isExpanded: expandedObjectives[obj.id] || false
      };
      objectiveMap.set(obj.id, objectiveWithMeta);
    });
    
    // 然后建立父子关系
    objectives.forEach(obj => {
      const objectiveWithMeta = objectiveMap.get(obj.id)!;
      
      if (obj.parentId && objectiveMap.has(obj.parentId)) {
        // 这是一个子目标，添加到父目标的subObjectives中
        const parent = objectiveMap.get(obj.parentId)!;
        parent.subObjectives!.push(objectiveWithMeta);
      } else {
        // 这是一个根目标
        rootObjectives.push(objectiveWithMeta);
      }
    });

    // 临时为每个根目标添加示例子目标以展示展开箭头功能
    // TODO: 这是临时代码，将来应该从真实API获取子目标数据
    rootObjectives.forEach((rootObj, index) => {
      if (rootObj.subObjectives!.length === 0 && index < 2) {
        // 为前两个根目标添加示例子目标
        const sampleSubObjective: OKRObjective = {
          id: rootObj.id * 1000 + 1,
          title: `${rootObj.title} - 子目标示例`,
          description: '这是一个示例子目标，用于展示展开箭头功能',
          quarter: rootObj.quarter,
          startDate: rootObj.startDate,
          endDate: rootObj.endDate,
          assigneeId: rootObj.assigneeId,
          status: rootObj.status,
          progress: Math.max(0, rootObj.progress - 15),
          parentId: rootObj.id,
          level: 2,
          keyResults: rootObj.keyResults?.slice(0, 1) || [],
          createdAt: rootObj.createdAt,
          updatedAt: rootObj.updatedAt,
          subObjectives: [],
          isExpanded: false
        };
        
        rootObj.subObjectives!.push(sampleSubObjective);
      }
    });

    return rootObjectives;
  };

  // 切换目标展开/收起状态
  const toggleObjectiveExpansion = (objectiveId: number) => {
    setExpandedObjectives(prev => ({
      ...prev,
      [objectiveId]: !prev[objectiveId]
    }));
  };

  const handleUpdateObjective = async (id: number, updates: any) => {
    try {
      await okrService.updateObjective(id, updates);
      await loadOKRData();
      message.success('目标更新成功');
    } catch (error) {
      console.error('Failed to update objective:', error);
      message.error('更新目标失败');
    }
  };

  const getProgressStatus = (progress: number) => {
    if (progress >= 100) return 'success';
    if (progress >= 80) return 'active';
    if (progress >= 50) return 'normal';
    return 'exception';
  };

  const getRemainingDays = () => {
    return okrService.getRemainingDaysInQuarter(currentQuarter);
  };

  const loadObjectiveLogs = async (objectiveId: number) => {
    try {
      setLoadingLogs(prev => ({ ...prev, [objectiveId]: true }));
      const res = await okrService.getObjectiveLogs(objectiveId, 50);
      setObjectiveLogs(prev => ({ ...prev, [objectiveId]: { total: res.total || 0, logs: (res.logs || []) as OKRProgressLog[] } }));
    } catch (e) {
      message.error('加载进度日志失败');
    } finally {
      setLoadingLogs(prev => ({ ...prev, [objectiveId]: false }));
    }
  };

  // 删除目标
  const handleDeleteObjective = async (objective: OKRObjective) => {
    try {
      await okrService.deleteObjective(objective.id);
      message.success('目标删除成功');
      await loadOKRData();
    } catch (error) {
      console.error('Failed to delete objective:', error);
      message.error('删除目标失败');
    }
  };

  // 编辑目标
  const handleEditObjective = (objective: OKRObjective) => {
    setEditingObjective(objective);
    setEditModalVisible(true);
  };

  // 删除关键结果
  const handleDeleteKeyResult = async (krId: number) => {
    try {
      await okrService.deleteKeyResult(krId);
      message.success('关键结果删除成功');
      await loadOKRData();
    } catch (error) {
      console.error('Failed to delete key result:', error);
      message.error('删除关键结果失败');
    }
  };

  // 获取目标操作菜单
  const getObjectiveMenuItems = (objective: OKRObjective) => [
    {
      key: 'edit',
      label: '编辑目标',
      icon: <EditOutlined />,
      onClick: () => handleEditObjective(objective)
    },
    {
      key: 'delete',
      label: '删除目标',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        createDeleteConfirmModal({
          content: (
            <div>
              <p>确定要删除目标 <strong>"{objective.title}"</strong> 吗？</p>
              <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
                ⚠️ 删除后将无法恢复，包括所有关键结果和进度数据
              </p>
            </div>
          ),
          onConfirm: () => handleDeleteObjective(objective),
        });
      }
    }
  ];

  // 渲染单个目标（父目标或子目标）
  const renderObjectiveItem = (objective: OKRObjective, isSubObjective = false) => {
    // 只有当实际存在子目标数据时才显示展开箭头
    const hasSubObjectives = objective.subObjectives && objective.subObjectives.length > 0;
    const isExpanded = expandedObjectives[objective.id];
    
    const objectiveStyle = {
      marginBottom: '8px',
      padding: isSubObjective ? '8px 12px' : '12px 16px',
      background: isSubObjective ? '#f8f8f8' : '#fff',
      borderRadius: '6px',
      border: `1px solid ${isSubObjective ? '#e8e8e8' : '#d9d9d9'}`,
      marginLeft: isSubObjective ? '32px' : '0px'
    };

    return (
      <div key={objective.id} style={objectiveStyle}>
        {/* 目标标题行 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            {/* 展开/收起箭头 - 仅父目标显示 */}
            {!isSubObjective && hasSubObjectives && (
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                onClick={() => toggleObjectiveExpansion(objective.id)}
                style={{ padding: '0px 4px', minWidth: '20px' }}
              />
            )}
            
            {/* 目标标题和状态 */}
            <Space>
              <Text strong style={{ 
                fontSize: isSubObjective ? '13px' : '14px',
                color: isSubObjective ? '#666' : '#000'
              }}>
                {isSubObjective ? '└ ' : ''}{objective.title}
              </Text>
              <Tag color={okrService.getStatusColor(objective.status)} size="small">
                {okrService.getStatusText(objective.status)}
              </Tag>
            </Space>
          </div>

          {/* 进度和操作按钮 */}
          <Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              进度: {objective.progress}%
            </Text>
            <Progress 
              percent={objective.progress} 
              size="small" 
              style={{ width: '80px' }}
              status={getProgressStatus(objective.progress)}
            />
            {!isSubObjective && (
              <Dropdown
                menu={{ items: getObjectiveMenuItems(objective) }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button 
                  type="text" 
                  icon={<MoreOutlined />} 
                  size="small"
                  style={{ padding: '4px 8px' }}
                />
              </Dropdown>
            )}
          </Space>
        </div>

        {/* 目标描述 */}
        {objective.description && (
          <div style={{ marginBottom: '8px', paddingLeft: isSubObjective ? '0px' : '28px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {objective.description}
            </Text>
          </div>
        )}

        {/* 关键结果列表 */}
        {objective.keyResults && objective.keyResults.length > 0 && (
          <div style={{ paddingLeft: isSubObjective ? '0px' : '28px' }}>
            <Text strong style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>
              关键结果:
            </Text>
            {objective.keyResults.map((kr, index) => (
              <div key={kr.id} style={{ 
                marginBottom: '6px', 
                padding: '6px', 
                background: isSubObjective ? '#f0f0f0' : '#f9f9f9',
                borderRadius: '4px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <Text style={{ fontSize: '11px' }}>
                    KR{index + 1}: {kr.title}
                  </Text>
                  <Space>
                    <Tag 
                      color={okrService.getKRStatusColor(kr.status)}
                      style={{ fontSize: '10px' }}
                    >
                      {okrService.getKRStatusText(kr.status)}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {kr.progress}%
                    </Text>
                  </Space>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Progress 
                    percent={kr.progress} 
                    size="small" 
                    style={{ flex: 1 }}
                    status={getProgressStatus(kr.progress)}
                  />
                  <Text type="secondary" style={{ fontSize: '10px', minWidth: '80px' }}>
                    {kr.currentValue}/{kr.targetValue}{kr.unit}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card 
      style={{ marginTop: '16px', ...style }}
      loading={loading}
      title={
        <Space>
          <TrophyOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>OKR目标管理</Title>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<SettingOutlined />} type="text">设置</Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新增目标
          </Button>
        </Space>
      }
    >
      {/* 季度概览 */}
      <div style={{ 
        marginBottom: '16px', 
        padding: '12px', 
        background: '#fafafa', 
        borderRadius: '6px',
        border: '1px solid #f0f0f0'
      }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="当前季度"
              value={currentQuarter}
              prefix={<CalendarOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总体进度"
              value={stats?.averageProgress?.toFixed(1) || '0.0'}
              suffix="%"
              prefix={<FireOutlined />}
              valueStyle={{ 
                fontSize: '16px',
                color: (stats?.averageProgress || 0) >= 80 ? '#52c41a' : (stats?.averageProgress || 0) >= 50 ? '#1890ff' : '#faad14'
              }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="剩余天数"
              value={getRemainingDays()}
              suffix="天"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="完成目标"
              value={stats?.completedObjectives || 0}
              suffix={`/${stats?.totalObjectives || 0}`}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
        </Row>
      </div>

      {/* 目标列表 - 层级显示 */}
      {objectives && objectives.length > 0 ? (
        <div style={{ marginTop: '16px' }}>
          {organizeObjectivesTree(objectives).map((objective) => (
            <div key={objective.id}>
              {/* 渲染父目标 */}
              {renderObjectiveItem(objective, false)}
              
              {/* 渲染子目标 - 仅在展开时显示 */}
              {objective.isExpanded && objective.subObjectives && objective.subObjectives.map((subObjective) => (
                <div key={subObjective.id}>
                  {renderObjectiveItem(subObjective, true)}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          description="暂无OKR目标"
          style={{ margin: '40px 0' }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建第一个目标
          </Button>
        </Empty>
      )}

      {/* 本周工作贡献总结 */}
      {stats && stats.totalObjectives > 0 && (
        <Alert
          message="本季度工作概览"
          description={
            <div>
              <Text>
                当前有 <Text strong>{stats.totalObjectives}</Text> 个目标在进行中，
                已完成 <Text strong>{stats.completedObjectives}</Text> 个，
                平均进度 <Text strong>{stats.averageProgress?.toFixed(1) || '0.0'}%</Text>
              </Text>
              {stats.atRiskCount > 0 && (
                <>
                  <br />
                  <Text type="warning">
                    ⚠️ 有 <Text strong>{stats.atRiskCount}</Text> 个目标需要关注
                  </Text>
                </>
              )}
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}

      {/* 创建目标弹窗 */}
      <CreateOKRModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          loadOKRData();
        }}
        quarter={currentQuarter}
      />

      {/* 编辑目标弹窗 */}
      {editingObjective && (
        <CreateOKRModal
          visible={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            setEditingObjective(null);
          }}
          onSuccess={() => {
            setEditModalVisible(false);
            setEditingObjective(null);
            loadOKRData();
          }}
          quarter={currentQuarter}
          editData={editingObjective}
          isEdit={true}
        />
      )}
    </Card>
  );
};

export default OKRModule;