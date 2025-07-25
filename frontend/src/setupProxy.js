const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy API requests to backend
  // Use localhost for development since frontend runs on host machine
  const backendUrl = process.env.NODE_ENV === 'production' 
    ? 'http://backend:8080'  // Docker container name for production
    : 'http://localhost:8080'; // Host machine for development
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      // Bypass any external proxies for localhost
      agent: false,
      // Additional options for development
      logLevel: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
    })
  );
};