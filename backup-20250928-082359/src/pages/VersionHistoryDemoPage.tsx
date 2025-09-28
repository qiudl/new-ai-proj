import React from 'react';
import { Card, Typography, Space, Divider } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import VersionHistory from '../components/VersionHistory';

const { Title, Paragraph } = Typography;

const VersionHistoryDemoPage: React.FC = () => {
  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* 页面标题 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={1} style={{ color: '#262626', marginBottom: 16 }}>
            <HistoryOutlined style={{ marginRight: 8 }} />
            版本历史系统演示
          </Title>
          <Paragraph style={{ fontSize: 16, color: '#666', maxWidth: 800, margin: '0 auto' }}>
            这是一个功能完整的版本历史管理系统，支持版本对比、智能合并和版本回滚功能。
            基于 Myers 差异算法和智能三方合并算法，提供高效、准确的版本管理体验。
          </Paragraph>
        </div>

        {/* 功能介绍卡片 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: 16 
          }}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <Title level={4} style={{ margin: '8px 0' }}>智能对比</Title>
              <Paragraph style={{ color: '#666', margin: 0 }}>
                基于Myers算法的高效差异计算，支持行级别的精确对比，清晰展示版本间的变更内容。
              </Paragraph>
            </Card>

            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
              <Title level={4} style={{ margin: '8px 0' }}>三方合并</Title>
              <Paragraph style={{ color: '#666', margin: 0 }}>
                智能三方合并算法，自动检测和解决冲突，提供冲突解决建议，简化合并流程。
              </Paragraph>
            </Card>

            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏪</div>
              <Title level={4} style={{ margin: '8px 0' }}>版本回滚</Title>
              <Paragraph style={{ color: '#666', margin: 0 }}>
                多种回滚策略支持，包括替换、合并、新建和分支，灵活满足不同的回滚需求。
              </Paragraph>
            </Card>

            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <Title level={4} style={{ margin: '8px 0' }}>统计分析</Title>
              <Paragraph style={{ color: '#666', margin: 0 }}>
                详细的版本统计信息，包括版本数量、大小变化、操作时间线等数据分析。
              </Paragraph>
            </Card>
          </div>
        </div>

        <Divider>
          <Title level={3} style={{ margin: 0 }}>系统演示</Title>
        </Divider>

        {/* 版本历史组件演示 */}
        <Card style={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <VersionHistory />
        </Card>

        {/* 技术说明 */}
        <Card 
          title="🛠 技术架构" 
          style={{ marginTop: 24, borderRadius: 8 }}
          size="small"
        >
          <div style={{ color: '#666', fontSize: 14, lineHeight: 1.8 }}>
            <div style={{ marginBottom: 20 }}>
              <Title level={4} style={{ margin: '0 0 12px 0', color: '#262626', fontSize: 16 }}>
                核心算法
              </Title>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <strong>Myers 差异算法</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    <li>基于动态规划的高效diff计算</li>
                    <li>支持早期终止优化</li>
                    <li>分块处理大型文档</li>
                    <li>行级别精确定位变更</li>
                  </ul>
                </div>
                <div>
                  <strong>三方合并算法</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    <li>智能冲突检测和分析</li>
                    <li>自动解决简单冲突</li>
                    <li>提供冲突解决建议</li>
                    <li>支持手动干预处理</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <Title level={4} style={{ margin: '0 0 12px 0', color: '#262626', fontSize: 16 }}>
                性能优化
              </Title>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <strong>缓存机制</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    <li>LRU缓存策略</li>
                    <li>差异结果缓存</li>
                    <li>操作结果缓存</li>
                    <li>TTL过期管理</li>
                  </ul>
                </div>
                <div>
                  <strong>内存管理</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    <li>流式处理大文档</li>
                    <li>智能内存监控</li>
                    <li>垃圾回收优化</li>
                    <li>分块处理策略</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <Title level={4} style={{ margin: '0 0 12px 0', color: '#262626', fontSize: 16 }}>
                用户体验
              </Title>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <strong>界面设计</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    <li>直观的差异可视化</li>
                    <li>响应式布局设计</li>
                    <li>流畅的动画效果</li>
                    <li>无障碍访问支持</li>
                  </ul>
                </div>
                <div>
                  <strong>操作体验</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    <li>简化的操作流程</li>
                    <li>实时操作反馈</li>
                    <li>详细的帮助说明</li>
                    <li>错误处理提示</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 使用统计 */}
        <Card 
          title="📈 系统特性" 
          style={{ marginTop: 24, borderRadius: 8 }}
          size="small"
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16,
            textAlign: 'center' 
          }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#1890ff', marginBottom: 8 }}>
                70%+
              </div>
              <div style={{ color: '#666' }}>处理速度提升</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#52c41a', marginBottom: 8 }}>
                95%+
              </div>
              <div style={{ color: '#666' }}>自动合并成功率</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#faad14', marginBottom: 8 }}>
                80%+
              </div>
              <div style={{ color: '#666' }}>缓存命中率</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#722ed1', marginBottom: 8 }}>
                10万+
              </div>
              <div style={{ color: '#666' }}>支持文档行数</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VersionHistoryDemoPage;