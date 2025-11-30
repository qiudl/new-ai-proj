import React from 'react';
import ReactDOM from 'react-dom/client';

// Fix for browser extensions that interfere with React DOM operations
// This prevents "insertBefore" errors caused by extensions like translators
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function<T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (console) {
        console.warn('Cannot remove a child from a different parent', child, this);
      }
      return child;
    }
    return originalRemoveChild.apply(this, [child]) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function<T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) {
        console.warn('Cannot insert before a reference node from a different parent', referenceNode, this);
      }
      return newNode;
    }
    return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
  };
}

import './index.css';
import './styles/z-index-management.css';
// import './styles/modal-fix.css';          // 禁用旧修复方案
// import './styles/emergency-modal-fix.css'; // 禁用紧急修复方案
// import './styles/unified-modal-fix.css';  // 禁用统一修复方案
import './styles/antd5-modal-fix.css';       // 启用Ant Design 5专用修复
import App from './App';
import reportWebVitals from './reportWebVitals';
import { FeatureFlagService } from './utils/featureFlags';
import { getFeatureFlagConfig } from './config/featureFlagConfig';

// Suppress development warnings for known issues
if (process.env.NODE_ENV === 'development') {
  import('./utils/consoleFilter');
}

// Import chunk loading error handler (must be static import to avoid circular dependency)
import './utils/chunkErrorHandler';

// Import unified modal fix utility - 暂时禁用
// import { initUnifiedModalFix } from './utils/unifiedModalFix';

// Import console debug commands in development
if (process.env.NODE_ENV === 'development') {
  import('./utils/consoleCommands');
}

// Initialize Feature Flags
FeatureFlagService.init(getFeatureFlagConfig());

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize unified modal fix after React has rendered - 暂时禁用
// setTimeout(() => {
//   initUnifiedModalFix();
// }, 1000);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();