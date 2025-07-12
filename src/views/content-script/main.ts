/*
 * @Author: zi.yang
 * @Date: 2024-10-31 21:56:15
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-12 19:25:20
 * @Description: 
 * @FilePath: /vue3-crx-template/src/views/content-script/main.ts
 */
import { App as VueApp, createApp } from 'vue';

import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

const APP_ELEMENT_ID = 'vue3-crx-content-script';

// 全局变量存储当前应用实例，用于热更新时清理
let currentApp: VueApp<Element> | null = null;

function initAppContainer() {
  const existingElement = document.getElementById(APP_ELEMENT_ID);
  if (existingElement) return existingElement;
  const dom = document.createElement('div');
  dom.id = APP_ELEMENT_ID;
  dom.style.position = 'fixed'
  dom.style.right = '30px'
  dom.style.top = '50px'
  dom.style.zIndex = '1000'
  document.body.appendChild(dom);
  return dom;
}

function cleanupApp() {
  if (currentApp) {
    try {
      currentApp.unmount();
      console.log('[ContentScript] Vue app unmounted successfully');
    } catch (error) {
      console.warn('[ContentScript] Error unmounting Vue app:', error);
    }
    currentApp = null;
  }
  
  // 清理DOM元素
  const existingElement = document.getElementById(APP_ELEMENT_ID);
  if (existingElement) {
    existingElement.remove();
    console.log('[ContentScript] DOM element removed');
  }
}

// 将清理函数暴露到全局作用域，供热更新使用
if(process.env.NODE_ENV === 'development' ) {
  Object.defineProperty(window, 'cleanupVueApp', {
    value: cleanupApp,
    writable: false,
    enumerable: true,
    configurable: false,
  });
}

export default () => {
  // 清理之前的应用实例
  cleanupApp();
  
  const container = initAppContainer();
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount(container);
  
  // 保存当前应用实例
  currentApp = app;
  
  return app;
};
