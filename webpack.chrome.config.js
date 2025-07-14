/*
 * @Author: zi.yang
 * @Date: 2025-07-07 07:54:00
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-14 08:17:51
 * @Description:
 * @FilePath: /vue3-crx-template/webpack.chrome.config.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { VueLoaderPlugin } from 'vue-loader';
import webpack from 'webpack';

import ChromeHotReloadPlugin
  from './webpack-plugins/chrome-hot-reload-plugin.js';
import ManifestProcessorPlugin
  from './webpack-plugins/manifest-processor-plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 动态扫描 chrome 目录下的脚本文件
 * @returns {Object} webpack 入口配置
 */
function createChromeEntries() {
  const entries = {};
  const chromeDir = path.resolve(__dirname, 'src/chrome');

  if (fs.existsSync(chromeDir)) {
    const files = fs.readdirSync(chromeDir);

    files.forEach((file) => {
      const filePath = path.join(chromeDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.js'))) {
        const name = file.replace(/\.(ts|js)$/, '');
        entries[`chrome/${name}`] = `./src/chrome/${file}`;
      }
    });
  }

  return entries;
}

export default {
  mode: 'development',
  entry: createChromeEntries(),
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
      entries: Object.keys(createChromeEntries()),
    }),
    new ManifestProcessorPlugin({
      isDev: true,
      autoDetectScripts: true,
      outputPath: 'manifest.json',
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
