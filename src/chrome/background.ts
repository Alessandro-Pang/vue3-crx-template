/*
 * @Author: zi.yang
 * @Date: 2024-07-18 12:53:11
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-06 15:52:26
 * @Description: 
 * @FilePath: /vue3-crx-template/src/chrome/background.ts
 */
console.log('background script loaded - with hot reload support!');

// 监听插件安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('Chrome extension installed and ready for hot reload!');
});

