const path = require('path');

module.exports = {
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