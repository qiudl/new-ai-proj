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
import '../styles/OKRModule.css';
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
  DownOutlined,
  SaveOutlined,
  CloseOutlined
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
  const [expandedKeyResults, setExpandedKeyResults] = useState<Record<number, boolean>>({});
  const [editingKeyResult, setEditingKeyResult] = useState<number | null>(null);
  const [editingKRValue, setEditingKRValue] = useState<number>(0);

  const currentQuarter = quarter || okrService.getCurrentQuarter();

  useEffect(() => {
    loadOKRData();
  }, [currentQuarter]);

  const loadOKRData = async () => {
    console.log('🔥 [loadOKRData] Start loading data for quarter:', currentQuarter);
    setLoading(true);
    try {
      const [objectivesData, statsData] = await Promise.all([
        okrService.getObjectives(currentQuarter),
        okrService.getOKRStats(currentQuarter)
      ]);
      
      console.log('🔥 [loadOKRData] API responses received - objectives:', objectivesData.objectives?.length, 'stats:', statsData);
      console.log('🔥 [loadOKRData] Raw objectives data:', JSON.stringify(objectivesData.objectives, null, 2));
      
      const newObjectives = objectivesData.objectives || [];
      console.log('🔥 [loadOKRData] Setting new objectives:', newObjectives.length);
      setObjectives(newObjectives);
      setStats(statsData);
      
      // initialize KR edits map
      const init: Record<number, number> = {};
      for (const obj of objectivesData.objectives || []) {
        for (const kr of obj.keyResults || []) {
          init[kr.id] = kr.currentValue;
          console.log('🔥 [loadOKRData] KR init - id:', kr.id, 'currentValue:', kr.currentValue, 'progress:', kr.progress, 'status:', kr.status);
        }
      }
      setKrEdits(init);
      
      console.log('🔥 [loadOKRData] State updated - objectives count:', objectivesData.objectives?.length);
    } catch (error) {
      console.error('Failed to load OKR data:', error);
      message.error('加载OKR数据失败');
      
      // Set empty data to avoid UI crashes
      setObjectives([]);
      setStats({
        totalObjectives: 0,
        completedObjectives: 0,
        averageProgress: 0,
        atRiskCount: 0,
        quarter: currentQuarter,
        remainingDays: 0
      });
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

    // 注意：不再生成模拟子目标，使用实际的数据结构

    return rootObjectives;
  };

  // 切换目标展开/收起状态
  const toggleObjectiveExpansion = (objectiveId: number) => {
    setExpandedObjectives(prev => ({
      ...prev,
      [objectiveId]: !prev[objectiveId]
    }));
  };

  // 切换关键结果展开/收起状态
  const toggleKeyResultExpansion = (krId: number) => {
    setExpandedKeyResults(prev => ({
      ...prev,
      [krId]: !prev[krId]
    }));
  };

  // 开始编辑关键结果
  const startEditingKeyResult = (krId: number, currentValue: number) => {
    console.log('🔥 [startEditingKeyResult] Starting edit - krId:', krId, 'currentValue:', currentValue);
    setEditingKeyResult(krId);
    setEditingKRValue(currentValue);
  };

  // 保存关键结果进度
  const saveKeyResultProgress = async (krId: number, objectiveId: number) => {
    try {
      console.log('🔥 [saveKeyResultProgress] Start - krId:', krId, 'objectiveId:', objectiveId, 'editingKRValue:', editingKRValue);
      
      // 找到当前的关键结果以获取targetValue
      const currentKR = objectives
        .flatMap(obj => obj.keyResults || [])
        .find(kr => kr.id === krId);
      
      console.log('🔥 [saveKeyResultProgress] Current KR found:', currentKR);
      
      if (!currentKR) {
        throw new Error(`Key result with ID ${krId} not found`);
      }
      
      // 计算进度百分比
      const progress = Math.round((editingKRValue / currentKR.targetValue) * 100);
      
      // 根据进度确定状态
      let status: 'not_started' | 'in_progress' | 'completed' | 'at_risk' = 'not_started';
      if (progress >= 100) {
        status = 'completed';
      } else if (progress > 0) {
        status = 'in_progress';
      }
      
      const updateData = {
        currentValue: editingKRValue,
        progress: progress,
        status: status
      };
      
      console.log('🔥 [saveKeyResultProgress] Update data:', updateData);
      
      const result = await okrService.updateKeyResult(krId, updateData);
      console.log('🔥 [saveKeyResultProgress] API response:', result);
      
      // Update the state directly for immediate UI update
      setObjectives(prevObjectives => {
        return prevObjectives.map(obj => ({
          ...obj,
          keyResults: (obj.keyResults || []).map(kr => {
            if (kr.id === krId) {
              console.log('🔥 [saveKeyResultProgress] Updating KR in state:', {
                id: kr.id,
                oldCurrentValue: kr.currentValue,
                newCurrentValue: editingKRValue,
                oldProgress: kr.progress,
                newProgress: progress,
                oldStatus: kr.status,
                newStatus: status
              });
              return {
                ...kr,
                currentValue: editingKRValue,
                progress: progress,
                status: status
              };
            }
            return kr;
          })
        }));
      });
      
      // Also update the krEdits state
      setKrEdits(prev => ({
        ...prev,
        [krId]: editingKRValue
      }));
      
      message.success('关键结果进度更新成功');
      
      // Still reload data to ensure consistency
      console.log('🔥 [saveKeyResultProgress] Before loadOKRData - current objectives count:', objectives.length);
      await loadOKRData();
      console.log('🔥 [saveKeyResultProgress] After loadOKRData - objectives count:', objectives.length);
      
      setEditingKeyResult(null);
    } catch (error) {
      console.error('Failed to update key result:', error);
      message.error('更新关键结果进度失败: ' + (error as any)?.message || 'Unknown error');
    }
  };

  // 取消编辑关键结果
  const cancelEditingKeyResult = () => {
    console.log('🔥 [cancelEditingKeyResult] Cancelling edit');
    setEditingKeyResult(null);
    setEditingKRValue(0);
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
      <div key={objective.id} style={objectiveStyle} className="okr-objective-item">
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
                className="okr-expand-arrow"
                title={isExpanded ? '收起子目标' : '展开子目标'}
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
              <Tag color={okrService.getStatusColor(objective.status)}>
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
            {objective.keyResults.map((kr, index) => {
              const isKRExpanded = expandedKeyResults[kr.id];
              const isEditing = editingKeyResult === kr.id;
              
              return (
                <div key={kr.id} style={{ 
                  marginBottom: '6px', 
                  padding: '8px', 
                  background: isSubObjective ? '#f0f0f0' : '#f9f9f9',
                  borderRadius: '4px',
                  border: isEditing ? '1px solid #1890ff' : '1px solid transparent'
                }}>
                  {/* KR标题行 - 带展开/收起箭头 */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: isKRExpanded ? '8px' : '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                      {/* 展开/收起箭头 */}
                      <Button
                        type="text"
                        size="small"
                        icon={isKRExpanded ? <DownOutlined /> : <RightOutlined />}
                        onClick={() => toggleKeyResultExpansion(kr.id)}
                        style={{ 
                          padding: '0px 4px', 
                          minWidth: '16px',
                          fontSize: '10px'
                        }}
                        title={isKRExpanded ? '收起关键结果详情' : '展开关键结果详情'}
                      />
                      
                      <Text style={{ fontSize: '11px', flex: 1 }}>
                        KR{index + 1}: {kr.title}
                      </Text>
                    </div>
                    
                    <Space size="small">
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

                  {/* 简化进度条 - 始终显示 */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    paddingLeft: '22px' // 对齐箭头缩进
                  }}>
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

                  {/* 展开的详细信息和编辑功能 */}
                  {isKRExpanded && (
                    <div style={{ 
                      paddingLeft: '22px', // 对齐箭头缩进
                      marginTop: '8px',
                      padding: '8px',
                      background: isSubObjective ? '#e8e8e8' : '#f0f0f0',
                      borderRadius: '4px'
                    }}>
                      {/* KR描述 */}
                      {kr.description && (
                        <div style={{ marginBottom: '8px' }}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {kr.description}
                          </Text>
                        </div>
                      )}
                      
                      {/* 进度更新区域 */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '6px',
                        background: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #e8e8e8'
                      }}>
                        <Text style={{ fontSize: '11px', minWidth: '60px' }}>
                          当前进度:
                        </Text>
                        
                        {isEditing ? (
                          // 编辑模式
                          <>
                            <InputNumber
                              size="small"
                              value={editingKRValue}
                              onChange={(value) => {
                                console.log('🔥 [InputNumber] Value changed:', value);
                                setEditingKRValue(value || 0);
                              }}
                              min={0}
                              max={kr.targetValue}
                              style={{ width: '80px' }}
                              precision={kr.unit === '%' ? 0 : 2}
                            />
                            <Text style={{ fontSize: '11px' }}>
                              / {kr.targetValue}{kr.unit}
                            </Text>
                            <Button
                              type="primary"
                              size="small"
                              icon={<SaveOutlined />}
                              onClick={() => {
                                console.log('🔥 [Save Button] Clicked - krId:', kr.id, 'objectiveId:', objective.id, 'editingKRValue:', editingKRValue);
                                saveKeyResultProgress(kr.id, objective.id);
                              }}
                              style={{ marginLeft: 'auto' }}
                            >
                              保存
                            </Button>
                            <Button
                              size="small"
                              icon={<CloseOutlined />}
                              onClick={cancelEditingKeyResult}
                            >
                              取消
                            </Button>
                          </>
                        ) : (
                          // 显示模式
                          <>
                            <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>
                              {kr.currentValue} / {kr.targetValue}{kr.unit}
                            </Text>
                            <Button
                              type="link"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => startEditingKeyResult(kr.id, kr.currentValue)}
                              style={{ 
                                marginLeft: 'auto',
                                fontSize: '10px',
                                padding: '0 4px'
                              }}
                            >
                              更新进度
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* 目标列表 - 层级显示，带滚动条 */}
      {objectives && objectives.length > 0 ? (
        <div 
          style={{ 
            marginTop: '16px',
            maxHeight: '400px',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '4px'
          }}
          className="okr-objectives-scroll"
        >
          {organizeObjectivesTree(objectives).map((objective) => (
            <div key={objective.id}>
              {/* 渲染父目标 */}
              {renderObjectiveItem(objective, false)}
              
              {/* 渲染子目标 - 仅在展开时显示 */}
              {objective.isExpanded && objective.subObjectives && (
                <div className="okr-sub-objectives">
                  {objective.subObjectives.map((subObjective) => (
                    <div key={subObjective.id}>
                      {renderObjectiveItem(subObjective, true)}
                    </div>
                  ))}
                </div>
              )}
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