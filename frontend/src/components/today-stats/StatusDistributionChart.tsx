import React from 'react';
import { Card } from 'antd';
import { Pie } from '@ant-design/plots';

interface StatusDistributionChartProps {
  data: {
    completed_count: number;
    in_progress_count: number;
    pending_count: number;
    overdue_count: number;
  };
}

const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ data }) => {
  // 转换数据为图表格式
  const chartData = [
    {
      type: '已完成',
      value: data.completed_count,
      color: '#52c41a'
    },
    {
      type: '进行中',
      value: data.in_progress_count,
      color: '#1890ff'
    },
    {
      type: '待办',
      value: data.pending_count,
      color: '#faad14'
    },
    {
      type: '逾期',
      value: data.overdue_count,
      color: '#ff4d4f'
    }
  ].filter(item => item.value > 0); // 只显示有数据的状态

  const config = {
    data: chartData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.9,
    innerRadius: 0.6, // 环形图
    label: {
      type: 'spider',
      labelHeight: 28,
      content: '{name}\n{percentage}'
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
    statistic: {
      title: {
        offsetY: -4,
        customHtml: () => '任务总数'
      },
      content: {
        offsetY: 4,
        style: {
          fontSize: '24px',
          fontWeight: 'bold'
        },
        customHtml: () => {
          const total = data.completed_count + data.in_progress_count +
                       data.pending_count + data.overdue_count;
          return total.toString();
        }
      }
    },
    interactions: [
      { type: 'element-active' },
      { type: 'pie-statistic-active' }
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
      title="📊 任务状态分布"
      bordered={false}
      style={{ height: '100%' }}
    >
      <Pie {...config} />
    </Card>
  );
};

export default StatusDistributionChart;
