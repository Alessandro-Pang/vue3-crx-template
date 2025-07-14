/*
 * @Author: zi.yang
 * @Date: 2025-07-14 07:44:03
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-14 23:23:58
 * @Description: 
 * @FilePath: /vue3-crx-template/src/chrome/content-script-social.ts
 */
import createVueApp from '@/views/content-script-test/main';

// 需要注入多个 content-script 时，最好使用 IIFE 立即执行函数包裹，这样可以避免全局变量污染
// 否则，如果两个 content-script 都使用了同一个全局变量，那么它们之间就会互相影响。
// 例如：同时使用 const 声明 div 变量，就会报错：
//   Cannot redeclare block-scoped variable 'div'.

(() => {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.top = '100px';
  div.style.left = '100px';
  div.style.width = '30px';
  div.style.height = '30px';
  document.body.appendChild(div);
  createVueApp(div)
})()