const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy API requests to backend
  // Detect if running in Docker container by checking for .dockerenv file or container hostname
  const isInDocker = require('fs').existsSync('/.dockerenv') || 
                     require('os').hostname().length === 12; // Docker containers typically have 12-char hostnames
  
  // In local development, backend listens on 8081
  const backendUrl = isInDocker 
    ? 'http://backend:8080'    // Docker container name when running in container
    : 'http://localhost:8081'; // Host machine when running locally
  
  console.log(`[PROXY] Backend URL: ${backendUrl}`);
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      // Bypass any external proxies for localhost
      agent: false,
      // Additional options for development
      logLevel: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
      // No pathRewrite - keep the original path
    })
  );
};
