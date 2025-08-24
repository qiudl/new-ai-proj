import React, { useEffect, useState } from 'react';
import { Card, Typography, Spin } from 'antd';
import { personalTimerService } from '../services/personalTimerService';

const { Text } = Typography;

interface DayItem {
  date: string;
  total_seconds: number;
  formatted_time: string;
  sessions_count?: number;
  tasks_count?: number;
}

const LastThreeDaysCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const analytics = await personalTimerService.getAnalytics({ range: '7days' });
        const weekly = Array.isArray(analytics?.weekly_trend) ? analytics.weekly_trend : [];
        // 取最近3天（按日期倒序）
        const last3 = weekly
          .slice(-3)
          .map((w: any) => ({
            date: w.week_start || w.date,
            total_seconds: w.total_seconds || 0,
            formatted_time: w.formatted_time || '00:00:00',
            sessions_count: w.sessions_count || 0,
            tasks_count: w.tasks_count || 0,
          }));
        setDays(last3);
      } catch (e) {
        setDays([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card title="📆 近3天概览">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin />
        </div>
      ) : days.length === 0 ? (
        <Text type="secondary">暂无统计数据</Text>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {days.map((d) => (
            <div key={d.date} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600 }}>{d.date}</div>
              <div style={{ marginTop: 6, color: '#1890ff', fontFamily: 'monospace' }}>{d.formatted_time}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                会话 {d.sessions_count ?? '-'} · 任务 {d.tasks_count ?? '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default LastThreeDaysCard;

