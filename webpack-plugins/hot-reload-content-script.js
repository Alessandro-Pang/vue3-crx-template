/*
 * @Author: zi.yang
 * @Date: 2025-07-12 23:52:14
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-14 08:17:25
 * @Description: 热重载客户端代码 - 将在开发模式下注入到 content script 中
 * @FilePath: /vue3-crx-template/webpack-plugins/hot-reload-content-script.js
 */

// 使用 IIFE 避免全局变量冲突
(function () {
  // 获取配置信息
  const hotReloadConfig =
    typeof window !== 'undefined' && window.HOT_RELOAD_CONFIG
      ? window.HOT_RELOAD_CONFIG
      : {
        debounceDelay: 300,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
      };

  // 防抖变量
  let reloadTimeout = null;
  let lastReloadTime = 0;
  const RELOAD_DEBOUNCE_DELAY = hotReloadConfig.debounceDelay;

  // 监听来自background的重载消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'reload-content-script') {
      performReload();
      sendResponse({ success: true });
      return true;
    }
  });

  function performReload() {
    const now = Date.now();

    // 防抖：如果距离上次重载时间太短，则忽略
    if (now - lastReloadTime < RELOAD_DEBOUNCE_DELAY) {
      console.log('[HotReload] 重载请求过于频繁，跳过');
      return;
    }

    lastReloadTime = now;

    try {
      // 尝试调用Vue应用的清理函数
      if (window.cleanupVueApp && typeof window.cleanupVueApp === 'function') {
        window.cleanupVueApp();
      }
    } catch (error) {
      console.warn('[HotReload] 清理Vue应用时出错:', error);
    }

    // 清理全局变量
    try {
      if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
        window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps = [];
      }
    } catch (error) {
      console.warn('[HotReload] 清理Vue DevTools时出错:', error);
    }

    // 延迟重载页面，确保清理完成
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }

  // WebSocket 热重载客户端（仅用于通知，实际重载由 background 处理）
  class ContentScriptHotReloadClient {
    constructor(url = 'ws://localhost:9090') {
      this.ws = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = hotReloadConfig.maxReconnectAttempts;
      this.reconnectDelay = hotReloadConfig.reconnectDelay;
      this.url = url;
      this.isConnected = false;
      this.lastNotifyTime = 0;
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
            console.warn('[HotReload] Content-script消息解析失败:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log(
            `[HotReload] Content-script WebSocket连接关闭: ${event.code} ${event.reason}`
          );
          this.isConnected = false;
          if (event.code !== 1000) {
            // 非正常关闭
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.warn('[HotReload] Content-script WebSocket连接错误:', error);
          this.isConnected = false;
        };
      } catch (error) {
        console.error(
          '[HotReload] Content-script创建WebSocket连接失败:',
          error
        );
        this.scheduleReconnect();
      }
    }

    handleMessage(message) {
      switch (message.type) {
        case 'chrome-reload':
          this.handleReloadRequest(message);
          break;
        case 'connected':
          break;
        case 'compilation-error':
          console.error('[HotReload] Content-script编译错误:', message.errors);
          break;
        default:
          console.warn('[HotReload] Content-script未知消息类型:', message.type);
          break;
      }
    }

    handleReloadRequest() {
      const now = Date.now();

      // 防抖处理
      if (now - this.lastNotifyTime < hotReloadConfig.debounceDelay) {
        console.log('[HotReload] Content-script重载请求过于频繁，跳过');
        return;
      }

      this.lastNotifyTime = now;

      // 清除之前的重载定时器
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }

      // 防抖处理：延迟执行重载
      reloadTimeout = setTimeout(() => {
        try {
          // 检查扩展上下文是否仍然有效
          if (chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({ type: 'request-reload' }, () => {
              if (chrome.runtime.lastError) {
                console.warn(
                  '[HotReload] Content-script发送重载请求失败:',
                  chrome.runtime.lastError
                );
              }
            });
          } else {
            performReload();
          }
        } catch {
          performReload();
        }
      }, 200); // 200ms防抖延迟
    }

    scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(
          `[HotReload] Content-script达到最大重连次数 (${this.maxReconnectAttempts})，停止重连`
        );
        return;
      }

      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

      console.log(
        `[HotReload] Content-script第 ${this.reconnectAttempts} 次重连，${delay}ms 后重试`
      );

      setTimeout(() => {
        if (!this.isConnected) {
          this.connect();
        }
      }, delay);
    }

    disconnect() {
      console.log('[HotReload] Content-script断开WebSocket连接');
      this.isConnected = false;
      if (this.ws) {
        this.ws.close(1000, 'Client disconnect');
        this.ws = null;
      }
    }
  }

  // 创建热重载客户端实例
  let contentHotReloadClient = null;

  // 延迟初始化，确保页面加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      contentHotReloadClient = new ContentScriptHotReloadClient();
    });
  } else {
    contentHotReloadClient = new ContentScriptHotReloadClient();
  }

  // 页面卸载时断开连接
  window.addEventListener('beforeunload', () => {
    if (contentHotReloadClient) {
      contentHotReloadClient.disconnect();
    }
  });

  // 页面隐藏时断开连接（用户切换标签页等）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && contentHotReloadClient) {
      contentHotReloadClient.disconnect();
    } else if (
      !document.hidden &&
      contentHotReloadClient &&
      !contentHotReloadClient.isConnected
    ) {
      contentHotReloadClient.connect();
    }
  });
})(); // 结束 IIFE
