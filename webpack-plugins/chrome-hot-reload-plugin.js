const WebSocket = require('ws');

class ChromeHotReloadPlugin {
  constructor(options = {}) {
    this.options = {
      port: options.port || 9090,
      host: options.host || 'localhost',
      entries: options.entries || ['chrome/background', 'chrome/content-script'],
      ...options
    };
    this.server = null;
    this.clients = new Set();
    this.lastBuildTime = Date.now();
  }

  apply(compiler) {
    // 只在开发模式下启用
    if (compiler.options.mode !== 'development') {
      return;
    }

    // 启动 WebSocket 服务器
    compiler.hooks.afterPlugins.tap('ChromeHotReloadPlugin', () => {
      this.startWebSocketServer();
    });

    // 监听编译完成事件
    compiler.hooks.done.tap('ChromeHotReloadPlugin', (stats) => {
      // 简化逻辑：如果有客户端连接且编译成功，就发送重载通知
      if (this.clients.size > 0 && !stats.hasErrors()) {
        console.log('[ChromeHotReload] Compilation successful, sending reload notification');
        console.log('[ChromeHotReload] Connected clients:', this.clients.size);
        
        this.notifyClients({
          type: 'chrome-reload',
          timestamp: Date.now(),
          changedFiles: []
        });
      } else if (this.clients.size === 0) {
        console.log('[ChromeHotReload] Compilation done but no clients connected');
      } else if (stats.hasErrors()) {
        console.log('[ChromeHotReload] Compilation has errors, skipping reload');
      }
    });

    // 编译器关闭时清理资源
    compiler.hooks.shutdown.tap('ChromeHotReloadPlugin', () => {
      this.cleanup();
    });
  }

  startWebSocketServer() {
    try {
      this.server = new WebSocket.Server({ 
        port: this.options.port, 
        host: this.options.host 
      });

      this.server.on('connection', (ws) => {
        console.log(`[ChromeHotReload] Client connected to ws://${this.options.host}:${this.options.port}`);
        this.clients.add(ws);

        ws.on('close', () => {
          this.clients.delete(ws);
          console.log('[ChromeHotReload] Client disconnected');
        });

        ws.on('error', (error) => {
          console.error('[ChromeHotReload] WebSocket error:', error);
          this.clients.delete(ws);
        });

        // 发送连接确认
        ws.send(JSON.stringify({
          type: 'connected',
          timestamp: Date.now()
        }));
      });

      this.server.on('error', (error) => {
        console.error('[ChromeHotReload] WebSocket server error:', error);
      });

      console.log(`[ChromeHotReload] WebSocket server started on ws://${this.options.host}:${this.options.port}`);
    } catch (error) {
      console.error('[ChromeHotReload] Failed to start WebSocket server:', error);
    }
  }

  notifyClients(message) {
    const messageStr = JSON.stringify(message);
    console.log(`[ChromeHotReload] Notifying ${this.clients.size} clients:`, message.type);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      } else {
        this.clients.delete(client);
      }
    });
  }

  getChangedFiles(compilation) {
    const changedFiles = [];
    
    // 方法1: 使用 webpack 5 的 modifiedFiles 和 removedFiles
    if (compilation.modifiedFiles) {
      changedFiles.push(...Array.from(compilation.modifiedFiles));
    }
    if (compilation.removedFiles) {
      changedFiles.push(...Array.from(compilation.removedFiles));
    }
    
    // 方法2: 备用方案 - 使用 fileSystemInfo
    if (changedFiles.length === 0 && compilation.fileSystemInfo && compilation.fileSystemInfo.fileTimestamps) {
      for (const [file, timestamp] of compilation.fileSystemInfo.fileTimestamps) {
        if (timestamp && timestamp > this.lastBuildTime) {
          changedFiles.push(file);
        }
      }
    }
    
    // 更新最后构建时间
    this.lastBuildTime = Date.now();
    
    return changedFiles;
  }

  cleanup() {
    if (this.server) {
      console.log('[ChromeHotReload] Shutting down WebSocket server');
      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });
      this.clients.clear();
      this.server.close();
      this.server = null;
    }
  }
}

module.exports = ChromeHotReloadPlugin;