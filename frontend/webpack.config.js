const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // Resolve webpack path issues in Docker
  resolve: {
    modules: [
      path.resolve(__dirname, 'node_modules'),
      'node_modules'
    ],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  },
  
  // Fix HTML webpack plugin loader path
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      templateParameters: {
        PUBLIC_URL: process.env.PUBLIC_URL || ''
      }
    })
  ],
  
  // Ensure proper module resolution
  resolveLoader: {
    modules: [
      path.resolve(__dirname, 'node_modules'),
      'node_modules'
    ]
  }
};