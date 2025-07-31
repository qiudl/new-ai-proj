// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Alert, Typography} from 'antd';
import { 
 DollarCircleOutlined, 
 WarningOutlined, 
 InfoCircleOutlined 
} from '@ant-design/icons';
import aiTaskGeneratorService from '../services/aiTaskGeneratorService';

const { Text } = Typography;

interface CostAlertProps {
  monthlyBudget?: number; // 月度预算（元）
  onShowStats?: () => void;
  className?: string;
}

const CostAlert: React.FC<CostAlertProps> = ({
  monthlyBudget = 50, // 默认月度预算50元
  onShowStats,
  className = ''
}) => {
  const [currentMonthCost, setCurrentMonthCost] = useState(0);
  const [predictedMonthlyCost, setPredictedMonthlyCost] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCostData = () => {
      try {
        // 获取当月实际成本
        const monthStats = aiTaskGeneratorService.getTokenUsageStats('month');
        setCurrentMonthCost(monthStats.totalCost);

        // 获取预测成本
        const predicted = aiTaskGeneratorService.predictMonthlyCost();
        setPredictedMonthlyCost(predicted);

        // 获取优化建议
        const optimizationSuggestions = aiTaskGeneratorService.getCostOptimizationSuggestions();
        setSuggestions(optimizationSuggestions);

      } catch (error) {
        console.error('加载成本数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCostData();
    
    // 每5分钟更新一次数据
    const interval = setInterval(loadCostData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return null;
  }

  // 计算预算使用比例
  const budgetUsedRatio = (currentMonthCost / monthlyBudget) * 100;
  const predictedBudgetRatio = (predictedMonthlyCost / monthlyBudget) * 100;

  // 确定警告类型
  const getAlertType = (): 'success' | 'info' | 'warning' | 'error' => {
    if (predictedBudgetRatio > 100) return 'error';
    if (predictedBudgetRatio > 80) return 'warning';
    if (budgetUsedRatio > 50) return 'info';
    return 'success';
  };

  // 获取警告图标
  const getAlertIcon = () => {
    const type = getAlertType();
    switch (type) {
      case 'error':
        return <WarningOutlined />;
      case 'warning':
        return <WarningOutlined />;
      case 'info':
        return <InfoCircleOutlined />;
      default:
        return <DollarCircleOutlined />;
    }
  };

  // 生成警告消息
  const getAlertMessage = (): string => {
    const type = getAlertType();
    switch (type) {
      case 'error':
        return '⚠️ 预算超支预警';
      case 'warning':
        return '⚡ 预算使用预警';
      case 'info':
        return '📊 成本使用情况';
      default:
        return '✅ 成本控制良好';
    }
  };

  // 生成描述信息
  const getDescription = () => {
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Space wrap>
            <Text>
              本月已用: <Text strong>¥{currentMonthCost.toFixed(2)}</Text>
            </Text>
            <Text>
              预测月度: <Text strong>¥{predictedMonthlyCost.toFixed(2)}</Text>
            </Text>
            <Text>
              月度预算: <Text strong>¥{monthlyBudget.toFixed(2)}</Text>
            </Text>
          </Space>
        </div>
        
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            预算使用进度:
          </Text>
          <Progress
            percent={Math.min(budgetUsedRatio, 100)}
            success={{ percent: Math.min(predictedBudgetRatio - budgetUsedRatio, 100 - budgetUsedRatio) }}
            status={predictedBudgetRatio > 100 ? 'exception' : 'normal'}
            size="small"
            style={{ marginTop: 4 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8c8c8c', marginTop: 2 }}>
            <span>已用: {budgetUsedRatio.toFixed(1)}%</span>
            <span>预测: {predictedBudgetRatio.toFixed(1)}%</span>
          </div>
        </div>

        {suggestions.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              💡 {suggestions[0]}
            </Text>
          </div>
        )}
      </div>
    );
  };

  // 如果成本很低且无需显示警告，则不显示组件
  if (currentMonthCost < 0.01 && predictedMonthlyCost < 0.1) {
    return null;
  }

  return (
    <Alert
      message={getAlertMessage()}
      description={getDescription()}
      type={getAlertType()}
      icon={getAlertIcon()}
      showIcon
      className={className}
      action={
        <Space>
          {onShowStats && (
            <Button size="small" onClick={onShowStats}>
              查看详情
            </Button>
          )}
          <Button 
            size="small" 
            type="link"
            onClick={() => window.open('/ai-config', '_blank')}
          >
            AI配置
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
    />
  );
};

export default CostAlert;