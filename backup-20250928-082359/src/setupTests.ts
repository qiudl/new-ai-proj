// Phase 5: 测试优化 - 测试环境配置
import '@testing-library/jest-dom';

// Mock Web APIs that might not be available in test environment
global.matchMedia = global.matchMedia || function (query: string) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
};

// Mock ResizeObserver
global.ResizeObserver = global.ResizeObserver || class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
(global as any).IntersectionObserver = (global as any).IntersectionObserver || class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};

// Mock requestAnimationFrame
global.requestAnimationFrame = global.requestAnimationFrame || function (callback: FrameRequestCallback): number {
  return setTimeout(callback, 16);
};

global.cancelAnimationFrame = global.cancelAnimationFrame || function (id: number): void {
  clearTimeout(id);
};

// Mock getComputedStyle
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = function (element: Element, pseudoElt?: string | null) {
  const style = originalGetComputedStyle(element, pseudoElt);
  
  // Add missing properties that might be needed in tests
  if (!style.transform) {
    (style as any).transform = 'none';
  }
  if (!style.transition) {
    (style as any).transition = 'none';
  }
  
  return style;
};

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock file API
(global as any).File = class File extends Blob {
  constructor(chunks: any[], filename: string, options?: any) {
    super(chunks, options);
    this.name = filename;
    this.lastModified = Date.now();
    this.webkitRelativePath = '';
  }
  name: string;
  lastModified: number;
  webkitRelativePath: string;
};

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
});

// Mock speech synthesis API
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn().mockReturnValue([]),
  onvoiceschanged: null,
  paused: false,
  pending: false,
  speaking: false
};

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis
});

// Mock performance API
if (!global.performance) {
  (global as any).performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    timing: {} as PerformanceTiming,
    navigation: {} as PerformanceNavigation,
    onresourcetimingbufferfull: null,
    clearResourceTimings: jest.fn(),
    setResourceTimingBufferSize: jest.fn(),
    toJSON: jest.fn(),
    eventCounts: new Map(),
    timeOrigin: 0,
    getEntries: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  } as any;
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true
});

// Mock document.elementFromPoint
document.elementFromPoint = jest.fn();

// Mock document.caretRangeFromPoint
document.caretRangeFromPoint = jest.fn();

// Mock touch events for mobile testing
class MockTouch implements Touch {
  constructor(
    public identifier: number,
    public clientX: number,
    public clientY: number,
    public screenX: number = clientX,
    public screenY: number = clientY,
    public pageX: number = clientX,
    public pageY: number = clientY,
    public radiusX: number = 0,
    public radiusY: number = 0,
    public rotationAngle: number = 0,
    public force: number = 1,
    public target: EventTarget = document.body
  ) {}
}

if (!global.Touch) {
  global.Touch = MockTouch as any;
}

// Mock TouchEvent
if (!global.TouchEvent) {
  global.TouchEvent = class TouchEvent extends UIEvent {
    constructor(type: string, eventInitDict?: TouchEventInit) {
      super(type, eventInitDict);
      this.touches = (eventInitDict?.touches as any) || [];
      this.targetTouches = (eventInitDict?.targetTouches as any) || [];
      this.changedTouches = (eventInitDict?.changedTouches as any) || [];
      this.altKey = eventInitDict?.altKey || false;
      this.metaKey = eventInitDict?.metaKey || false;
      this.ctrlKey = eventInitDict?.ctrlKey || false;
      this.shiftKey = eventInitDict?.shiftKey || false;
    }
    
    touches: TouchList;
    targetTouches: TouchList;
    changedTouches: TouchList;
    altKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
  } as any;
}

// Mock DragEvent
if (!global.DragEvent) {
  global.DragEvent = class DragEvent extends MouseEvent {
    constructor(type: string, eventInitDict?: DragEventInit) {
      super(type, eventInitDict);
      this.dataTransfer = eventInitDict?.dataTransfer || null;
    }
    
    dataTransfer: DataTransfer | null;
  } as any;
}

// Mock DataTransfer
if (!(global as any).DataTransfer) {
  (global as any).DataTransfer = class DataTransfer {
    dropEffect: 'none' | 'copy' | 'move' | 'link' = 'none';
    effectAllowed: string = 'uninitialized';
    files: FileList = [] as any;
    items: DataTransferItemList = [] as any;
    types: readonly string[] = [];

    clearData(format?: string): void {}
    getData(format: string): string { return ''; }
    setData(format: string, data: string): void {}
    setDragImage(element: Element, x: number, y: number): void {}
  };
}

// Mock crypto.randomUUID for tests that might need it
if (!global.crypto) {
  global.crypto = {
    randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    getRandomValues: jest.fn((arr: any) => arr)
  } as any;
}

// Mock Worker for tests that might use web workers
(global as any).Worker = class Worker extends EventTarget {
  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    super();
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
  }
  
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null;
  
  postMessage(message: any, transfer: Transferable[]): void;
  postMessage(message: any, options?: StructuredSerializeOptions): void;
  postMessage(message: any, transferOrOptions?: Transferable[] | StructuredSerializeOptions): void {}
  terminate(): void {}
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    super.addEventListener(type, listener, options);
  }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
    super.removeEventListener(type, listener, options);
  }
};

// Console utilities for test debugging
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Filter out known React warnings that are not actual issues
console.error = (...args: any[]) => {
  const message = args[0];
  
  // Filter out known harmless warnings in tests
  if (
    typeof message === 'string' && (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Warning: React.createFactory() is deprecated') ||
      message.includes('Warning: componentWillReceiveProps has been renamed')
    )
  ) {
    return;
  }
  
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  const message = args[0];
  
  // Filter out known harmless warnings in tests
  if (
    typeof message === 'string' && (
      message.includes('Warning: Using UNSAFE_') ||
      message.includes('Warning: componentWillMount has been renamed')
    )
  ) {
    return;
  }
  
  originalConsoleWarn(...args);
};

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveStyle(style: Record<string, any>): R;
      toHaveClass(className: string): R;
      toHaveAttribute(attribute: string, value?: string): R;
    }
  }
}

// Test cleanup utilities
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
  
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Reset document body
  document.body.innerHTML = '';
  
  // Reset document.documentElement classes
  document.documentElement.className = '';
  
  // Reset CSS custom properties
  document.documentElement.style.cssText = '';
});

// Performance monitoring for tests
const testStartTimes = new Map<string, number>();

beforeEach(() => {
  const testName = expect.getState().currentTestName || 'unknown';
  testStartTimes.set(testName, performance.now());
});

afterEach(() => {
  const testName = expect.getState().currentTestName || 'unknown';
  const startTime = testStartTimes.get(testName);
  
  if (startTime) {
    const duration = performance.now() - startTime;
    
    // Warn about slow tests (over 5 seconds)
    if (duration > 5000) {
      console.warn(`⚠️  Slow test detected: "${testName}" took ${duration.toFixed(2)}ms`);
    }
    
    testStartTimes.delete(testName);
  }
});

// Global error boundary for test environment
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};