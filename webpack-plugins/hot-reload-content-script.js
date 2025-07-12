// 热重载客户端代码 - 将在开发模式下注入到 content script 中
console.log('Content script loaded in development mode');

// 防抖变量
let reloadTimeout = null;
let lastReloadTime = 0;
const RELOAD_DEBOUNCE_DELAY = 500; // 500ms防抖延迟

// 监听来自background的重载消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'reload-content-script') {
    console.log('Content script reload requested');
    performReload();
  }
});

function performReload() {
  const now = Date.now();
  
  // 防抖：如果距离上次重载时间太短，则忽略
  if (now - lastReloadTime < RELOAD_DEBOUNCE_DELAY) {
    console.log('[ContentScript HotReload] Reload request ignored due to debounce');
    return;
  }
  
  lastReloadTime = now;
  
  try {
    // 尝试调用Vue应用的清理函数
    if (window.cleanupVueApp && typeof window.cleanupVueApp === 'function') {
      window.cleanupVueApp();
      console.log('[ContentScript HotReload] Vue app cleaned up successfully');
    } else {
      // 备用清理方案
      const existingElement = document.getElementById('vue3-crx-content-script');
      if (existingElement) {
        existingElement.remove();
        console.log('[ContentScript HotReload] DOM element removed as fallback');
      }
    }
  } catch (error) {
    console.warn('[ContentScript HotReload] Error during cleanup:', error);
  }
  
  // 延迟重载页面，确保清理完成
  setTimeout(() => {
    location.reload();
  }, 100);
}

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
        
        // 清除之前的重载定时器
        if (reloadTimeout) {
          clearTimeout(reloadTimeout);
        }
        
        // 防抖处理：延迟执行重载
        reloadTimeout = setTimeout(() => {
          try {
            // 检查扩展上下文是否仍然有效
            if (chrome.runtime && chrome.runtime.id) {
              chrome.runtime.sendMessage({ type: 'request-reload' });
            } else {
              console.log('[ContentScript HotReload] Extension context invalidated, performing direct reload');
              performReload();
            }
          } catch (error) {
            console.log('[ContentScript HotReload] Failed to send message to background, performing direct reload:', error);
            performReload();
          }
        }, 200); // 200ms防抖延迟
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