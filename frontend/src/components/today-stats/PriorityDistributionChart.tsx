import React from 'react';
import { Card } from 'antd';
import { Pie } from '@ant-design/plots';

interface PriorityDistributionChartProps {
  data: {
    high: number;
    medium: number;
    low: number;
  };
}

const PriorityDistributionChart: React.FC<PriorityDistributionChartProps> = ({ data }) => {
  const chartData = [
    {
      type: '高优先级',
      value: data.high,
      color: '#ff4d4f'
    },
    {
      type: '中优先级',
      value: data.medium,
      color: '#faad14'
    },
    {
      type: '低优先级',
      value: data.low,
      color: '#52c41a'
    }
  ].filter(item => item.value > 0);

  const config = {
    data: chartData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.9,
    label: {
      type: 'inner',
      offset: '-30%',
      content: ({ percent }: { percent: number }) => `${(percent * 100).toFixed(1)}%`,
      style: {
        fontSize: 14,
        textAlign: 'center' as const,
        fill: '#fff',
        fontWeight: 'bold'
      }
    },
    color: ({ type }: { type: string }) => {
      const item = chartData.find(d => d.type === type);
      return item?.color || '#8c8c8c';
    },
    legend: {
      position: 'bottom' as const,
      itemName: {
        style: {
          fontSize: 14
        }
      }
    },
    interactions: [
      { type: 'element-active' }
    ],
    animation: {
      appear: {
        animation: 'fade-in',
        duration: 800
      }
    }
  };

  return (
    <Card
      title="🎯 优先级分布"
      bordered={false}
      style={{ height: '100%' }}
    >
      <Pie {...config} />
    </Card>
  );
};

export default PriorityDistributionChart;
