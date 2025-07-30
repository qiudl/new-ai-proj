// TypeScript type check test
import { AppError, ErrorType } from '../frontend/src/utils/errorHandling';

// Test error handling types
function testErrorHandling() {
  try {
    throw new AppError('Test error', ErrorType.VALIDATION, 400);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      console.log(error.type, error.statusCode, error.message);
    } else if (error instanceof Error) {
      console.log(error.message);
    } else {
      console.log('Unknown error');
    }
  }
}

// Fix navigation function type issue
function testNavigation() {
  // Mock navigate function for testing
  const navigateFunction: ((path: string) => void) | undefined = (path: string) => {
    console.log('Navigating to:', path);
  };
  
  if (navigateFunction && typeof navigateFunction === 'function') {
    const nav = navigateFunction;
    nav('/login');
  }
}

export { testErrorHandling };
