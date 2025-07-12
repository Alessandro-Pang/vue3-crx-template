// 热重载客户端代码 - 将在开发模式下注入到 background script 中
// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'request-reload') {
    console.log('Received reload request from content script');
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
        console.log('[ChromeHotReload] Connected to hot reload server');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[ChromeHotReload] Failed to parse message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[ChromeHotReload] Disconnected from hot reload server');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[ChromeHotReload] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[ChromeHotReload] Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  handleMessage(message) {
    console.log('[ChromeHotReload] Received message:', message);

    switch (message.type) {
      case 'connected':
        console.log('[ChromeHotReload] Server connection confirmed');
        break;
      case 'chrome-reload':
        console.log('[ChromeHotReload] Chrome extension files changed, reloading...');
        if (message.changedFiles) {
          console.log('[ChromeHotReload] Changed files:', message.changedFiles);
        }
        // 延迟一点时间确保文件写入完成
        setTimeout(() => {
          chrome.runtime.reload();
        }, 100);
        break;
      default:
        console.log('[ChromeHotReload] Unknown message type:', message.type);
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`[ChromeHotReload] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.log('[ChromeHotReload] Max reconnection attempts reached, giving up');
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