/*
 * @Author: zi.yang
 * @Date: 2024-11-01 12:01:30
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-06 15:09:06
 * @Description:
 * @FilePath: /vue3-crx-template/src/views/popup/main.ts
 */
import { createApp } from 'vue';

import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

createApp(App).use(createPinia()).use(router).mount('#app');
