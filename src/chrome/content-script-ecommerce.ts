/*
 * @Author: zi.yang
 * @Date: 2025-01-20 23:51:00
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-14 08:20:29
 * @Description: 
 * @FilePath: /vue3-crx-template/src/chrome/content-script-ecommerce.ts
 */
import createVueApp from '@/views/content-script-test/main';

// 初始化 Vue 应用
console.log('E-commerce Content Script loaded');

const div = document.createElement('div');
div.style.position = 'absolute';
div.style.top = '400px';
div.style.left = '100px';
div.style.width = '30px';
div.style.height = '30px';
div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
document.body.appendChild(div);

(() => createVueApp(div))()