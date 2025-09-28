// Console filter to suppress known development warnings
// This helps clean up the console while we migrate to newer React patterns

const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

const suppressedWarnings = [
  'findDOMNode is deprecated',
  'Warning: findDOMNode is deprecated',
  'ReactDOM.findDOMNode is deprecated'
];

const shouldSuppressMessage = (message: string): boolean => {
  return suppressedWarnings.some(warning => 
    message.includes(warning)
  );
};

// Override console.warn to filter findDOMNode warnings
console.warn = (...args: unknown[]) => {
  const message = args.join(' ');
  if (!shouldSuppressMessage(message)) {
    originalConsoleWarn.apply(console, args);
  }
};

// Override console.error for error messages
console.error = (...args: unknown[]) => {
  const message = args.join(' ');
  if (!shouldSuppressMessage(message)) {
    originalConsoleError.apply(console, args);
  }
};

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