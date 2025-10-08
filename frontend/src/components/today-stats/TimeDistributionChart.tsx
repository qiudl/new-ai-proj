import React from 'react';
import { Card } from 'antd';
import { Column } from '@ant-design/plots';

interface TimeDistributionChartProps {
  data: {
    short: number;   // 0-2小时
    medium: number;  // 2-8小时
    long: number;    // 8小时以上
    huge: number;    // 1天以上
  };
}

const TimeDistributionChart: React.FC<TimeDistributionChartProps> = ({ data }) => {
  const chartData = [
    {
      category: '短期\n(0-2h)',
      value: data.short,
      color: '#52c41a',
      range: '0-2小时'
    },
    {
      category: '中期\n(2-8h)',
      value: data.medium,
      color: '#1890ff',
      range: '2-8小时'
    },
    {
      category: '长期\n(8h+)',
      value: data.long,
      color: '#faad14',
      range: '8小时以上'
    },
    {
      category: '超大\n(1d+)',
      value: data.huge,
      color: '#ff4d4f',
      range: '1天以上'
    }
  ];

  const config = {
    data: chartData,
    xField: 'category',
    yField: 'value',
    seriesField: 'category',
    color: ({ category }: { category: string }) => {
      const item = chartData.find(d => d.category === category);
      return item?.color || '#8c8c8c';
    },
    columnStyle: {
      radius: [8, 8, 0, 0]
    },
    label: {
      position: 'top' as const,
      style: {
        fill: '#595959',
        fontSize: 14,
        fontWeight: 'bold'
      },
      formatter: ({ value }: { value: number }) => {
        return value > 0 ? value.toString() : '';
      }
    },
    xAxis: {
      label: {
        autoHide: false,
        autoRotate: false,
        style: {
          fontSize: 12
        }
      }
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${v}个`
      },
      grid: {
        line: {
          style: {
            stroke: '#e8e8e8',
            lineDash: [3, 3]
          }
        }
      }
    },
    legend: false,
    tooltip: {
      customContent: (title: string, items: any[]) => {
        if (!items || items.length === 0) return '';
        const item = chartData.find(d => d.category === title);
        return `
          <div style="padding: 8px 12px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${item?.range}</div>
            <div>任务数量: <span style="font-weight: bold; color: ${item?.color}">${items[0]?.value || 0}</span></div>
          </div>
        `;
      }
    },
    animation: {
      appear: {
        animation: 'scale-in-y',
        duration: 800
      }
    }
  };

  return (
    <Card
      title="⏱️ 任务时长分布"
      bordered={false}
      style={{ height: '100%' }}
    >
      <Column {...config} />
    </Card>
  );
};

export default TimeDistributionChart;
