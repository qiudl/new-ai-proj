import React, { useState, useEffect, useCallback } from 'react';
import {
  Input,
  Select,
  Space,
  InputNumber,
  Typography,
  Tooltip,
  Button
} from 'antd';
import {
  ClockCircleOutlined,
  CalculatorOutlined,
  SwapOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

// 时间单位定义
type TimeUnit = 'auto' | 'minutes' | 'hours' | 'days';

// 时间跟踪模式
type TimeTrackingMode = 'manual' | 'automatic' | 'hybrid';

interface TimeInputValue {
  estimatedMinutes?: number;
  timeUnitPreference?: TimeUnit;
  workHoursPerDay?: number;
  timeTrackingMode?: TimeTrackingMode;
  startDatetime?: string;
  dueDatetime?: string;
}

interface TimeInputProps {
  value?: TimeInputValue;
  onChange?: (value: TimeInputValue) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  showAdvanced?: boolean;
  compact?: boolean;
  mode?: 'estimate' | 'schedule' | 'full'; // estimate: 仅预估时间, schedule: 仅日程安排, full: 完整模式
}

const TimeInput: React.FC<TimeInputProps> = ({
  value = {},
  onChange,
  placeholder = '请输入预估时间',
  disabled = false,
  style,
  showAdvanced = false,
  compact = false,
  mode = 'estimate'
}) => {
  // 内部状态
  const [displayValue, setDisplayValue] = useState<number | undefined>();
  const [displayUnit, setDisplayUnit] = useState<TimeUnit>('auto');
  const [workHoursPerDay, setWorkHoursPerDay] = useState<number>(8);
  const [timeTrackingMode, setTimeTrackingMode] = useState<TimeTrackingMode>('manual');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(showAdvanced);

  // 从分钟转换为显示单位
  const convertFromMinutes = useCallback((minutes: number, unit: TimeUnit): number => {
    switch (unit) {
      case 'minutes':
        return minutes;
      case 'hours':
        return minutes / 60;
      case 'days':
        return minutes / (workHoursPerDay * 60);
      case 'auto':
        // 自动选择最合适的单位
        if (minutes < 60) return minutes; // 小于1小时显示分钟
        if (minutes < workHoursPerDay * 60) return minutes / 60; // 小于1天显示小时
        return minutes / (workHoursPerDay * 60); // 否则显示天数
      default:
        return minutes;
    }
  }, [workHoursPerDay]);

  // 转换为分钟存储
  const convertToMinutes = useCallback((displayValue: number, unit: TimeUnit): number => {
    switch (unit) {
      case 'minutes':
        return Math.round(displayValue);
      case 'hours':
        return Math.round(displayValue * 60);
      case 'days':
        return Math.round(displayValue * workHoursPerDay * 60);
      case 'auto':
        // auto模式下根据数值大小判断单位
        if (displayValue < 60) return Math.round(displayValue); // 小于60认为是分钟
        if (displayValue < 24) return Math.round(displayValue * 60); // 小于24认为是小时
        return Math.round(displayValue * workHoursPerDay * 60); // 否则认为是天数
      default:
        return Math.round(displayValue);
    }
  }, [workHoursPerDay]);

  // 获取自动单位
  const getAutoUnit = useCallback((minutes: number): TimeUnit => {
    if (minutes < 60) return 'minutes';
    if (minutes < workHoursPerDay * 60) return 'hours';
    return 'days';
  }, [workHoursPerDay]);

  // 获取单位显示文本
  const getUnitText = (unit: TimeUnit, minutes?: number): string => {
    switch (unit) {
      case 'minutes':
        return '分钟';
      case 'hours':
        return '小时';
      case 'days':
        return '天';
      case 'auto':
        if (minutes !== undefined) {
          const autoUnit = getAutoUnit(minutes);
          return getUnitText(autoUnit) + ' (自动)';
        }
        return '智能';
      default:
        return '';
    }
  };

  // 初始化显示值
  useEffect(() => {
    if (value.estimatedMinutes !== undefined) {
      const unit = value.timeUnitPreference || 'auto';
      setDisplayUnit(unit);
      setDisplayValue(convertFromMinutes(value.estimatedMinutes, unit));
    }
    if (value.workHoursPerDay !== undefined) {
      setWorkHoursPerDay(value.workHoursPerDay);
    }
    if (value.timeTrackingMode !== undefined) {
      setTimeTrackingMode(value.timeTrackingMode);
    }
  }, [value, convertFromMinutes]);

  // 处理显示值变化
  const handleDisplayValueChange = (newValue: number | null) => {
    if (newValue === null || newValue === undefined) {
      setDisplayValue(undefined);
      onChange?.({
        ...value,
        estimatedMinutes: undefined
      });
      return;
    }

    setDisplayValue(newValue);
    const minutes = convertToMinutes(newValue, displayUnit);
    
    onChange?.({
      ...value,
      estimatedMinutes: minutes,
      timeUnitPreference: displayUnit,
      workHoursPerDay,
      timeTrackingMode
    });
  };

  // 处理单位变化
  const handleUnitChange = (newUnit: TimeUnit) => {
    setDisplayUnit(newUnit);
    
    if (displayValue !== undefined) {
      // 先转换为分钟，再转换为新单位
      const minutes = convertToMinutes(displayValue, displayUnit);
      const newDisplayValue = convertFromMinutes(minutes, newUnit);
      setDisplayValue(newDisplayValue);
    }

    onChange?.({
      ...value,
      timeUnitPreference: newUnit,
      workHoursPerDay,
      timeTrackingMode
    });
  };

  // 处理工作小时数变化
  const handleWorkHoursChange = (newHours: number | null) => {
    const hours = newHours || 8;
    setWorkHoursPerDay(hours);
    
    // 如果当前是天数单位，需要重新计算
    if (displayUnit === 'days' && displayValue !== undefined) {
      const minutes = Math.round(displayValue * hours * 60);
      onChange?.({
        ...value,
        estimatedMinutes: minutes,
        workHoursPerDay: hours,
        timeTrackingMode
      });
    } else {
      onChange?.({
        ...value,
        workHoursPerDay: hours,
        timeTrackingMode
      });
    }
  };

  // 快速设置常用时间
  const quickSetTime = (minutes: number) => {
    const unit = getAutoUnit(minutes);
    const displayVal = convertFromMinutes(minutes, unit);
    
    setDisplayValue(displayVal);
    setDisplayUnit(unit);
    
    onChange?.({
      ...value,
      estimatedMinutes: minutes,
      timeUnitPreference: unit,
      workHoursPerDay,
      timeTrackingMode
    });
  };

  // 渲染预估时间输入
  const renderEstimateInput = () => (
    <Space.Compact style={{ width: '100%' }}>
      <InputNumber
        value={displayValue}
        onChange={handleDisplayValueChange}
        placeholder={displayUnit === 'auto' ? '智能识别' : placeholder}
        disabled={disabled}
        min={0}
        max={displayUnit === 'days' ? 365 : displayUnit === 'hours' ? 8760 : 525600}
        precision={displayUnit === 'minutes' ? 0 : 1}
        style={{ flex: 1 }}
        addonBefore={<ClockCircleOutlined />}
      />
      <Select
        value={displayUnit}
        onChange={handleUnitChange}
        disabled={disabled}
        style={{ width: compact ? 80 : 100 }}
      >
        <Option value="auto">智能</Option>
        <Option value="minutes">分钟</Option>
        <Option value="hours">小时</Option>
        <Option value="days">天</Option>
      </Select>
    </Space.Compact>
  );

  // 渲染快速设置按钮
  const renderQuickButtons = () => (
    <Space size="small" wrap style={{ marginTop: 8 }}>
      <Button size="small" onClick={() => quickSetTime(30)}>30分钟</Button>
      <Button size="small" onClick={() => quickSetTime(60)}>1小时</Button>
      <Button size="small" onClick={() => quickSetTime(240)}>半天</Button>
      <Button size="small" onClick={() => quickSetTime(480)}>1天</Button>
      <Button size="small" onClick={() => quickSetTime(1440)}>3天</Button>
      <Button size="small" onClick={() => quickSetTime(2400)}>1周</Button>
    </Space>
  );

  // 渲染高级选项
  const renderAdvancedOptions = () => (
    <div style={{ marginTop: 12, padding: '12px', backgroundColor: '#fafafa', borderRadius: 6 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong style={{ fontSize: 12 }}>每日工作小时数：</Text>
          <InputNumber
            value={workHoursPerDay}
            onChange={handleWorkHoursChange}
            min={1}
            max={24}
            precision={1}
            size="small"
            style={{ width: 80, marginLeft: 8 }}
            addonAfter="小时"
          />
        </div>
        
        <div>
          <Text strong style={{ fontSize: 12 }}>时间跟踪模式：</Text>
          <Select
            value={timeTrackingMode}
            onChange={setTimeTrackingMode}
            size="small"
            style={{ width: 120, marginLeft: 8 }}
          >
            <Option value="manual">手动</Option>
            <Option value="automatic">自动</Option>
            <Option value="hybrid">混合</Option>
          </Select>
        </div>
      </Space>
    </div>
  );

  // 渲染时间智能提示
  const renderTimeHint = () => {
    if (!value.estimatedMinutes) return null;
    
    const minutes = value.estimatedMinutes;
    const hours = Math.round(minutes / 60 * 10) / 10;
    const days = Math.round(minutes / (workHoursPerDay * 60) * 10) / 10;
    
    return (
      <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
        <CalculatorOutlined style={{ marginRight: 4 }} />
        约 {minutes}分钟 / {hours}小时 / {days}天
      </div>
    );
  };

  return (
    <div style={style}>
      {mode === 'estimate' && (
        <>
          {renderEstimateInput()}
          {!compact && renderQuickButtons()}
          {renderTimeHint()}
          
          {!compact && (
            <div style={{ marginTop: 8 }}>
              <Button
                type="link"
                size="small"
                icon={<SwapOutlined />}
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                style={{ padding: 0, height: 'auto' }}
              >
                {showAdvancedOptions ? '隐藏' : '显示'}高级选项
              </Button>
            </div>
          )}
          
          {showAdvancedOptions && renderAdvancedOptions()}
        </>
      )}
      
      {mode === 'schedule' && (
        <div>
          <Text type="secondary">日程安排功能开发中...</Text>
        </div>
      )}
      
      {mode === 'full' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          {renderEstimateInput()}
          {!compact && renderQuickButtons()}
          {renderTimeHint()}
          {showAdvancedOptions && renderAdvancedOptions()}
        </Space>
      )}
    </div>
  );
};

export default TimeInput;