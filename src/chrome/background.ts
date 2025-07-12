/*
 * @Author: zi.yang
 * @Date: 2024-07-18 12:53:11
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-09 08:11:09
 * @Description:
 * @FilePath: /vue3-crx-template/src/chrome/background.ts
 */
// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
  // 设置默认存储数据
  chrome.storage.local.set({
    extensionEnabled: true,
    installTime: new Date().toISOString(),
    version: chrome.runtime.getManifest().version,
  });

  // 如果是首次安装，可以打开欢迎页面
  if (details.reason === 'install') {
    console.log('首次安装扩展程序');
  }
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 可以在这里执行一些后台任务
    // 比如检查页面类型、记录访问统计等
  }
});

// 监听标签页激活事件
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, () => {
    // 可以在这里处理标签页切换逻辑
  });
});

// 热重载代码将在开发模式下由 webpack 插件自动注入
