import React, { useState } from 'react';
import { 
  Card, 
  Space, 
  Button, 
  DatePicker, 
  Dropdown, 
  Typography, 
  Row, 
  Col, 
  Badge,
  Divider,
  Tooltip,
  message
} from 'antd';
import { 
  CalendarOutlined, 
  LeftOutlined, 
  RightOutlined, 
  ClockCircleOutlined,
  ShareAltOutlined,
  BookOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { dateShortcuts, getDateRangePresets, generateShareableUrl } from '../hooks/useUrlState';
import type { TaskDashboardFilters } from '../hooks/useUrlState';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface QuickDatePickerProps {
  selectedWeek: Dayjs;
  onWeekChange: (week: Dayjs) => void;
  filters?: TaskDashboardFilters;
  onSaveBookmark?: (name: string, filters: TaskDashboardFilters) => void;
  savedBookmarks?: Array<{ name: string; filters: TaskDashboardFilters; createdAt: string }>;
  onLoadBookmark?: (filters: TaskDashboardFilters) => void;
  onDeleteBookmark?: (name: string) => void;
}

export const QuickDatePicker: React.FC<QuickDatePickerProps> = ({
  selectedWeek,
  onWeekChange,
  filters,
  onSaveBookmark,
  savedBookmarks = [],
  onLoadBookmark,
  onDeleteBookmark,
}) => {
  const [customDateRange, setCustomDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [bookmarkName, setBookmarkName] = useState('');
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);

  // 快速周选择
  const handleQuickWeekSelect = (getWeek: () => Dayjs) => {
    const week = getWeek();
    onWeekChange(week);
  };

  // 自定义日期范围选择
  const handleDateRangeChange = (dates: [Dayjs, Dayjs] | null) => {
    if (dates) {
      setCustomDateRange(dates);
      // 选择日期范围的中间周
      const middleDate = dates[0].add(Math.floor(dates[1].diff(dates[0], 'day') / 2), 'day');
      onWeekChange(middleDate.startOf('week'));
    }
  };

  // 生成分享链接
  const handleShare = async () => {
    if (!filters) return;
    
    try {
      const shareUrl = generateShareableUrl(filters);
      await navigator.clipboard.writeText(shareUrl);
      message.success('分享链接已复制到剪贴板');
    } catch (error) {
      console.error('Failed to copy share URL:', error);
      message.error('复制分享链接失败');
    }
  };

  // 保存书签
  const handleSaveBookmark = () => {
    if (!filters || !onSaveBookmark) return;
    
    if (!bookmarkName.trim()) {
      message.warning('请输入书签名称');
      return;
    }
    
    onSaveBookmark(bookmarkName.trim(), filters);
    setBookmarkName('');
    setShowBookmarkInput(false);
    message.success('筛选条件已保存为书签');
  };

  // 加载书签
  const handleLoadBookmark = (bookmark: { filters: TaskDashboardFilters }) => {
    if (onLoadBookmark) {
      onLoadBookmark(bookmark.filters);
      message.success('已加载书签筛选条件');
    }
  };

  // 删除书签
  const handleDeleteBookmark = (name: string) => {
    if (onDeleteBookmark) {
      onDeleteBookmark(name);
      message.success('书签已删除');
    }
  };

  // 快捷日期按钮菜单
  const quickDateMenu = {
    items: dateShortcuts.map(shortcut => ({
      key: shortcut.key,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '150px' }}>
          <span>{shortcut.label}</span>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {shortcut.value().format('MM/DD')}
          </Text>
        </div>
      ),
      onClick: () => handleQuickWeekSelect(shortcut.value),
    })),
  };

  // 日期范围预设菜单
  const dateRangeMenu = {
    items: getDateRangePresets().map(preset => ({
      key: preset.key,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '200px' }}>
          <span>{preset.label}</span>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {preset.value[0].format('MM/DD')} - {preset.value[1].format('MM/DD')}
          </Text>
        </div>
      ),
      onClick: () => {
        const middleDate = preset.value[0].add(
          Math.floor(preset.value[1].diff(preset.value[0], 'day') / 2), 
          'day'
        );
        onWeekChange(middleDate.startOf('week'));
      },
    })),
  };

  // 书签菜单
  const bookmarkMenu = savedBookmarks.length > 0 ? {
    items: [
      ...savedBookmarks.map(bookmark => ({
        key: bookmark.name,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '200px' }}>
            <div style={{ flex: 1 }}>
              <div>{bookmark.name}</div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {dayjs(bookmark.createdAt).format('MM/DD HH:mm')}
              </Text>
            </div>
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBookmark(bookmark.name);
              }}
              style={{ color: '#ff4d4f' }}
            />
          </div>
        ),
        onClick: () => handleLoadBookmark(bookmark),
      })),
      { type: 'divider' as const },
      {
        key: 'save-new',
        label: '保存当前筛选条件',
        icon: <BookOutlined />,
        onClick: () => setShowBookmarkInput(true),
      },
    ],
  } : {
    items: [
      {
        key: 'save-new',
        label: '保存当前筛选条件',
        icon: <BookOutlined />,
        onClick: () => setShowBookmarkInput(true),
      },
    ],
  };

  return (
    <Card size="small" style={{ marginBottom: '12px' }}>
      <Row gutter={[12, 8]} align="middle">
        {/* 周导航 */}
        <Col>
          <Space>
            <Button 
              type="text" 
              size="small"
              icon={<LeftOutlined />} 
              onClick={() => onWeekChange(selectedWeek.subtract(1, 'week'))}
            />
            <div style={{ minWidth: '120px', textAlign: 'center' }}>
              <Text strong>
                {selectedWeek.format('YYYY年M月')}
              </Text>
              <br />
              <Badge 
                count={`第${selectedWeek.week()}周`} 
                style={{ backgroundColor: '#1890ff', fontSize: '11px' }}
              />
              {selectedWeek.isSame(dayjs(), 'week') && (
                <Badge count="本周" color="#52c41a" style={{ marginLeft: '4px' }} />
              )}
            </div>
            <Button 
              type="text" 
              size="small"
              icon={<RightOutlined />} 
              onClick={() => onWeekChange(selectedWeek.add(1, 'week'))}
            />
          </Space>
        </Col>

        <Col>
          <Divider type="vertical" />
        </Col>

        {/* 快捷日期选择 */}
        <Col>
          <Space size="small">
            <Dropdown menu={quickDateMenu} trigger={['click']}>
              <Button size="small" icon={<ClockCircleOutlined />}>
                快捷选择
              </Button>
            </Dropdown>

            <Dropdown menu={dateRangeMenu} trigger={['click']}>
              <Button size="small" icon={<CalendarOutlined />}>
                日期范围
              </Button>
            </Dropdown>

            <DatePicker
              size="small"
              picker="week"
              value={selectedWeek}
              onChange={(date) => date && onWeekChange(date)}
              format="YYYY年第ww周"
              placeholder="选择周"
              style={{ width: '130px' }}
            />
          </Space>
        </Col>

        <Col>
          <Divider type="vertical" />
        </Col>

        {/* 书签和分享 */}
        <Col>
          <Space size="small">
            {savedBookmarks.length > 0 && (
              <Dropdown menu={bookmarkMenu} trigger={['click']}>
                <Button size="small" icon={<BookOutlined />}>
                  书签 ({savedBookmarks.length})
                </Button>
              </Dropdown>
            )}

            {!savedBookmarks.length && onSaveBookmark && (
              <Button 
                size="small" 
                icon={<BookOutlined />}
                onClick={() => setShowBookmarkInput(true)}
              >
                保存筛选
              </Button>
            )}

            {filters && (
              <Tooltip title="复制分享链接">
                <Button 
                  size="small" 
                  icon={<ShareAltOutlined />}
                  onClick={handleShare}
                />
              </Tooltip>
            )}
          </Space>
        </Col>

        {/* 快速操作 */}
        <Col flex="auto" style={{ textAlign: 'right' }}>
          <Space size="small">
            <Button 
              type="primary" 
              size="small"
              onClick={() => onWeekChange(dayjs())}
              disabled={selectedWeek.isSame(dayjs(), 'week')}
            >
              回到本周
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 书签输入框 */}
      {showBookmarkInput && (
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
          <Row gutter={[8, 8]} align="middle">
            <Col flex="auto">
              <input
                type="text"
                placeholder="输入书签名称..."
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveBookmark();
                  } else if (e.key === 'Escape') {
                    setShowBookmarkInput(false);
                    setBookmarkName('');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
                autoFocus
              />
            </Col>
            <Col>
              <Space size="small">
                <Button size="small" type="primary" onClick={handleSaveBookmark}>
                  保存
                </Button>
                <Button 
                  size="small" 
                  onClick={() => {
                    setShowBookmarkInput(false);
                    setBookmarkName('');
                  }}
                >
                  取消
                </Button>
              </Space>
            </Col>
          </Row>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
            按 Enter 保存，按 Esc 取消
          </div>
        </div>
      )}

      {/* 自定义日期范围选择器 */}
      {customDateRange && (
        <div style={{ marginTop: '8px', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            已选择: {customDateRange[0].format('MM/DD')} - {customDateRange[1].format('MM/DD')}
          </Text>
        </div>
      )}
    </Card>
  );
};