/*
 * @Author: zi.yang
 * @Date: 2025-07-07 07:50:16
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-13 11:33:00
 * @Description: 
 * @FilePath: /vue3-crx-template/vue.config.js
 */
import { defineConfig } from '@vue/cli-service';

import ManifestProcessorPlugin
  from './webpack-plugins/manifest-processor-plugin.js';

/**
 * 多页面入口
 * @type {string[]}
 */
const chromePageList = ['devtools', 'options', 'popup', 'side-panel', 'panel'];

/**
 * 动态创建多入口配置
 * @returns {{}}
 */
function createPagesIndex() {
  return chromePageList.reduce((pages, pageName) => {
    pages[pageName] = {
      entry: `src/views/${pageName}/main.ts`,
      template: 'public/index.html',
      filename: `${pageName}.html`,
    };
    return pages;
  }, {});
}

// webpack 入口配置，用于打包插件的背景脚本和内容脚本
const chromeWebpack = {
  'chrome:background': './src/chrome/background.ts',
  'chrome:content-script': './src/chrome/content-script.ts',
}

const isProd = process.env.NODE_ENV === 'production';
export default defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  pages: createPagesIndex(),
  devServer: {
    hot: true,
    liveReload: true,
    devMiddleware: {
      writeToDisk: true,
    },
  },
  chainWebpack(config) {
    config.optimization.splitChunks(false);
    config.plugin('define').tap((definitions) => {
      Object.assign(definitions[0], {
        __VUE_OPTIONS_API__: 'false',
        __VUE_PROD_DEVTOOLS__: 'false',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
      });
      return definitions;
    });

    // 添加 Manifest 处理插件
    config.plugin('manifest-processor').use(ManifestProcessorPlugin, [{
      isDev: process.env.NODE_ENV !== 'production'
    }]);

    if (process.env.NODE_ENV === 'production') {
      config.plugin('extract-css').tap((args) => {
        args[0].filename = (pathData) => {
          if (pathData.chunk.name.startsWith('chrome:')) {
            const path = pathData.chunk.name.replace(':', '/');
            return `${path}.css`;
          }
          return 'css/[name].[contenthash].css'
        }
        return args;
      })
    }
  },
  configureWebpack: {
    devtool: isProd ? false : 'inline-source-map',
    entry: isProd ? chromeWebpack : {},
    output: {
      filename: (pathData) => {
        if (pathData.chunk.name.startsWith('chrome:')) {
          const path = pathData.chunk.name.replace(':', '/');
          return `${path}.js`;
        }
        return 'js/[name].[contenthash].js';
      },
    },
  },
});
