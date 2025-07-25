import React from 'react';
import { Resizable } from 'react-resizable';

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