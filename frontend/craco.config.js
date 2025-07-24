const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Fix HTML webpack plugin path resolution in Docker
      const htmlWebpackPlugin = webpackConfig.plugins.find(
        plugin => plugin.constructor.name === 'HtmlWebpackPlugin'
      );
      
      if (htmlWebpackPlugin) {
        // Ensure template path is resolved correctly
        htmlWebpackPlugin.options.template = path.resolve(__dirname, 'public/index.html');
      }

      // Fix module resolution for Docker
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        modules: [
          path.resolve(__dirname, 'node_modules'),
          'node_modules'
        ]
      };

      // Fix loader resolution
      webpackConfig.resolveLoader = {
        ...webpackConfig.resolveLoader,
        modules: [
          path.resolve(__dirname, 'node_modules'),
          'node_modules'
        ]
      };

      return webpackConfig;
    }
  },

  devServer: {
    host: '0.0.0.0',
    port: 3000,
    watchOptions: {
      poll: true,
      ignored: /node_modules/
    }
  }
};