import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, Breadcrumb, message, Button, Space } from 'antd';
import { HomeOutlined, FileTextOutlined, HistoryOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import VersionHistory from '../components/VersionHistory';
import { VersionInfo, MergeResult, RollbackResult } from '../services/versionHistoryService';

const VersionHistoryPage: React.FC = () => {
  const { documentId, taskId } = useParams<{
    documentId?: string;
    taskId?: string;
  }>();
  const [searchParams] = useSearchParams();
  
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟加载文档信息
    const loadDocumentInfo = async () => {
      try {
        setLoading(true);
        
        // 这里应该从API获取文档信息
        // const response = await api.getDocument(documentId);
        // setDocumentTitle(response.title);
        
        // 模拟数据
        if (documentId) {
          setDocumentTitle(`文档 #${documentId} - 项目需求文档`);
        } else if (taskId) {
          setDocumentTitle(`任务 #${taskId} - 相关文档`);
        } else {
          setDocumentTitle('版本历史记录');
        }
      } catch (error) {
        message.error('加载文档信息失败');
      } finally {
        setLoading(false);
      }
    };

    loadDocumentInfo();
  }, [documentId, taskId]);

  // 处理版本选择
  const handleVersionSelect = (version: VersionInfo) => {
    console.log('选中版本:', version);
    // 这里可以处理版本选择逻辑，比如预览版本内容
  };

  // 处理版本对比
  const handleVersionCompare = (oldVersion: VersionInfo, newVersion: VersionInfo) => {
    console.log('对比版本:', oldVersion, newVersion);
    message.success(`正在对比版本 ${oldVersion.versionNumber} 和 ${newVersion.versionNumber}`);
    // 这里可以记录用户操作日志或发送统计信息
  };

  // 处理版本合并
  const handleVersionMerge = (result: MergeResult) => {
    console.log('合并结果:', result);
    if (result.success) {
      message.success('版本合并完成，无冲突');
    } else {
      message.warning(`版本合并完成，存在 ${result.conflicts.length} 个冲突需要解决`);
    }
    // 这里可以保存合并结果或更新文档
  };

  // 处理版本回滚
  const handleVersionRollback = (result: RollbackResult) => {
    console.log('回滚结果:', result);
    if (result.success) {
      message.success(`版本已成功回滚到 ${result.toVersion}`);
    } else {
      message.error('版本回滚失败');
    }
    // 这里可以刷新页面数据或更新文档状态
  };

  const goBack = () => {
    if (documentId) {
      // 返回文档详情页
      window.history.back();
    } else if (taskId) {
      // 返回任务详情页
      window.history.back();
    } else {
      // 返回首页
      window.history.back();
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* 面包屑导航 */}
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            {
              href: '/dashboard',
              title: (
                <>
                  <HomeOutlined />
                  <span>首页</span>
                </>
              )
            },
            ...(taskId ? [{
              href: `/tasks/${taskId}`,
              title: (
                <>
                  <FileTextOutlined />
                  <span>任务详情</span>
                </>
              )
            }] : []),
            ...(documentId ? [{
              href: `/documents/${documentId}`,
              title: (
                <>
                  <FileTextOutlined />
                  <span>文档</span>
                </>
              )
            }] : []),
            {
              title: (
                <>
                  <HistoryOutlined />
                  <span>版本历史</span>
                </>
              )
            }
          ]}
        />

        {/* 页面标题和操作 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 24 
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
              📚 {documentTitle}
            </h1>
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: 14 }}>
              查看和管理文档的版本历史记录
            </p>
          </div>
          
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={goBack}
            >
              返回
            </Button>
          </Space>
        </div>

        {/* 版本历史组件 */}
        <Card 
          style={{ 
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
          }}
          loading={loading}
        >
          <VersionHistory
            documentId={documentId ? parseInt(documentId) : undefined}
            taskId={taskId ? parseInt(taskId) : undefined}
            onVersionSelect={handleVersionSelect}
            onVersionCompare={handleVersionCompare}
            onVersionMerge={handleVersionMerge}
            onVersionRollback={handleVersionRollback}
          />
        </Card>

        {/* 使用说明 */}
        <Card 
          title="💡 使用说明"
          style={{ 
            marginTop: 24,
            borderRadius: 8 
          }}
          size="small"
        >
          <div style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#262626' }}>功能说明</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li><strong>版本对比</strong>：选择2个版本进行差异对比，查看具体的变更内容</li>
              <li><strong>三方合并</strong>：选择3个版本进行智能合并，自动解决简单冲突</li>
              <li><strong>版本回滚</strong>：选择2个版本进行回滚操作，支持多种回滚策略</li>
              <li><strong>版本统计</strong>：查看版本数量、大小变化等统计信息</li>
            </ul>
            
            <h4 style={{ margin: '16px 0 12px 0', color: '#262626' }}>操作提示</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>点击版本前的复选框选择要操作的版本</li>
              <li>最多可以选择3个版本进行操作</li>
              <li>绿色标签表示当前最新版本</li>
              <li>悬停版本项可以看到更多操作按钮</li>
              <li>回滚操作会影响文档内容，请谨慎操作</li>
            </ul>

            <h4 style={{ margin: '16px 0 12px 0', color: '#262626' }}>技术特性</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>基于 Myers 差异算法的高效版本对比</li>
              <li>智能三方合并算法，自动解决冲突</li>
              <li>多种回滚策略：替换、合并、新建、分支</li>
              <li>缓存优化，提升大文档处理性能</li>
              <li>详细的操作时间线和结果统计</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VersionHistoryPage;