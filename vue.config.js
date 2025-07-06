/*
 * @Author: zi.yang
 * @Date: 2024-07-21 17:36:34
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-06 15:51:43
 * @Description:
 * @FilePath: /vue3-crx-template/vue.config.js
 */
const { defineConfig } = require('@vue/cli-service');

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

module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  pages: createPagesIndex(),
  devServer: {
    hot: true, // 禁用webpack热重载，使用自定义Chrome扩展重载
    liveReload: true, // 禁用默认实时重载，使用自定义机制
    devMiddleware: {
      writeToDisk: true, // 确保文件写入磁盘，Chrome扩展需要
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
  },
  configureWebpack: {
    devtool:
      process.env.NODE_ENV === 'production' ? false : 'inline-source-map',
    entry: {
      'chrome:background': './src/chrome/background.ts',
      'chrome:content-script': './src/chrome/content-script.ts',
    },
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
