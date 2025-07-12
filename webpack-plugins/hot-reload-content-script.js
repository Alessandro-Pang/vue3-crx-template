// 热重载客户端代码 - 将在开发模式下注入到 content script 中
console.log('Content script loaded in development mode');

// 监听来自background的重载消息
chrome.runtime.onMessage.addListener((message) => {
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
  constructor(url = 'ws://localhost:9090') {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 2000;
    this.url = url;
    this.connect();
  }

  connect() {
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

  handleMessage(message) {
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
        } catch (error) {
          console.log('[ContentScript HotReload] Failed to send message to background, reloading page directly:', error);
          location.reload();
        }
        // setTimeout(() => { window.location.reload() })
        break;
      default:
        console.log('[ContentScript HotReload] Unknown message type:', message.type);
    }
  }

  scheduleReconnect() {
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

  disconnect() {
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