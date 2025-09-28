import React from 'react';
import TimerCard from './TimerCard';
import TimerErrorBoundary from './TimerErrorBoundary';

interface TimerCardWrapperProps {
  onTimerUpdate?: (isRunning: boolean, taskTitle?: string) => void;
}

// Wrapper to prevent findDOMNode warnings in development
const TimerCardWrapper: React.FC<TimerCardWrapperProps> = (props) => {
  return (
    <TimerErrorBoundary>
      <TimerCard {...props} />
    </TimerErrorBoundary>
  );
};

export default TimerCardWrapper;