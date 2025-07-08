/*
 * @Author: zi.yang
 * @Date: 2024-07-18 12:53:11
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-08 07:58:43
 * @Description:
 * @FilePath: /vue3-crx-template/src/chrome/background.ts
 */
console.log('Background script loaded');

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);

  // 设置默认存储数据
  chrome.storage.local.set({
    extensionEnabled: true,
    installTime: new Date().toISOString(),
    version: chrome.runtime.getManifest().version,
  });

  // 如果是首次安装，可以打开欢迎页面
  if (details.reason === 'install') {
    console.log('首次安装扩展程序');
  }
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('页面加载完成:', tab.url);

    // 可以在这里执行一些后台任务
    // 比如检查页面类型、记录访问统计等
  }
});

// 监听标签页激活事件
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      console.log('切换到标签页:', tab.url);
    }
  });
});

// 开发环境下，启用热重载客户端
if (process.env.NODE_ENV === 'development') {
  // 监听来自 content script 的消息
  chrome.runtime.onMessage.addListener((message: { type: string }) => {
    if (message.type === 'request-reload') {
      console.log('Received reload request from content script');
      chrome.runtime.reload();
    }
  });

  // WebSocket 热重载客户端
  class ChromeHotReloadClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    constructor(private url: string = 'ws://localhost:9090') {
      this.connect();
    }

    private connect() {
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
        console.error(
          '[ChromeHotReload] Failed to create WebSocket connection:',
          error
        );
        this.scheduleReconnect();
      }
    }

    private handleMessage(message: {
      type: string;
      timestamp?: number;
      changedFiles?: string[];
    }) {
      console.log('[ChromeHotReload] Received message:', message);

      switch (message.type) {
        case 'connected':
          console.log('[ChromeHotReload] Server connection confirmed');
          break;
        case 'chrome-reload':
          console.log(
            '[ChromeHotReload] Chrome extension files changed, reloading...'
          );
          chrome.runtime.reload();
          break;
        default:
          console.log('[ChromeHotReload] Unknown message type:', message.type);
      }
    }

    private scheduleReconnect() {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay =
          this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(
          `[ChromeHotReload] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );

        setTimeout(() => {
          this.connect();
        }, delay);
      } else {
        console.log(
          '[ChromeHotReload] Max reconnection attempts reached, giving up'
        );
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
  const hotReloadClient = new ChromeHotReloadClient();

  // 扩展卸载时清理连接
  chrome.runtime.onSuspend.addListener(() => {
    hotReloadClient.disconnect();
  });
}
