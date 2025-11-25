const path = require('path');

module.exports = {
  eslint: {
    enable: false, // 禁用ESLint，避免插件问题
  },
  typescript: {
    enableTypeChecking: false, // 禁用TypeScript类型检查以提升性能
  },
  webpack: {
    configure: (webpackConfig) => {
      // 完全移除ForkTsCheckerWebpackPlugin以避免内存问题
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
      );

      // 优化chunk命名和分割策略（性能优化版本）
      if (webpackConfig.optimization) {
        // 只覆盖splitChunks，保留CRA的其他优化配置
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          maxInitialRequests: 30,
          maxAsyncRequests: 30,
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // React核心库（最高优先级）
            react: {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom|react-router)[\\/]/,
              chunks: 'all',
              priority: 40,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Ant Design UI库
            antd: {
              name: 'vendor-antd',
              test: /[\\/]node_modules[\\/]antd[\\/]/,
              chunks: 'all',
              priority: 35,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Ant Design图标（体积大，单独拆分）
            antdIcons: {
              name: 'vendor-antd-icons',
              test: /[\\/]node_modules[\\/]@ant-design[\\/](icons|icons-svg)[\\/]/,
              chunks: 'all',
              priority: 37,
              enforce: true,
              reuseExistingChunk: true,
            },
            // ECharts图表库（体积大，单独拆分）
            echarts: {
              name: 'vendor-echarts',
              test: /[\\/]node_modules[\\/](echarts|zrender)[\\/]/,
              chunks: 'all',
              priority: 32,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Recharts和Ant Design Charts
            charts: {
              name: 'vendor-charts',
              test: /[\\/]node_modules[\\/](recharts|@antv|@ant-design\/plots|@ant-design\/charts)[\\/]/,
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Redux状态管理
            redux: {
              name: 'vendor-redux',
              test: /[\\/]node_modules[\\/](redux|react-redux|@reduxjs)[\\/]/,
              chunks: 'all',
              priority: 28,
              reuseExistingChunk: true,
            },
            // React Query (TanStack)
            query: {
              name: 'vendor-query',
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              chunks: 'all',
              priority: 27,
              reuseExistingChunk: true,
            },
            // Axios和HTTP客户端
            axios: {
              name: 'vendor-axios',
              test: /[\\/]node_modules[\\/](axios)[\\/]/,
              chunks: 'all',
              priority: 26,
              reuseExistingChunk: true,
            },
            // Moment.js（日期库，体积大）
            moment: {
              name: 'vendor-moment',
              test: /[\\/]node_modules[\\/]moment[\\/]/,
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },
            // Lodash工具库
            lodash: {
              name: 'vendor-lodash',
              test: /[\\/]node_modules[\\/]lodash[\\/]/,
              chunks: 'all',
              priority: 24,
              reuseExistingChunk: true,
            },
            // 其他第三方库
            vendors: {
              name: 'vendors',
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              priority: 10,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // 公共代码（被多次引用的代码）
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
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
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 3000,
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
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug'
      }
    }
  }
};