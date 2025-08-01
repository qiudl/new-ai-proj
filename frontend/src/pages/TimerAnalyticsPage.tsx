import React, { useState } from 'react';
import { Card, Tabs, Typography, Space, Button, message } from 'antd';
import { BarChartOutlined, HistoryOutlined, DownloadOutlined, FileExcelOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import TimerHistoryList from '../components/TimerHistoryList';
import TimerAnalyticsCharts from '../components/TimerAnalyticsCharts';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import useKeyboardShortcuts, { createTimerShortcuts } from '../hooks/useKeyboardShortcuts';
import '../styles/personal-timer.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const TimerAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');
  const [timeRange, setTimeRange] = useState('7days');
  const [exporting, setExporting] = useState(false);
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);

  // 导出分析报告
  const handleExportReport = async () => {
    try {
      setExporting(true);
      
      // 模拟报告生成
      const reportData = {
        period: timeRange,
        generatedAt: new Date().toISOString(),
        summary: {
          totalTime: '18h 30m',
          totalSessions: 32,
          averageSession: '34m',
          mostProductiveDay: '周四',
          topCategory: '学习'
        },
        categories: [
          { name: '学习', time: '7h 20m', percentage: 40 },
          { name: '工作', time: '5h 30m', percentage: 30 },
          { name: '个人', time: '3h 40m', percentage: 20 },
          { name: '健身', time: '1h 50m', percentage: 10 }
        ]
      };

      // 生成CSV格式报告
      const csvContent = [
        ['计时分析报告'],
        [`生成时间: ${new Date().toLocaleString()}`],
        [`时间范围: ${timeRange === '7days' ? '最近7天' : timeRange === '30days' ? '最近30天' : '最近3个月'}`],
        [''],
        ['统计摘要'],
        ['指标', '数值'],
        ['总计时', reportData.summary.totalTime],
        ['总会话数', reportData.summary.totalSessions.toString()],
        ['平均会话时长', reportData.summary.averageSession],
        ['最高效日期', reportData.summary.mostProductiveDay],
        ['主要分类', reportData.summary.topCategory],
        [''],
        ['分类详情'],
        ['分类', '时长', '占比'],
        ...reportData.categories.map(cat => [cat.name, cat.time, `${cat.percentage}%`])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `timer-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      
      message.success('分析报告导出成功');
    } catch (error) {
      message.error('导出失败，请重试');
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  // 键盘快捷键配置
  const shortcuts = createTimerShortcuts({
    openTaskList: () => {
      navigate('/personal-timer');
    },
    openAnalytics: () => {
      setActiveTab('analytics');
    },
    openHistory: () => {
      setActiveTab('history');
    },
    showHelp: () => {
      setShortcutsHelpVisible(true);
    },
    quickSave: () => {
      handleExportReport();
    }
  });

  const { getShortcutsHelp } = useKeyboardShortcuts(shortcuts);

  return (
    <div className="personal-timer-page" style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={2} className="page-title" style={{ margin: 0 }}>
              <BarChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              计时分析与报告
            </Title>
            <Text type="secondary" className="page-subtitle">
              深入分析您的计时数据，发现工作模式和效率趋势
            </Text>
          </div>
          
          {/* 右侧快捷操作按钮 */}
          <Space>
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={() => setShortcutsHelpVisible(true)}
              title="键盘快捷键 (Shift + ?)"
            >
              快捷键
            </Button>
          </Space>
        </div>
      </div>

      {/* 操作栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportReport}
            loading={exporting}
          >
            导出分析报告
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            onClick={() => message.info('Excel格式报告功能即将推出')}
          >
            导出Excel报告
          </Button>
        </Space>
      </Card>

      {/* 主要内容区域 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
        >
          <TabPane
            tab={
              <Space>
                <BarChartOutlined />
                <span>数据分析</span>
              </Space>
            }
            key="analytics"
          >
            <TimerAnalyticsCharts
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <HistoryOutlined />
                <span>历史记录</span>
              </Space>
            }
            key="history"
          >
            <TimerHistoryList />
          </TabPane>
        </Tabs>
      </Card>

      {/* 快速洞察卡片 */}
      <Card 
        title="🔍 快速洞察" 
        style={{ marginTop: '24px' }}
      >
        <div style={{ 
          background: 'linear-gradient(135deg, #f6f9ff 0%, #e6f3ff 100%)',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e6f3ff'
        }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ color: '#1890ff' }}>📊 效率分析</Text>
              <br />
              <Text type="secondary">
                您在学习任务上的专注度最高，平均单次计时时长达到45分钟。
                建议在下午2-4点的高效时段安排重要的学习任务。
              </Text>
            </div>
            
            <div>
              <Text strong style={{ color: '#52c41a' }}>⏰ 时间模式</Text>
              <br />
              <Text type="secondary">
                您的计时习惯显示周二和周四是最高效的工作日。
                建议将重要项目安排在这些时间段，以提高整体效率。
              </Text>
            </div>

            <div>
              <Text strong style={{ color: '#fa8c16' }}>🎯 改进建议</Text>
              <br />
              <Text type="secondary">
                个人任务的完成率相对较低，建议设置更短的目标时长或将大任务拆分成小块，
                以提高成就感和持续动力。
              </Text>
            </div>
          </Space>
        </div>
      </Card>

      {/* 快捷键帮助弹窗 */}
      <KeyboardShortcutsHelp
        visible={shortcutsHelpVisible}
        onClose={() => setShortcutsHelpVisible(false)}
        shortcuts={getShortcutsHelp()}
      />
    </div>
  );
};

export default TimerAnalyticsPage;