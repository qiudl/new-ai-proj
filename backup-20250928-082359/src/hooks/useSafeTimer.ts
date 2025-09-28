import { useContext } from 'react';
import TimerContext from '../contexts/TimerContext';

// Safe version of useTimer that provides fallback values when TimerProvider is not available
export const useSafeTimer = () => {
  const context = useContext(TimerContext);
  
  // If context is undefined, return default values instead of throwing error
  if (context === undefined) {
    console.warn('useSafeTimer: TimerProvider not found, using fallback values');
    return {
      timerState: { 
        isRunning: false, 
        isPaused: false, 
        elapsedSeconds: 0, 
        formattedTime: '00:00:00' 
      },
      isLoading: false,
      connectionStatus: 'disconnected' as const,
      mode: 'full' as const,
      setMode: () => { console.warn('Timer not available'); },
      startTimer: async () => { 
        console.warn('Timer not available'); 
        return false; 
      },
      stopTimer: async () => { 
        console.warn('Timer not available'); 
        return false; 
      },
      pauseTimer: async () => { 
        console.warn('Timer not available'); 
        return false; 
      },
      resumeTimer: async () => { 
        console.warn('Timer not available'); 
        return false; 
      },
      refreshTimer: async () => { 
        console.warn('Timer not available'); 
      },
      isTaskTiming: () => false,
      getDebugInfo: () => ({ error: 'TimerProvider not available' }),
      onTimerUpdate: () => { console.warn('Timer not available'); }
    };
  }
  
  return context;
};

export default useSafeTimer;