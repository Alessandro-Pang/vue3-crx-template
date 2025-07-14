/*
 * @Author: zi.yang
 * @Date: 2025-07-12 23:52:14
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-14 08:17:30
 * @Description: 热重载客户端代码 - 将在开发模式下注入到 background script 中
 * @FilePath: /vue3-crx-template/webpack-plugins/hot-reload-background.js
 */

// 使用 IIFE 避免全局变量冲突
(function () {
  // 获取配置信息
  const hotReloadConfig =
    typeof self !== 'undefined' && self.HOT_RELOAD_CONFIG
      ? self.HOT_RELOAD_CONFIG
      : {
        debounceDelay: 300,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
      };

  // 监听来自 content script 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'request-reload') {
      // 延迟重载，确保响应能够发送
      setTimeout(() => {
        chrome.runtime.reload();
      }, 100);
      sendResponse({ success: true });
      return true;
    }
  });

  // WebSocket 热重载客户端
  class ChromeHotReloadClient {
    constructor(url = 'ws://localhost:9090') {
      this.ws = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = hotReloadConfig.maxReconnectAttempts;
      this.reconnectDelay = hotReloadConfig.reconnectDelay;
      this.url = url;
      this.isConnected = false;
      this.lastReloadTime = 0;
      this.connect();
    }

    connect() {
      if (this.isConnected) return;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.isConnected = true;
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.warn('[HotReload] 消息解析失败:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log(
            `[HotReload] WebSocket连接关闭: ${event.code} ${event.reason}`
          );
          this.isConnected = false;
          if (event.code !== 1000) {
            // 非正常关闭
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.warn('[HotReload] WebSocket连接错误:', error);
          this.isConnected = false;
        };
      } catch (error) {
        console.error('[HotReload] 创建WebSocket连接失败:', error);
        this.scheduleReconnect();
      }
    }

    handleMessage(message) {
      switch (message.type) {
        case 'chrome-reload':
          this.handleReload(message);
          break;
        case 'connected':
          break;
        case 'compilation-error':
          console.error('[HotReload] 编译错误:', message.errors);
          break;
        default:
          console.warn('[HotReload] 未知消息类型:', message.type);
          break;
      }
    }

    handleReload() {
      const now = Date.now();

      // 防抖处理
      if (now - this.lastReloadTime < hotReloadConfig.debounceDelay) {
        return;
      }

      this.lastReloadTime = now;

      // 延迟重载，确保日志能够输出
      setTimeout(() => {
        chrome.runtime.reload();
      }, 50);
    }

    scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        return;
      }

      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

      console.log(
        `[HotReload] 第 ${this.reconnectAttempts} 次重连，${delay}ms 后重试`
      );

      setTimeout(() => {
        if (!this.isConnected) {
          this.connect();
        }
      }, delay);
    }

    disconnect() {
      console.log('[HotReload] 断开WebSocket连接');
      this.isConnected = false;
      if (this.ws) {
        this.ws.close(1000, 'Client disconnect');
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
})(); // 结束 IIFE
