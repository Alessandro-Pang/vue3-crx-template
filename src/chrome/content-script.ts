/*
 * @Author: zi.yang
 * @Date: 2024-07-19 17:52:37
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-08 07:55:39
 * @Description: 
 * @FilePath: /vue3-crx-template/src/chrome/content-script.ts
 */
import createVueApp from '@/views/contnet-script/main';

console.log('Content script loaded - with hot reload support!');

// 示例：获取网站信息
const pageInfo = {
  title: document.title,
  url: window.location.href,
  domain: window.location.hostname,
  timestamp: new Date().toISOString()
};
console.log('页面信息:', pageInfo);

// 示例：修改网站样式（添加一个全局样式）
const style = document.createElement('style');
style.textContent = `
  .vue3-crx-highlight {
    background-color: yellow !important;
    transition: background-color 0.3s ease;
  }
`;
document.head.appendChild(style);

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
  dom.style.background = '#42b883';
  dom.style.color = 'white';
  dom.style.padding = '20px';
  dom.style.lineHeight = '26px';
  dom.style.boxShadow = '0 0 8px #000';
  dom.style.fontFamily = 'Arial, sans-serif';
  dom.style.fontSize = '14px';
  dom.style.zIndex = '10000';

  document.body.appendChild(dom);
  const app = createVueApp(dom);

  // 功能按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.style.marginTop = '10px';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.flexWrap = 'wrap';

  // 高亮页面链接按钮
  const highlightButton = document.createElement('button');
  highlightButton.innerText = '高亮链接';
  highlightButton.style.padding = '4px 8px';
  highlightButton.style.fontSize = '12px';
  highlightButton.style.cursor = 'pointer';
  highlightButton.onclick = () => {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      link.classList.toggle('vue3-crx-highlight');
    });
  };
  buttonContainer.appendChild(highlightButton);

  // 获取页面统计按钮
  const statsButton = document.createElement('button');
  statsButton.innerText = '页面统计';
  statsButton.style.padding = '4px 8px';
  statsButton.style.fontSize = '12px';
  statsButton.style.cursor = 'pointer';
  statsButton.onclick = () => {
    const stats = {
      链接数量: document.querySelectorAll('a').length,
      图片数量: document.querySelectorAll('img').length,
      段落数量: document.querySelectorAll('p').length,
      标题数量: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length
    };
    alert(`页面统计:\n${Object.entries(stats).map(([key, value]) => `${key}: ${value}`).join('\n')}`);
  };
  buttonContainer.appendChild(statsButton);

  // 移除按钮
  const removeButton = document.createElement('button');
  removeButton.innerText = '移除';
  removeButton.style.padding = '4px 8px';
  removeButton.style.fontSize = '12px';
  removeButton.style.cursor = 'pointer';
  removeButton.style.backgroundColor = '#ff4757';
  removeButton.onclick = () => {
    // 如果需要销毁 content-script 创建出来的 vue app 时
    // 一定要调用 app.unmount 方法，避免有任务无法连同销毁，比如计时器、DOM 事件监听器或者与服务器的连接等等。
    app.unmount();
    dom.remove();
    console.log('Content script removed manually');
  };
  buttonContainer.appendChild(removeButton);

  dom.appendChild(buttonContainer);
} else {
  console.log('Content script already injected, skipping...');
}

// 开发环境下的热重载支持
if (process.env.NODE_ENV === 'development') {
  console.log('Content script loaded in development mode');
  
  // 监听来自background的重载消息
  chrome.runtime.onMessage.addListener((message: { type: string }) => {
    if (message.type === 'reload-content-script') {
      console.log('Content script reload requested');
      // 清理现有的content script元素
      const existingElement = document.getElementById('vue3-crx-content-script');
      if (existingElement) {
        existingElement.remove();
      }
      // 重载页面或重新注入
      location.reload();
    }
  });
  
  // WebSocket 热重载客户端（仅用于通知，实际重载由 background 处理）
  class ContentScriptHotReloadClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectDelay = 2000;

    constructor(private url: string = 'ws://localhost:9090') {
      this.connect();
    }

    private connect() {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('[ContentScript HotReload] Connected to hot reload server');
          this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[ContentScript HotReload] Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('[ContentScript HotReload] Disconnected from hot reload server');
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[ContentScript HotReload] WebSocket error:', error);
        };
      } catch (error) {
        console.error('[ContentScript HotReload] Failed to create WebSocket connection:', error);
        this.scheduleReconnect();
      }
    }

    private handleMessage(message: { type: string; timestamp?: number; changedFiles?: string[] }) {
      console.log('[ContentScript HotReload] Received message:', message);

      switch (message.type) {
        case 'connected':
          console.log('[ContentScript HotReload] Server connection confirmed');
          break;
        case 'chrome-reload':
          console.log('[ContentScript HotReload] Chrome extension files changed, notifying background...');
          // 通知 background script 进行重载
          try {
            // 检查扩展上下文是否仍然有效
            if (chrome.runtime && chrome.runtime.id) {
              chrome.runtime.sendMessage({ type: 'request-reload' });
            } else {
              console.log('[ContentScript HotReload] Extension context invalidated, reloading page directly');
              location.reload();
            }
            window.location.reload()
          } catch (error) {
            console.log('[ContentScript HotReload] Failed to send message to background, reloading page directly:', error);
            location.reload();
          }
          break;
        default:
          console.log('[ContentScript HotReload] Unknown message type:', message.type);
      }
    }

    private scheduleReconnect() {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        console.log(`[ContentScript HotReload] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
          this.connect();
        }, delay);
      } else {
        console.log('[ContentScript HotReload] Max reconnection attempts reached, giving up');
      }
    }

    public disconnect() {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }
  }

  // 初始化热重载客户端
  const contentHotReloadClient = new ContentScriptHotReloadClient();

  // 页面卸载时清理连接
  window.addEventListener('beforeunload', () => {
    contentHotReloadClient.disconnect();
  });
  
  // 提供手动重载机制
  console.log('Content script ready - use chrome.runtime.sendMessage({ type: "request-reload" }) to reload extension');
}
