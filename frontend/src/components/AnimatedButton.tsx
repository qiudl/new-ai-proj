import React, { useState } from 'react';
import { Button } from 'antd';
import { ButtonProps } from 'antd/es/button';

interface AnimatedButtonProps extends ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  animationType?: 'scale' | 'pulse' | 'bounce' | 'shake';
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ 
  children, 
  onClick, 
  animationType = 'scale',
  style,
  ...buttonProps 
}) => {
  const [isClicked, setIsClicked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);
    if (onClick) {
      onClick();
    }
  };

  const getAnimationStyles = () => {
    const baseStyle: React.CSSProperties = {
      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      cursor: 'pointer',
      ...style,
    };

    if (isHovered) {
      switch (animationType) {
        case 'scale':
          return {
            ...baseStyle,
            transform: 'scale(1.05)',
          };
        case 'pulse':
          return {
            ...baseStyle,
            transform: 'scale(1.02)',
            boxShadow: '0 0 0 4px rgba(24, 144, 255, 0.2)',
          };
        case 'bounce':
          return {
            ...baseStyle,
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          };
        case 'shake':
          return {
            ...baseStyle,
            transform: 'translateX(2px)',
          };
        default:
          return baseStyle;
      }
    }

    if (isClicked) {
      switch (animationType) {
        case 'scale':
          return {
            ...baseStyle,
            transform: 'scale(0.95)',
          };
        case 'pulse':
          return {
            ...baseStyle,
            transform: 'scale(1.1)',
            boxShadow: '0 0 0 6px rgba(24, 144, 255, 0.3)',
          };
        case 'bounce':
          return {
            ...baseStyle,
            transform: 'translateY(1px)',
          };
        case 'shake':
          return {
            ...baseStyle,
            animation: 'shake 0.3s ease-in-out',
          };
        default:
          return baseStyle;
      }
    }

    return baseStyle;
  };

  return (
    <>
      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            75% { transform: translateX(2px); }
          }
        `}
      </style>
      <Button
        {...buttonProps}
        style={getAnimationStyles()}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </Button>
    </>
  );
};

// 成功创建动画组件
interface SuccessAnimationProps {
  show: boolean;
  onComplete: () => void;
  message?: string;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({ 
  show, 
  onComplete, 
  message = '操作成功！' 
}) => {
  React.useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '20px 24px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '16px',
        fontWeight: 500,
        opacity: show ? 1 : 0,
        animation: show ? 'successFadeInOut 2s ease-in-out' : 'none',
        pointerEvents: 'none',
      }}
    >
      <style>
        {`
          @keyframes successFadeInOut {
            0% { 
              opacity: 0; 
              transform: translate(-50%, -50%) scale(0.8); 
            }
            15% { 
              opacity: 1; 
              transform: translate(-50%, -50%) scale(1.1); 
            }
            25% { 
              transform: translate(-50%, -50%) scale(1); 
            }
            85% { 
              opacity: 1; 
              transform: translate(-50%, -50%) scale(1); 
            }
            100% { 
              opacity: 0; 
              transform: translate(-50%, -50%) scale(0.8); 
            }
          }
          
          @keyframes checkmarkDraw {
            0% { 
              stroke-dasharray: 0, 100; 
            }
            100% { 
              stroke-dasharray: 100, 0; 
            }
          }
        `}
      </style>
      
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        style={{ flexShrink: 0 }}
      >
        <circle 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="#52c41a" 
          strokeWidth="2" 
          fill="none"
        />
        <path 
          d="8 12l2 2 4-4" 
          stroke="#52c41a" 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            animation: 'checkmarkDraw 0.5s ease-in-out 0.2s both'
          }}
        />
      </svg>
      
      <span>{message}</span>
    </div>
  );
};

// 加载动画按钮
interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  loadingText?: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  children,
  onClick,
  loadingText = '处理中...',
  ...buttonProps
}) => {
  return (
    <AnimatedButton
      {...buttonProps}
      loading={loading}
      onClick={onClick}
      animationType="pulse"
    >
      {loading ? loadingText : children}
    </AnimatedButton>
  );
};

export default AnimatedButton;