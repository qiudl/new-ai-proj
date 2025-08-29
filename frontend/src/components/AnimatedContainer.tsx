import React, { useRef, useEffect, useState } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import '../styles/AnimatedContainer.css';

export type AnimationType = 'fade' | 'slide' | 'scale' | 'bounce' | 'flip';
export type AnimationDirection = 'up' | 'down' | 'left' | 'right';
export type AnimationDuration = 'fast' | 'normal' | 'slow';

export interface AnimatedContainerProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 动画类型 */
  type?: AnimationType;
  /** 动画方向（仅对slide类型有效） */
  direction?: AnimationDirection;
  /** 动画持续时间 */
  duration?: AnimationDuration;
  /** 是否显示 */
  visible?: boolean;
  /** 动画延迟（毫秒） */
  delay?: number;
  /** 自定义CSS类名 */
  className?: string;
  /** 内联样式 */
  style?: React.CSSProperties;
  /** 进入动画完成回调 */
  onEntered?: () => void;
  /** 离开动画完成回调 */
  onExited?: () => void;
  /** 是否禁用动画（用于无障碍访问） */
  disableAnimation?: boolean;
}

const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  type = 'fade',
  direction = 'up',
  duration = 'normal',
  visible = true,
  delay = 0,
  className,
  style,
  onEntered,
  onExited,
  disableAnimation = false
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(visible);

  const getDurationMs = () => {
    switch (duration) {
      case 'fast': return 150;
      case 'slow': return 500;
      default: return 300;
    }
  };

  const getAnimationClass = () => {
    if (disableAnimation) return 'animated-no-animation';
    return `animated-${type}${type === 'slide' ? `-${direction}` : ''}`;
  };

  // 处理延迟显示
  useEffect(() => {
    if (visible && delay > 0) {
      const timer = setTimeout(() => setShouldRender(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(visible);
    }
  }, [visible, delay]);

  if (disableAnimation) {
    return visible ? (
      <div 
        className={`animated-container ${className || ''}`}
        style={style}
      >
        {children}
      </div>
    ) : null;
  }

  return (
    <CSSTransition
      nodeRef={nodeRef}
      in={shouldRender}
      timeout={getDurationMs()}
      classNames={getAnimationClass()}
      unmountOnExit
      onEntered={onEntered}
      onExited={onExited}
    >
      <div
        ref={nodeRef}
        className={`animated-container ${className || ''}`}
        style={style}
      >
        {children}
      </div>
    </CSSTransition>
  );
};

export default AnimatedContainer;

// 列表动画组件
export interface AnimatedListProps {
  /** 子元素数组 */
  children: React.ReactNode[];
  /** 动画类型 */
  type?: AnimationType;
  /** 动画方向 */
  direction?: AnimationDirection;
  /** 动画持续时间 */
  duration?: AnimationDuration;
  /** 项目之间的延迟（毫秒） */
  stagger?: number;
  /** 自定义CSS类名 */
  className?: string;
  /** 内联样式 */
  style?: React.CSSProperties;
  /** 是否禁用动画 */
  disableAnimation?: boolean;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  type = 'fade',
  direction = 'up',
  duration = 'normal',
  stagger = 100,
  className,
  style,
  disableAnimation = false
}) => {
  const getDurationMs = () => {
    switch (duration) {
      case 'fast': return 150;
      case 'slow': return 500;
      default: return 300;
    }
  };

  const getAnimationClass = () => {
    if (disableAnimation) return 'animated-no-animation';
    return `animated-${type}${type === 'slide' ? `-${direction}` : ''}`;
  };

  return (
    <TransitionGroup
      className={`animated-list ${className || ''}`}
      style={style}
    >
      {children.map((child, index) => (
        <CSSTransition
          key={index}
          timeout={getDurationMs()}
          classNames={getAnimationClass()}
          style={{
            animationDelay: disableAnimation ? '0s' : `${index * stagger}ms`
          }}
        >
          <div className="animated-list-item">
            {child}
          </div>
        </CSSTransition>
      ))}
    </TransitionGroup>
  );
};

// 数据更新动画组件
export interface UpdateAnimationProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 更新触发器（数据变化时应该改变这个值） */
  updateTrigger: any;
  /** 动画类型 */
  type?: 'highlight' | 'pulse' | 'shake' | 'bounce';
  /** 动画持续时间 */
  duration?: AnimationDuration;
  /** 高亮颜色 */
  highlightColor?: string;
  /** 自定义CSS类名 */
  className?: string;
  /** 内联样式 */
  style?: React.CSSProperties;
  /** 是否禁用动画 */
  disableAnimation?: boolean;
}

export const UpdateAnimation: React.FC<UpdateAnimationProps> = ({
  children,
  updateTrigger,
  type = 'highlight',
  duration = 'normal',
  highlightColor = '#fff3cd',
  className,
  style,
  disableAnimation = false
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const previousTrigger = useRef(updateTrigger);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const getDurationMs = () => {
    switch (duration) {
      case 'fast': return 300;
      case 'slow': return 800;
      default: return 500;
    }
  };

  useEffect(() => {
    // 检测数据变化
    if (
      !disableAnimation && 
      previousTrigger.current !== undefined && 
      previousTrigger.current !== updateTrigger
    ) {
      setIsAnimating(true);
      
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // 设置动画结束定时器
      timeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, getDurationMs());
    }
    
    previousTrigger.current = updateTrigger;
  }, [updateTrigger, disableAnimation]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getAnimationClass = () => {
    if (!isAnimating || disableAnimation) return '';
    return `update-animation-${type}`;
  };

  const getAnimationStyle = (): React.CSSProperties => {
    if (!isAnimating || disableAnimation) return style || {};
    
    const baseStyle = style || {};
    
    if (type === 'highlight') {
      return {
        ...baseStyle,
        backgroundColor: highlightColor,
        transition: `background-color ${getDurationMs()}ms ease-out`,
      };
    }
    
    return {
      ...baseStyle,
      animationDuration: `${getDurationMs()}ms`,
    };
  };

  return (
    <div
      className={`update-animation-container ${getAnimationClass()} ${className || ''}`}
      style={getAnimationStyle()}
    >
      {children}
    </div>
  );
};
