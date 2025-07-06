/*
 * @Author: zi.yang
 * @Date: 2024-07-19 17:52:37
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-06 15:52:35
 * @Description: 
 * @FilePath: /vue3-crx-template/src/chrome/content-script.ts
 */
import createVueApp from '@/views/contnet-script/main';

console.log('Content script loaded - with hot reload support!');

// 防止重复注入，检查是否已经存在
const existingElement = document.getElementById('vue3-crx-content-script');
if (!existingElement) {
  // 只有当元素不存在时才创建新的
  const dom = document.createElement('div');
  dom.id = 'vue3-crx-content-script'; // 添加唯一ID
  dom.style.position = 'fixed';
  dom.style.top = '60px';
  dom.style.right = '60px';
  dom.style.borderRadius = '6px';
  dom.style.background = '#42b883'; // Vue green color
  dom.style.color = 'white';
  dom.style.padding = '20px';
  dom.style.lineHeight = '26px';
  dom.style.boxShadow = '0 0 8px #000';
  dom.style.fontFamily = 'Arial, sans-serif';
  dom.style.fontSize = '14px';
  dom.style.zIndex = '10000';

  document.body.appendChild(dom);
  const app = createVueApp(dom);

  // 移除按钮
  const removeButton = document.createElement('button');
  removeButton.innerText = 'remove';
  removeButton.onclick = () => {
    // 如果需要销毁 content-script 创建出来的 vue app 时
    // 一定要调用 app.unmount 方法，避免有任务无法连同销毁，比如计时器、DOM 事件监听器或者与服务器的连接等等。
    app.unmount();
    dom.remove();
    console.log('Content script removed manually');
  };
  dom.appendChild(removeButton);
} else {
  console.log('Content script already injected, skipping...');
}
