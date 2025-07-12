// 热重载客户端代码 - 将在开发模式下注入到 background script 中
// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'request-reload') {
    chrome.runtime.reload();
  }
});

// WebSocket 热重载客户端
class ChromeHotReloadClient {
  constructor(url = 'ws://localhost:9090') {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
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
        // 延迟一点时间确保文件写入完成
        setTimeout(() => {
          chrome.runtime.reload();
        }, 100);
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
const hotReloadClient = new ChromeHotReloadClient();

// 扩展挂起时清理连接
chrome.runtime.onSuspend.addListener(() => {
  hotReloadClient.disconnect();
});