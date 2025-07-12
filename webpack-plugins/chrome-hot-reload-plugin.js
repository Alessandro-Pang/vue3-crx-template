import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChromeHotReloadPlugin {
  constructor(options = {}) {
    console.log('[ChromeHotReload] Plugin constructor called with options:', options);
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
    console.log('[ChromeHotReload] Plugin apply method called, NODE_ENV:', process.env.NODE_ENV);
    console.log('[ChromeHotReload] Webpack mode:', compiler.options.mode);
    // 检查 webpack 模式而不是环境变量
    if (compiler.options.mode !== 'development') {
      console.log('[ChromeHotReload] Not in development mode, skipping plugin');
      return;
    }
    console.log('[ChromeHotReload] Setting up hooks...');

    // 在编译完成后注入热重载代码
    compiler.hooks.done.tap('ChromeHotReloadPlugin', (stats) => {
      console.log('[ChromeHotReload] done hook triggered');
      this.injectHotReloadCode(stats.compilation);
      this.notifyClients({
        type: 'chrome-reload',
        timestamp: Date.now(),
        changedFiles: this.getChangedFiles(stats.compilation)
      });
    });

    compiler.hooks.watchRun.tap('ChromeHotReloadPlugin', () => {
      if (!this.server) {
        this.startWebSocketServer();
      }
    });

    compiler.hooks.watchClose.tap('ChromeHotReloadPlugin', () => {
      this.cleanup();
    });
  }

  startWebSocketServer() {
    try {
      this.server = new WebSocketServer({
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

  injectHotReloadCode(compilation) {
    const outputPath = compilation.outputOptions.path;
    console.log('[ChromeHotReload] Output path:', outputPath);
    
    // 注入到 background.js
    const backgroundPath = path.join(outputPath, 'chrome', 'background.js');
    console.log('[ChromeHotReload] Background path:', backgroundPath);
    console.log('[ChromeHotReload] Background file exists:', fs.existsSync(backgroundPath));
    if (fs.existsSync(backgroundPath)) {
      const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');
      
      // 检查是否已经注入过热重载代码
      if (!backgroundContent.includes('ChromeHotReloadClient')) {
        const hotReloadBackgroundCode = fs.readFileSync(
          path.join(__dirname, 'hot-reload-background.js'),
          'utf8'
        );
        const injectedContent = backgroundContent + '\n\n' + hotReloadBackgroundCode;
        fs.writeFileSync(backgroundPath, injectedContent);
        console.log('[ChromeHotReload] Injected hot reload code into background.js');
      } else {
        console.log('[ChromeHotReload] Hot reload code already exists in background.js, skipping injection');
      }
    }
    
    // 注入到 content-script.js
    const contentScriptPath = path.join(outputPath, 'chrome', 'content-script.js');
    if (fs.existsSync(contentScriptPath)) {
      const contentScriptContent = fs.readFileSync(contentScriptPath, 'utf8');
      
      // 检查是否已经注入过热重载代码
      if (!contentScriptContent.includes('ContentScriptHotReloadClient')) {
        const hotReloadContentCode = fs.readFileSync(
          path.join(__dirname, 'hot-reload-content-script.js'),
          'utf8'
        );
        const injectedContent = contentScriptContent + '\n\n' + hotReloadContentCode;
        fs.writeFileSync(contentScriptPath, injectedContent);
        console.log('[ChromeHotReload] Injected hot reload code into content-script.js');
      } else {
        console.log('[ChromeHotReload] Hot reload code already exists in content-script.js, skipping injection');
      }
    }
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

export default ChromeHotReloadPlugin;