// Console filter to suppress known development warnings
// This helps clean up the console while we migrate to newer React patterns

// Store original console methods BEFORE any overrides
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);
const originalConsoleLog = console.log.bind(console);

const suppressedWarnings = [
  'findDOMNode is deprecated',
  'Warning: findDOMNode is deprecated',
  'ReactDOM.findDOMNode is deprecated'
];

// Simple and safe message checking
const shouldSuppressMessage = (args: unknown[]): boolean => {
  try {
    // Only check the first argument if it's a string
    const firstArg = args[0];
    if (typeof firstArg === 'string') {
      return suppressedWarnings.some(warning => firstArg.includes(warning));
    }
    return false;
  } catch {
    return false;
  }
};

// Safe console override that avoids recursion
const createSafeConsoleMethod = (originalMethod: (...args: any[]) => void) => {
  return (...args: unknown[]) => {
    try {
      if (shouldSuppressMessage(args)) {
        return; // Suppress this message
      }
      originalMethod(...args);
    } catch (error) {
      // If anything goes wrong, use the original console directly
      // This prevents infinite recursion by not calling our overridden methods
      originalConsoleError('Console filter error:', error);
      originalMethod(...args);
    }
  };
};

// Only override console methods in development
if (process.env.NODE_ENV === 'development') {
  console.warn = createSafeConsoleMethod(originalConsoleWarn);
  // Note: Only override console.warn for now, not console.error to avoid recursion
  // console.error = createSafeConsoleMethod(originalConsoleError);
}

// Export for manual restoration if needed
export const restoreConsole = () => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
};

export default {
  suppressedWarnings,
  shouldSuppressMessage,
  restoreConsole
};
