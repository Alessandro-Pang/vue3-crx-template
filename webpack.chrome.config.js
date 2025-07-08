/*
 * @Author: zi.yang
 * @Date: 2025-07-07 07:54:00
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-08 07:47:44
 * @Description: 
 * @FilePath: /vue3-crx-template/webpack.chrome.config.js
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { VueLoaderPlugin } from 'vue-loader';
import webpack from 'webpack';

import ChromeHotReloadPlugin
  from './webpack-plugins/chrome-hot-reload-plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
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
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: 'false',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    }),
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