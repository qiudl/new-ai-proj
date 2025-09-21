import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Checkbox,
  Select,
  Modal,
  message,
  Tooltip,
  Tag,
  Progress,
  Card,
  Divider,
  Space,
  Typography,
  Alert,
  Spin,
  Empty,
  Timeline,
  Radio,
  Switch
} from 'antd';
import {
  DiffOutlined,
  MergeOutlined,
  RollbackOutlined,
  HistoryOutlined,
  FileTextOutlined,
  SyncOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  versionHistoryService,
  VersionInfo,
  DiffResult,
  DiffStatistics,
  ConflictInfo,
  MergeResult,
  RollbackResult,
  TimelineEvent
} from '../services/versionHistoryService';
import '../styles/VersionHistory.css';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;

// 组件Props接口
interface VersionHistoryProps {
  documentId?: number;
  taskId?: number;
  versions?: VersionInfo[];
  onVersionSelect?: (version: VersionInfo) => void;
  onVersionCompare?: (oldVersion: VersionInfo, newVersion: VersionInfo) => void;
  onVersionMerge?: (result: MergeResult) => void;
  onVersionRollback?: (result: RollbackResult) => void;
}

// 比较模式类型
type CompareMode = 'two-way' | 'three-way';

// 操作类型
type Operation = 'compare' | 'merge' | 'rollback';

const VersionHistory: React.FC<VersionHistoryProps> = ({
  documentId,
  taskId,
  versions: propVersions,
  onVersionSelect,
  onVersionCompare,
  onVersionMerge,
  onVersionRollback
}) => {
  // 状态管理
  const [versions, setVersions] = useState<VersionInfo[]>(propVersions || []);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [currentOperation, setCurrentOperation] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState<CompareMode>('two-way');
  const [compareResult, setCompareResult] = useState<{
    diffs: DiffResult[];
    statistics: DiffStatistics;
    htmlDiff: string;
  } | null>(null);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null);
  const [rollbackOptions, setRollbackOptions] = useState({
    strategy: 'replace' as 'replace' | 'merge' | 'create_new' | 'branch',
    scope: 'full' as 'full' | 'partial' | 'selective',
    validateBefore: true,
    createBackup: true
  });

  // 模态框状态
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [rollbackModalVisible, setRollbackModalVisible] = useState(false);

  // 使用传入的版本数据或空数组
  useEffect(() => {
    if (propVersions && propVersions.length > 0) {
      setVersions(propVersions);
      console.log(`VersionHistory: 接收到 ${propVersions.length} 个版本数据`);
    } else {
      setVersions([]);
      console.log('VersionHistory: 没有接收到版本数据');
    }
  }, [propVersions]);

  // 版本统计信息
  const versionStatistics = useMemo(() => {
    if (versions.length === 0) return null;
    
    try {
      return versionHistoryService.getVersionStatistics(versions);
    } catch (error) {
      return null;
    }
  }, [versions]);

  // 处理版本选择
  const handleVersionSelect = (versionId: number, checked: boolean) => {
    setSelectedVersions(prev => {
      if (checked) {
        const newSelected = [...prev, versionId];
        // 限制最多选择3个版本（用于三方合并）
        return newSelected.slice(-3);
      } else {
        return prev.filter(id => id !== versionId);
      }
    });
  };

  // 获取选中的版本对象
  const getSelectedVersions = useCallback(() => {
    return versions.filter(v => selectedVersions.includes(v.id));
  }, [versions, selectedVersions]);

  // 版本对比
  const handleCompare = useCallback(async () => {
    const selected = getSelectedVersions();
    if (selected.length !== 2) {
      message.warning('请选择两个版本进行对比');
      return;
    }

    setLoading(true);
    setCurrentOperation('compare');

    try {
      const [oldVersion, newVersion] = selected.sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      );

      const result = await versionHistoryService.compareVersions(oldVersion, newVersion);
      setCompareResult(result);
      setCompareModalVisible(true);

      onVersionCompare?.(oldVersion, newVersion);
      message.success('版本对比完成');
    } catch (error) {
      message.error('版本对比失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
      setCurrentOperation(null);
    }
  }, [getSelectedVersions, onVersionCompare]);

  // 版本合并
  const handleMerge = useCallback(async () => {
    const selected = getSelectedVersions();
    if (selected.length !== 3) {
      message.warning('请选择三个版本进行合并（基础版本、源版本、目标版本）');
      return;
    }

    setLoading(true);
    setCurrentOperation('merge');

    try {
      const sortedVersions = selected.sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      );
      const [baseVersion, sourceVersion, targetVersion] = sortedVersions;

      const result = await versionHistoryService.mergeVersions(
        baseVersion,
        sourceVersion,
        targetVersion
      );
      
      setMergeResult(result);
      setMergeModalVisible(true);

      onVersionMerge?.(result);
      
      if (result.success) {
        message.success('版本合并成功');
      } else {
        message.warning(`版本合并完成，但存在 ${result.conflicts.length} 个冲突需要手动解决`);
      }
    } catch (error) {
      message.error('版本合并失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
      setCurrentOperation(null);
    }
  }, [getSelectedVersions, onVersionMerge]);

  // 版本回滚
  const handleRollback = useCallback(async () => {
    const selected = getSelectedVersions();
    if (selected.length !== 2) {
      message.warning('请选择两个版本（当前版本和目标版本）进行回滚');
      return;
    }

    setLoading(true);
    setCurrentOperation('rollback');

    try {
      const [fromVersion, toVersion] = selected.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );

      const result = await versionHistoryService.rollbackVersion(
        fromVersion,
        toVersion,
        rollbackOptions
      );
      
      setRollbackResult(result);
      setRollbackModalVisible(true);

      onVersionRollback?.(result);
      
      if (result.success) {
        message.success('版本回滚成功');
      } else {
        message.error('版本回滚失败');
      }
    } catch (error) {
      message.error('版本回滚失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
      setCurrentOperation(null);
    }
  }, [getSelectedVersions, rollbackOptions, onVersionRollback]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取用户名（模拟）
  const getUserName = (userId: number): string => {
    const users: Record<number, string> = {
      1: '张三',
      2: '李四',
      3: '王五'
    };
    return users[userId] || '未知用户';
  };

  // 渲染版本统计信息
  const renderStatistics = () => {
    if (!versionStatistics) return null;

    return (
      <div className="version-statistics fade-in">
        <div className="stat-card">
          <div className="stat-value">{versionStatistics.totalVersions}</div>
          <div className="stat-label">版本总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatFileSize(versionStatistics.totalSize)}</div>
          <div className="stat-label">总大小</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatFileSize(versionStatistics.averageSize)}</div>
          <div className="stat-label">平均大小</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {versionStatistics.sizeGrowth > 0 ? '+' : ''}
            {formatFileSize(versionStatistics.sizeGrowth)}
          </div>
          <div className="stat-label">大小增长</div>
          <div className={`stat-change ${versionStatistics.sizeGrowth >= 0 ? 'positive' : 'negative'}`}>
            {versionStatistics.sizeGrowth >= 0 ? '↗' : '↘'} 
            {((versionStatistics.sizeGrowth / versionStatistics.oldestVersion.size) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    );
  };

  // 渲染版本列表
  const renderVersionList = () => {
    if (versions.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <div className="empty-title">暂无版本历史</div>
          <div className="empty-description">还没有任何版本记录</div>
        </div>
      );
    }

    return (
      <div className="version-list">
        {versions.map((version, index) => {
          const isSelected = selectedVersions.includes(version.id);
          const isCurrent = index === versions.length - 1;
          
          return (
            <div
              key={version.id}
              className={`version-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''} slide-in`}
              onClick={() => onVersionSelect?.(version)}
            >
              <Checkbox
                className="version-checkbox"
                checked={isSelected}
                onChange={(e) => handleVersionSelect(version.id, e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
              
              <div className="version-info">
                <div className="version-number">
                  {version.versionNumber}
                  {isCurrent && (
                    <Tag color="green" style={{ marginLeft: 8, fontSize: '11px', padding: '1px 6px' }}>
                      当前版本
                    </Tag>
                  )}
                </div>
                
                <div className="version-meta">
                  <span>👤 {getUserName(version.createdBy)}</span>
                  <span>🕒 {dayjs(version.createdAt).fromNow()}</span>
                  <span className="version-size">📊 {formatFileSize(version.size)}</span>
                </div>
                
                {version.description && (
                  <div className="version-description">{version.description}</div>
                )}
              </div>
              
              <div className="version-actions">
                <Tooltip title="查看内容">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      // 这里可以打开预览模态框
                    }}
                  />
                </Tooltip>
                <Tooltip title="编辑">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      // 这里可以打开编辑界面
                    }}
                  />
                </Tooltip>
                <Tooltip title="下载">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<DownloadOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      // 这里可以下载版本内容
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染差异对比结果
  const renderDiffResult = () => {
    if (!compareResult) return null;

    const { diffs, statistics } = compareResult;

    return (
      <div className="diff-viewer fade-in">
        <div className="diff-header">
          <div className="diff-title">版本差异对比</div>
          <div className="diff-stats">
            <div className="diff-stat added">
              <span>+{statistics.addedLines}</span>
            </div>
            <div className="diff-stat deleted">
              <span>-{statistics.deletedLines}</span>
            </div>
            <div className="diff-stat modified">
              <span>~{statistics.modifiedLines}</span>
            </div>
            <div className="diff-stat unchanged">
              <span>={statistics.unchangedLines}</span>
            </div>
          </div>
        </div>
        
        <div className="diff-container">
          {diffs.map((diff, index) => (
            <div key={index} className={`diff-line ${diff.type}`} data-line={diff.lineNumber}>
              <span className="line-number">
                {diff.type === 'added' ? '+' : diff.type === 'deleted' ? '-' : ''}
                {diff.lineNumber}
              </span>
              <span className="line-content">
                {diff.type === 'modified' ? (
                  <div>
                    <div className="old-content">{diff.oldContent}</div>
                    <div className="new-content">{diff.newContent}</div>
                  </div>
                ) : (
                  diff.content
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染合并冲突
  const renderMergeConflicts = () => {
    if (!mergeResult || mergeResult.conflicts.length === 0) return null;

    return (
      <div className="merge-conflict-container fade-in">
        <Title level={4}>合并冲突 ({mergeResult.conflicts.length})</Title>
        
        {mergeResult.conflicts.map((conflict, index) => (
          <div key={index} className="conflict-item">
            <div className="conflict-header">
              <div className="conflict-title">{conflict.description}</div>
              <div className={`conflict-severity ${conflict.severity}`}>
                {conflict.severity === 'low' ? '低风险' : 
                 conflict.severity === 'medium' ? '中风险' : '高风险'}
              </div>
            </div>
            
            <div className="conflict-content">
              <div className="conflict-version base">
                <div className="conflict-version-label">Base (基础版本)</div>
                <div>{conflict.baseContent}</div>
              </div>
              <div className="conflict-version source">
                <div className="conflict-version-label">Source (源版本)</div>
                <div>{conflict.sourceContent}</div>
              </div>
              <div className="conflict-version target">
                <div className="conflict-version-label">Target (目标版本)</div>
                <div>{conflict.targetContent}</div>
              </div>
            </div>
            
            {conflict.suggestedResolution && (
              <div className="conflict-resolution">
                <div className="resolution-label">建议解决方案</div>
                <div>{conflict.suggestedResolution}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 渲染回滚时间线
  const renderRollbackTimeline = () => {
    if (!rollbackResult || rollbackResult.timeline.length === 0) return null;

    return (
      <div className="rollback-timeline fade-in">
        <Title level={4}>回滚操作时间线</Title>
        <Timeline>
          {rollbackResult.timeline.map((event, index) => (
            <Timeline.Item key={index}>
              <div className="timeline-item">
                <div className="timeline-time">
                  {dayjs(event.timestamp).format('HH:mm:ss')}
                </div>
                <div className="timeline-event">{event.event}</div>
                <div className="timeline-details">{event.details}</div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
        
        {rollbackResult.warnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="回滚警告"
            description={
              <ul>
                {rollbackResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            }
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="version-history-container">
      {/* 标题和操作区域 */}
      <div className="version-history-header">
        <Title level={3} className="version-history-title">
          <HistoryOutlined /> 版本历史
        </Title>
        
        <div className="version-history-actions">
          <Select
            value={compareMode}
            onChange={setCompareMode}
            style={{ width: 120 }}
            size="small"
          >
            <Option value="two-way">双向对比</Option>
            <Option value="three-way">三方合并</Option>
          </Select>
          
          <Button
            type="primary"
            icon={<DiffOutlined />}
            onClick={handleCompare}
            disabled={selectedVersions.length !== 2 || loading}
            loading={loading && currentOperation === 'compare'}
            size="small"
          >
            对比版本
          </Button>
          
          <Button
            icon={<MergeOutlined />}
            onClick={handleMerge}
            disabled={selectedVersions.length !== 3 || loading}
            loading={loading && currentOperation === 'merge'}
            size="small"
          >
            合并版本
          </Button>
          
          <Button
            icon={<RollbackOutlined />}
            onClick={() => setRollbackModalVisible(true)}
            disabled={selectedVersions.length !== 2 || loading}
            danger
            size="small"
          >
            版本回滚
          </Button>
          
          <Button
            icon={<SyncOutlined />}
            onClick={() => {
              setSelectedVersions([]);
              versionHistoryService.clearCache();
              message.success('已清除选择和缓存');
            }}
            size="small"
          >
            重置
          </Button>
        </div>
      </div>

      {/* 版本统计信息 */}
      {renderStatistics()}

      {/* 选择提示 */}
      {selectedVersions.length > 0 && (
        <Alert
          message={`已选择 ${selectedVersions.length} 个版本`}
          description={
            compareMode === 'two-way' 
              ? '请选择2个版本进行对比，或选择3个版本进行三方合并'
              : '请选择3个版本进行三方合并（基础版本、源版本、目标版本）'
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 版本列表 */}
      {renderVersionList()}

      {/* 版本对比模态框 */}
      <Modal
        title="版本对比结果"
        open={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        width="90%"
        style={{ maxWidth: 1200 }}
        footer={[
          <Button key="close" onClick={() => setCompareModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {renderDiffResult()}
      </Modal>

      {/* 版本合并模态框 */}
      <Modal
        title="版本合并结果"
        open={mergeModalVisible}
        onCancel={() => setMergeModalVisible(false)}
        width="90%"
        style={{ maxWidth: 1200 }}
        footer={[
          <Button key="close" onClick={() => setMergeModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {mergeResult && (
          <div>
            <Alert
              type={mergeResult.success ? 'success' : 'warning'}
              showIcon
              message={mergeResult.success ? '合并成功' : '合并完成，存在冲突'}
              description={
                <div>
                  <p>处理时间: {mergeResult.statistics.processingTime}ms</p>
                  <p>
                    冲突统计: 总计 {mergeResult.statistics.totalConflicts} 个冲突，
                    自动解决 {mergeResult.statistics.autoResolvedConflicts} 个，
                    需要手动解决 {mergeResult.statistics.manualResolvedConflicts} 个
                  </p>
                </div>
              }
              style={{ marginBottom: 16 }}
            />
            
            {mergeResult.suggestions.length > 0 && (
              <Alert
                type="info"
                showIcon
                message="合并建议"
                description={
                  <ul>
                    {mergeResult.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                }
                style={{ marginBottom: 16 }}
              />
            )}
            
            {renderMergeConflicts()}
          </div>
        )}
      </Modal>

      {/* 版本回滚模态框 */}
      <Modal
        title="版本回滚"
        open={rollbackModalVisible}
        onCancel={() => setRollbackModalVisible(false)}
        width="80%"
        style={{ maxWidth: 800 }}
        footer={[
          <Button key="cancel" onClick={() => setRollbackModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="rollback"
            type="primary"
            danger
            onClick={handleRollback}
            loading={loading && currentOperation === 'rollback'}
          >
            确认回滚
          </Button>
        ]}
      >
        <div className="rollback-container">
          <div className="rollback-header">
            <div className="rollback-title">版本回滚设置</div>
            <div className="rollback-description">
              请选择回滚策略和作用域，回滚操作将会影响文档内容，请谨慎操作。
            </div>
          </div>
          
          <div className="rollback-options">
            <div className="rollback-strategy">
              <div className="option-label">回滚策略</div>
              <Radio.Group
                value={rollbackOptions.strategy}
                onChange={(e) => setRollbackOptions(prev => ({
                  ...prev,
                  strategy: e.target.value
                }))}
              >
                <Space direction="vertical">
                  <Radio value="replace">替换策略 - 完全替换为目标版本</Radio>
                  <Radio value="merge">合并策略 - 智能合并版本内容</Radio>
                  <Radio value="create_new">新建策略 - 创建新版本保留历史</Radio>
                  <Radio value="branch">分支策略 - 创建分支版本</Radio>
                </Space>
              </Radio.Group>
            </div>
            
            <div className="rollback-scope">
              <div className="option-label">回滚作用域</div>
              <Radio.Group
                value={rollbackOptions.scope}
                onChange={(e) => setRollbackOptions(prev => ({
                  ...prev,
                  scope: e.target.value
                }))}
              >
                <Space direction="vertical">
                  <Radio value="full">完整回滚 - 回滚整个文档</Radio>
                  <Radio value="partial">部分回滚 - 回滚指定区域</Radio>
                  <Radio value="selective">选择性回滚 - 回滚特定变更</Radio>
                </Space>
              </Radio.Group>
            </div>
          </div>
          
          <Divider />
          
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>回滚前验证</span>
              <Switch
                checked={rollbackOptions.validateBefore}
                onChange={(checked) => setRollbackOptions(prev => ({
                  ...prev,
                  validateBefore: checked
                }))}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>创建备份</span>
              <Switch
                checked={rollbackOptions.createBackup}
                onChange={(checked) => setRollbackOptions(prev => ({
                  ...prev,
                  createBackup: checked
                }))}
              />
            </div>
          </Space>
          
          {rollbackResult && renderRollbackTimeline()}
        </div>
      </Modal>
    </div>
  );
};

export default VersionHistory;