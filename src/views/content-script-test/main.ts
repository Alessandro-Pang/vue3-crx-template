/*
 * @Author: zi.yang
 * @Date: 2025-07-14 08:10:19
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-14 08:10:51
 * @Description: 
 * @FilePath: /vue3-crx-template/src/views/test/main.ts
 */
import { createApp } from 'vue';

import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

export default function createVueApp(el: HTMLElement) {
  createApp(App).use(createPinia()).use(router).mount(el);
}
