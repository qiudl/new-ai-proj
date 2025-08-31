import React from 'react';

// Dynamic import for react-resizable
let Resizable: any = null;
try {
  const resizable = require('react-resizable');
  Resizable = resizable.Resizable;
} catch (error) {
  console.warn('react-resizable not available, resizing will be disabled');
}

interface ResizableTitleProps {
  onResize: (width: number) => void;
  width: number;
  children: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
}

const ResizableTitle: React.FC<ResizableTitleProps> = ({
  onResize,
  width,
  children,
  minWidth = 80,
  maxWidth = 800,
}) => {
  // If Resizable is not available, render a simple div
  if (!Resizable) {
    return (
      <div style={{ width, position: 'relative' }}>
        {children}
      </div>
    );
  }

  return (
    <Resizable
      width={width}
      height={0}
      onResize={(e: any, { size }: { size: { width: number; height: number } }) => {
        // 限制宽度范围
        const newWidth = Math.max(minWidth, Math.min(maxWidth, size.width));
        onResize(newWidth);
      }}
      draggableOpts={{ enableUserSelectHack: false }}
      handle={
        <span
          className="react-resizable-handle"
          style={{
            position: 'absolute',
            right: -5,
            bottom: 0,
            top: 0,
            width: 10,
            cursor: 'col-resize',
            backgroundColor: 'transparent',
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      }
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          userSelect: 'none',
        }}
      >
        {children}
      </div>
    </Resizable>
  );
};

export default ResizableTitle;