import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimerAnalyticsCharts from '../TimerAnalyticsCharts';
import { WeeklyStats, DailyStats, TaskTimeEntry, ProjectTimeStats } from '../../../types/timer';

// Mock recharts components
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ dataKey, data }: any) => (
    <div data-testid="pie" data-key={dataKey}>
      {data.map((item: any, index: number) => (
        <div key={index} data-testid="pie-item">
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  ),
  Cell: ({ fill }: any) => <div data-testid="cell" style={{ fill }}></div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ dataKey, data }: any) => (
    <div data-testid="bar" data-key={dataKey}>
      {data?.map((item: any, index: number) => (
        <div key={index} data-testid="bar-item">
          {item.name}: {item[dataKey]}
        </div>
      ))}
    </div>
  ),
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: ({ dataKey, data }: any) => (
    <div data-testid="line" data-key={dataKey}>
      {data?.map((item: any, index: number) => (
        <div key={index} data-testid="line-item">
          {item.name}: {item[dataKey]}
        </div>
      ))}
    </div>
  ),
  XAxis: () => <div data-testid="x-axis"></div>,
  YAxis: () => <div data-testid="y-axis"></div>,
  CartesianGrid: () => <div data-testid="cartesian-grid"></div>,
  Tooltip: () => <div data-testid="tooltip"></div>,
  Legend: () => <div data-testid="legend"></div>,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const mockWeeklyStats: WeeklyStats = {
  totalHours: 40.5,
  totalTasks: 15,
  completedTasks: 12,
  averageDailyHours: 5.8,
  efficiency: 0.85,
  projectCount: 3
};

const mockDailyStats: DailyStats[] = [
  { date: '2024-01-15', hours: 8.0, tasks: 3, dayName: '周一', efficiency: 0.9 },
  { date: '2024-01-16', hours: 7.5, tasks: 2, dayName: '周二', efficiency: 0.8 },
  { date: '2024-01-17', hours: 6.0, tasks: 4, dayName: '周三', efficiency: 0.7 },
  { date: '2024-01-18', hours: 9.0, tasks: 3, dayName: '周四', efficiency: 0.95 },
  { date: '2024-01-19', hours: 5.5, tasks: 2, dayName: '周五', efficiency: 0.75 },
];

const mockTaskTimeEntries: TaskTimeEntry[] = [
  { taskId: 1, taskTitle: 'Frontend Development', totalHours: 12.5, completed: true },
  { taskId: 2, taskTitle: 'Backend API Implementation', totalHours: 8.0, completed: true },
  { taskId: 3, taskTitle: 'Database Design', totalHours: 6.5, completed: false },
  { taskId: 4, taskTitle: 'Testing and QA', totalHours: 4.5, completed: true },
];

const mockProjectStats: ProjectTimeStats[] = [
  { projectId: 1, projectName: 'Web Application', totalHours: 25.0, taskCount: 8 },
  { projectId: 2, projectName: 'Mobile App', totalHours: 12.5, taskCount: 4 },
  { projectId: 3, projectName: 'Data Analysis', totalHours: 8.0, taskCount: 3 },
];

const mockDateRange: [string, string] = ['2024-01-15', '2024-01-19'];

describe('TimerAnalyticsCharts', () => {
  it('renders all chart components with provided data', () => {
    render(
      <TimerAnalyticsCharts
        weeklyStats={mockWeeklyStats}
        dailyStats={mockDailyStats}
        taskTimeEntries={mockTaskTimeEntries}
        projectStats={mockProjectStats}
        dateRange={mockDateRange}
      />
    );

    // Check that all chart containers are rendered
    expect(screen.getByText('项目分布')).toBeInTheDocument();
    expect(screen.getByText('每日工时')).toBeInTheDocument();
    expect(screen.getByText('效率趋势')).toBeInTheDocument();
    expect(screen.getByText('任务效率分析')).toBeInTheDocument();

    // Check that charts are rendered
    expect(screen.getAllByTestId('pie-chart')).toHaveLength(2); // Project distribution + task efficiency
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    // Check date range display
    expect(screen.getByText('数据范围: 2024-01-15 至 2024-01-19')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    const emptyWeeklyStats: WeeklyStats = {
      totalHours: 0,
      totalTasks: 0,
      completedTasks: 0,
      averageDailyHours: 0,
      efficiency: 0,
      projectCount: 0
    };

    render(
      <TimerAnalyticsCharts
        weeklyStats={emptyWeeklyStats}
        dailyStats={[]}
        taskTimeEntries={[]}
        projectStats={[]}
        dateRange={mockDateRange}
      />
    );

    // Should still render chart containers
    expect(screen.getByText('项目分布')).toBeInTheDocument();
    expect(screen.getByText('每日工时')).toBeInTheDocument();
    expect(screen.getByText('效率趋势')).toBeInTheDocument();
    expect(screen.getByText('任务效率分析')).toBeInTheDocument();

    // Should show empty state messages
    expect(screen.getByText('暂无任务数据')).toBeInTheDocument();
  });

  it('displays project distribution data correctly', () => {
    render(
      <TimerAnalyticsCharts
        weeklyStats={mockWeeklyStats}
        dailyStats={mockDailyStats}
        taskTimeEntries={mockTaskTimeEntries}
        projectStats={mockProjectStats}
        dateRange={mockDateRange}
      />
    );

    // Check if project data is displayed in pie chart
    const pieChart = screen.getAllByTestId('pie')[0];
    expect(pieChart).toBeInTheDocument();
    
    // Should contain project names
    expect(screen.getByText(/Web Application/)).toBeInTheDocument();
    expect(screen.getByText(/Mobile App/)).toBeInTheDocument();
    expect(screen.getByText(/Data Analysis/)).toBeInTheDocument();
  });
});