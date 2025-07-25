declare module 'react-resizable' {
  import { ReactNode } from 'react';
  
  export interface ResizableProps {
    width: number;
    height: number;
    onResize: (e: any, data: { size: { width: number; height: number } }) => void;
    children: ReactNode;
    handle?: ReactNode;
    draggableOpts?: any;
  }
  
  export const Resizable: React.FC<ResizableProps>;
  export const ResizableBox: any;
}