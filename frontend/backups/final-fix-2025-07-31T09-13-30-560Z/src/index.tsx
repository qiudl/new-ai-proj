import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress development warnings for known issues
if (process.env.NODE_ENV === 'development') {
  import('./utils/consoleFilter');
}

// Import chunk loading error handler
import('./utils/chunkErrorHandler');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
console.log("🚀 Frontend Config:", {
  "API_URL": process.env.REACT_APP_API_URL,
  "NODE_ENV": process.env.NODE_ENV,
  "Current URL": window.location.origin
});
