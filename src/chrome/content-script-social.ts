/*
 * @Author: zi.yang
 * @Date: 2025-01-20 23:50:00
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-14 08:13:07
 * @Description: 社交媒体专用 Content Script
 * @FilePath: /vue3-crx-template/src/chrome/content-script-social.ts
 */
import createVueApp from '@/views/content-script-test/main';

// 社交媒体专用的内容脚本
console.log('Social Media Content Script loaded');

const div2 = document.createElement('div');
div2.style.position = 'absolute';
div2.style.top = '100px';
div2.style.left = '100px';
div2.style.width = '30px';
div2.style.height = '30px';
div2.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
document.body.appendChild(div2);

(() => createVueApp(div2))()