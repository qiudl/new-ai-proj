/**
 * TaskProgressInline - Inline task progress bar component
 *
 * Simple wrapper around TaskProgressBar for inline display
 */

import React from 'react';
import { TaskProgressBar } from '../../../../components/TaskProgressBar';

export interface TaskProgressInlineProps {
  /** Task ID */
  taskId: number;
  /** Task status */
  status: 'todo' | 'in_progress' | 'blocked' | 'completed';
  /** Custom styles */
  style?: React.CSSProperties;
}

export const TaskProgressInline: React.FC<TaskProgressInlineProps> = React.memo(
  ({ taskId, status, style }) => {
    return (
      <div style={style}>
        <TaskProgressBar
          percent={0}
          percentDisplay={0}
          estimateText={undefined}
          actualText={undefined}
          overrunPercent={0}
          status={status}
          breakdown={undefined}
        />
      </div>
    );
  }
);

TaskProgressInline.displayName = 'TaskProgressInline';

export default TaskProgressInline;
