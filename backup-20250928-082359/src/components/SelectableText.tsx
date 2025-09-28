import React from 'react';
import { theme } from 'antd';

interface SelectableTextProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div' | 'span';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const SelectableText: React.FC<SelectableTextProps> = ({ 
  as = 'div', 
  level, 
  children, 
  className = '',
  style: customStyle = {}
}) => {
  const { token } = theme.useToken();

  const getBaseStyles = (): React.CSSProperties => ({
    userSelect: 'text',
    WebkitUserSelect: 'text',
    MozUserSelect: 'text',
    msUserSelect: 'text',
    cursor: 'text',
    fontFamily: token.fontFamily,
    color: token.colorText,
    lineHeight: token.lineHeight,
    margin: 0,
    padding: 0,
  });

  const getElementStyles = (): React.CSSProperties => {
    const baseStyles = getBaseStyles();
    
    // 如果明确指定了level，使用level对应的样式
    if (level && (as.startsWith('h') || as === 'div')) {
      return getHeadingStyles(level, baseStyles);
    }
    
    // 否则根据as属性决定样式
    switch (as) {
      case 'h1':
        return getHeadingStyles(1, baseStyles);
      case 'h2':
        return getHeadingStyles(2, baseStyles);
      case 'h3':
        return getHeadingStyles(3, baseStyles);
      case 'h4':
        return getHeadingStyles(4, baseStyles);
      case 'h5':
        return getHeadingStyles(5, baseStyles);
      case 'h6':
        return getHeadingStyles(6, baseStyles);
      case 'p':
        return {
          ...baseStyles,
          fontSize: token.fontSize,
          lineHeight: token.lineHeightLG,
          marginBottom: token.marginMD,
        };
      case 'span':
        return {
          ...baseStyles,
          fontSize: token.fontSize,
          display: 'inline',
        };
      default:
        return baseStyles;
    }
  };

  const getHeadingStyles = (headingLevel: number, baseStyles: React.CSSProperties): React.CSSProperties => {
    const headingConfig = {
      1: {
        fontSize: token.fontSizeHeading1,
        fontWeight: 600,
        lineHeight: token.lineHeightHeading1,
        marginBottom: token.marginLG,
        marginTop: token.marginXL,
      },
      2: {
        fontSize: token.fontSizeHeading2,
        fontWeight: 600,
        lineHeight: token.lineHeightHeading2,
        marginBottom: token.marginLG,
        marginTop: token.marginXL,
      },
      3: {
        fontSize: token.fontSizeHeading3,
        fontWeight: 600,
        lineHeight: token.lineHeightHeading3,
        marginBottom: token.marginMD,
        marginTop: token.marginLG,
      },
      4: {
        fontSize: token.fontSizeHeading4,
        fontWeight: 600,
        lineHeight: token.lineHeightHeading4,
        marginBottom: token.marginMD,
        marginTop: token.marginLG,
      },
      5: {
        fontSize: token.fontSizeHeading5,
        fontWeight: 600,
        lineHeight: token.lineHeightHeading5,
        marginBottom: token.marginSM,
        marginTop: token.marginMD,
      },
      6: {
        fontSize: token.fontSizeSM,
        fontWeight: 600,
        lineHeight: token.lineHeight,
        marginBottom: token.marginSM,
        marginTop: token.marginMD,
        color: token.colorTextSecondary,
      },
    };

    return {
      ...baseStyles,
      ...headingConfig[headingLevel as keyof typeof headingConfig],
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 阻止事件冒泡，避免干扰文本选择
    e.stopPropagation();
  };

  const handleSelectStart = (e: React.SyntheticEvent) => {
    // 确保选择事件不被阻止
    e.stopPropagation();
  };

  const finalStyles = {
    ...getElementStyles(),
    ...customStyle,
  };

  const Component = as as keyof JSX.IntrinsicElements;
  
  return (
    <Component 
      style={finalStyles} 
      className={`selectable-text ${className}`.trim()}
      onMouseDown={handleMouseDown}
      onSelectStart={handleSelectStart}
    >
      {children}
    </Component>
  );
};

export default SelectableText;