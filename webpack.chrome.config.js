const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const ChromeHotReloadPlugin = require('./webpack-plugins/chrome-hot-reload-plugin');

module.exports = {
  mode: 'development',
  entry: {
    'chrome/background': './src/chrome/background.ts',
    'chrome/content-script': './src/chrome/content-script.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: false,
  },
  resolve: {
    extensions: ['.ts', '.js', '.vue'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          appendTsSuffixTo: [/\.vue$/],
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new ChromeHotReloadPlugin({
      port: 9090,
      entries: ['chrome/background', 'chrome/content-script']
    }),
  ],
  optimization: {
    splitChunks: false,
  },
  devtool: 'source-map',
  watch: true,
  watchOptions: {
    ignored: /node_modules/,
    poll: 1000,
  },
};