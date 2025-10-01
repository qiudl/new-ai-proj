const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy API requests to backend
  // Detect if running in Docker container by checking for .dockerenv file or container hostname
  const isInDocker = require('fs').existsSync('/.dockerenv') || 
                     require('os').hostname().length === 12; // Docker containers typically have 12-char hostnames
  
  // In local development, backend listens on 8080
  const backendUrl = isInDocker 
    ? 'http://backend:8080'    // Docker service name when running in container
    : 'http://localhost:8080'; // Host machine when running locally
  
  // Backend URL logging removed to reduce debug noise
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      // Bypass any external proxies for localhost
      agent: false,
      // Additional options for development
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
      // No pathRewrite - keep the original path
      pathRewrite: {
        '^/api': '/api' // 确保路径正确
      },
      // 添加调试日志
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[PROXY] ${req.method} ${req.url} -> ${backendUrl}${req.url}`);
      },
      onError: (err, req, res) => {
        console.error(`[PROXY ERROR] ${req.method} ${req.url}:`, err.message);
      }
    })
  );
};
