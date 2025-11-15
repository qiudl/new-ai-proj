import React, { useMemo } from 'react';
import { Progress, Space, Typography, Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export interface PasswordStrength {
  score: number;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  suggestions: string[];
}

interface PasswordStrengthIndicatorProps {
  password: string;
  minLength?: number;
  showRequirements?: boolean;
  showSuggestions?: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  minLength = 8,
  showRequirements = true,
  showSuggestions = false,
}) => {
  const strength = useMemo((): PasswordStrength => {
    let score = 0;
    const suggestions: string[] = [];

    // Check minimum length
    const hasMinLength = password.length >= minLength;
    if (!hasMinLength) {
      suggestions.push(`密码长度至少需要${minLength}个字符`);
    } else {
      score += 20;
    }

    // Check for uppercase letters
    const hasUppercase = /[A-Z]/.test(password);
    if (!hasUppercase) {
      suggestions.push('添加大写字母');
    } else {
      score += 15;
    }

    // Check for lowercase letters
    const hasLowercase = /[a-z]/.test(password);
    if (!hasLowercase) {
      suggestions.push('添加小写字母');
    } else {
      score += 15;
    }

    // Check for numbers
    const hasNumber = /[0-9]/.test(password);
    if (!hasNumber) {
      suggestions.push('添加数字');
    } else {
      score += 15;
    }

    // Check for special characters
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
    if (!hasSpecial) {
      suggestions.push('添加特殊字符 (!@#$%^&*等)');
    } else {
      score += 15;
    }

    // Additional points for length
    if (password.length >= 12) {
      score += 10;
    }
    if (password.length >= 16) {
      score += 10;
    }

    // Determine strength level
    let strengthLevel: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    if (score >= 80) {
      strengthLevel = 'strong';
    } else if (score >= 60) {
      strengthLevel = 'good';
    } else if (score >= 40) {
      strengthLevel = 'fair';
    }

    return {
      score,
      strength: strengthLevel,
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
      suggestions,
    };
  }, [password, minLength]);

  const getProgressColor = () => {
    switch (strength.strength) {
      case 'weak':
        return '#ff4d4f';
      case 'fair':
        return '#faad14';
      case 'good':
        return '#1890ff';
      case 'strong':
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  };

  const getStrengthText = () => {
    switch (strength.strength) {
      case 'weak':
        return '弱';
      case 'fair':
        return '一般';
      case 'good':
        return '良好';
      case 'strong':
        return '强';
      default:
        return '';
    }
  };

  const getStrengthTag = () => {
    const strengthText = getStrengthText();
    const color = getProgressColor();
    return <Tag color={color}>{strengthText}</Tag>;
  };

  const RequirementItem: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
    <Space size={4}>
      {met ? (
        <CheckCircleOutlined style={{ color: '#52c41a' }} />
      ) : (
        <CloseCircleOutlined style={{ color: '#d9d9d9' }} />
      )}
      <Text type={met ? 'success' : 'secondary'} style={{ fontSize: 12 }}>
        {text}
      </Text>
    </Space>
  );

  if (!password) {
    return null;
  }

  return (
    <div style={{ width: '100%' }}>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Progress
              percent={strength.score}
              strokeColor={getProgressColor()}
              showInfo={false}
              size="small"
            />
          </div>
          {getStrengthTag()}
        </div>

        {/* Requirements */}
        {showRequirements && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 8,
            marginTop: 4,
          }}>
            <RequirementItem met={strength.hasMinLength} text={`至少${minLength}个字符`} />
            <RequirementItem met={strength.hasUppercase} text="包含大写字母" />
            <RequirementItem met={strength.hasLowercase} text="包含小写字母" />
            <RequirementItem met={strength.hasNumber} text="包含数字" />
            <RequirementItem met={strength.hasSpecial} text="包含特殊字符" />
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && strength.suggestions.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <Space size={4}>
              <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                建议：{strength.suggestions.join('、')}
              </Text>
            </Space>
          </div>
        )}
      </Space>
    </div>
  );
};

export default PasswordStrengthIndicator;
