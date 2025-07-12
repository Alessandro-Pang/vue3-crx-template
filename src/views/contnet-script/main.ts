/*
 * @Author: zi.yang
 * @Date: 2024-10-31 21:56:15
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-12 12:59:50
 * @Description: 
 * @FilePath: /vue3-crx-template/src/views/contnet-script/main.ts
 */
import { createApp } from 'vue';

import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

const APP_ELEMENT_ID = 'vue3-crx-content-script';

function initAppContainer() {
  const existingElement = document.getElementById(APP_ELEMENT_ID);
  if (existingElement) return existingElement;
  const dom = document.createElement('div');
  dom.id = APP_ELEMENT_ID;
  dom.style.position = 'absolute'
  dom.style.right = '0'
  dom.style.top = '0'
  dom.style.zIndex = '1000'
  document.body.appendChild(dom);
  return dom;
}

export default () => {
  const container = initAppContainer();
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount(container);
  return app;
};
