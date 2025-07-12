// 热重载客户端代码 - 将在开发模式下注入到 content script 中

// 防抖变量
let reloadTimeout = null;
let lastReloadTime = 0;
const RELOAD_DEBOUNCE_DELAY = 500; // 500ms防抖延迟

// 监听来自background的重载消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'reload-content-script') {
    performReload();
  }
});

function performReload() {
  const now = Date.now();

  // 防抖：如果距离上次重载时间太短，则忽略
  if (now - lastReloadTime < RELOAD_DEBOUNCE_DELAY) {
    return;
  }

  lastReloadTime = now;

  try {
    // 尝试调用Vue应用的清理函数
    if (window.cleanupVueApp && typeof window.cleanupVueApp === 'function') {
      window.cleanupVueApp();
    } else {
      // 备用清理方案
      const existingElement = document.getElementById('vue3-crx-content-script');
      if (existingElement) {
        existingElement.remove();
      }
    }
  } catch {
    // 静默处理清理错误
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
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch {
          // 静默处理消息解析错误
        }
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // 静默处理连接错误
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'connected':
        break;
      case 'chrome-reload':
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
              performReload();
            }
          } catch {
            performReload();
          }
        }, 200); // 200ms防抖延迟
        break;
      default:
        break;
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;

      setTimeout(() => {
        this.connect();
      }, delay);
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
