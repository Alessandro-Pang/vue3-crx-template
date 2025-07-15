/*
 * @Author: zi.yang
 * @Date: 2024-07-18 12:53:11
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-15 08:17:22
 * @Description:
 * @FilePath: /vue3-crx-template/src/chrome/background.ts
 */
// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
  // 如果是首次安装，可以打开欢迎页面
  if (details.reason === 'install') {
    console.log('首次安装扩展程序');
  }
});
