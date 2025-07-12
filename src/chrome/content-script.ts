/*
 * @Author: zi.yang
 * @Date: 2024-07-19 17:52:37
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-12 13:30:30
 * @Description: 
 * @FilePath: /vue3-crx-template/src/chrome/content-script.ts
 */

import createVueApp, { cleanupApp } from '@/views/content-script/main';

console.log('Content script loaded - with hot reload support!');

// 将清理函数暴露到全局作用域，供热更新使用
if(process.env.NODE_ENV === 'development' ) {
  Object.defineProperty(window, 'cleanupVueApp', {
    value: cleanupApp,
    writable: false,
    enumerable: true,
    configurable: false,
  });
}

// 初始化 Vue 应用
createVueApp();

console.log('[ContentScript] Vue app initialized and cleanup function exposed globally');
