const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // 修复 chunk 加载问题
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              enforce: true
            },
            antd: {
              test: /[\\/]node_modules[\\/](@ant-design|antd)[\\/]/,
              name: 'antd',
              chunks: 'all',
              priority: 10,
              enforce: true
            }
          }
        },
        // 确保 chunk 文件名稳定
        chunkIds: 'named',
        moduleIds: 'named'
      };

      // 修复模块解析
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        modules: [
          path.resolve(__dirname, 'node_modules'),
          'node_modules'
        ],
        fallback: {
          ...webpackConfig.resolve.fallback
        }
      };

      // 修复加载器解析
      webpackConfig.resolveLoader = {
        ...webpackConfig.resolveLoader,
        modules: [
          path.resolve(__dirname, 'node_modules'),
          'node_modules'
        ]
      };

      // 添加公共路径配置
      webpackConfig.output = {
        ...webpackConfig.output,
        publicPath: '/',
        chunkFilename: 'static/js/[name].[contenthash:8].chunk.js'
      };

      return webpackConfig;
    }
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
    watchOptions: {
      poll: true,
      ignored: /node_modules/
    },
    client: {
      webSocketURL: 'ws://localhost/ws'
    }
  }
};
