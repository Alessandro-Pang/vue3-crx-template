const { defineConfig } = require("@vue/cli-service");

/**
 * 多页面入口
 * @type {string[]}
 */
const chromePageList = ["devtools", "options", "popup", "side-panel", "panel"];

/**
 * 动态创建多入口配置
 * @returns {{}}
 */
function createPagesIndex() {
  return chromePageList.reduce((pages, pageName) => {
    pages[pageName] = {
      entry: `src/views/${pageName}/main.ts`,
      template: "public/index.html",
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
    hot: false,
    devMiddleware: {
      writeToDisk: true,
    },
  },
  chainWebpack(config) {
    config.optimization.splitChunks(false);
  },
  configureWebpack: {
    devtool: process.env.NODE_ENV === "production" ? false : "source-map",
    entry: {
      "chrome:background": "./src/chrome/background.ts",
      "chrome:content-script": "./src/chrome/content-script.ts",
    },
    output: {
      filename: (pathData) => {
        if (pathData.chunk.name.startsWith("chrome:")) {
          const path = pathData.chunk.name.replace(":", "/");
          return `${path}.js`;
        }
        return "js/[name].[contenthash].js";
      },
    },
  },
});
