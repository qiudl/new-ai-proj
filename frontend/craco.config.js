const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // 优化chunk命名和分割策略
      if (webpackConfig.optimization) {
        webpackConfig.optimization.splitChunks = {
          ...webpackConfig.optimization.splitChunks,
          chunks: 'all',
          maxInitialRequests: 10,
          maxAsyncRequests: 10,
          minSize: 20000,
          maxSize: 300000, // 限制chunk大小防止文件名过长
          cacheGroups: {
            // 将antd相关依赖单独分组
            antd: {
              name: 'antd',
              test: /[\\/]node_modules[\\/]antd[\\/]/,
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
            // antd图标单独分组
            antdIcons: {
              name: 'antd-icons', 
              test: /[\\/]node_modules[\\/]@ant-design[\\/]icons[\\/]/,
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },
            // 其他vendor依赖
            vendor: {
              name: 'vendors',
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
            // React相关
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            }
          }
        };
      }

      // 确保输出配置正确
      if (webpackConfig.output) {
        webpackConfig.output.publicPath = '/';
      }

      return webpackConfig;
    },
  },
  devServer: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*'
    },
    static: {
      directory: path.join(__dirname, 'public'),
      publicPath: '/'
    },
    historyApiFallback: {
      disableDotRule: true,
      index: '/index.html'
    },
    watchFiles: {
      paths: ['src/**/*'],
      options: {
        usePolling: true,
        ignored: /node_modules/
      }
    },
    client: {
      webSocketURL: 'ws://localhost:3000/ws'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug'
      },
      '/ws': {
        target: 'ws://localhost:8081',
        ws: true,
        changeOrigin: true,
        secure: false,
        logLevel: 'debug'
      }
    }
  }
};