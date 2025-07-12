import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChromeHotReloadPlugin {
  constructor(options = {}) {
    console.log('[ChromeHotReload] Plugin constructor called with options:', options);
    this.options = {
      port: options.port || 9090,
      host: options.host || 'localhost',
      entries: options.entries || ['chrome/background', 'chrome/content-script'],
      debounceDelay: options.debounceDelay || 300,
      ...options
    };
    this.server = null;
    this.clients = new Set();
    this.lastBuildTime = Date.now();
    this.notifyTimeout = null;
    this.lastNotifyTime = 0;
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

      // 检查是否有错误
      if (stats.hasErrors()) {
        console.log('[ChromeHotReload] Build has errors, skipping hot reload');
        return;
      }

      this.injectHotReloadCode(stats.compilation);

      const changedFiles = this.getChangedFiles(stats.compilation);
      if (changedFiles.length === 0) {
        console.log('[ChromeHotReload] No changed files detected, skipping notification');
        return;
      }

      // 防抖处理：清除之前的定时器
      if (this.notifyTimeout) {
        clearTimeout(this.notifyTimeout);
      }

      // 延迟通知客户端，避免频繁重载
      this.notifyTimeout = setTimeout(() => {
        const now = Date.now();
        if (now - this.lastNotifyTime < this.options.debounceDelay) {
          console.log('[ChromeHotReload] Notification skipped due to debounce');
          return;
        }

        this.lastNotifyTime = now;
        this.notifyClients({
          type: 'chrome-reload',
          timestamp: now,
          changedFiles: changedFiles
        });
      }, this.options.debounceDelay);
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
      this.injectToFile(backgroundPath, 'hot-reload-background.js', 'ChromeHotReloadClient', 'background.js');
    }

    // 注入到 content-script.js
    const contentScriptPath = path.join(outputPath, 'chrome', 'content-script.js');
    if (fs.existsSync(contentScriptPath)) {
      this.injectToFile(contentScriptPath, 'hot-reload-content-script.js', 'ContentScriptHotReloadClient', 'content-script.js');
    }
  }

  injectToFile(targetPath, hotReloadFileName, markerClass, fileName) {
    try {
      const targetContent = fs.readFileSync(targetPath, 'utf8');

      // 更精确的检查：查找特定的标记注释
      const hotReloadMarker = '// Hot reload code injected by ChromeHotReloadPlugin';

      if (targetContent.includes(hotReloadMarker)) {
        console.log(`[ChromeHotReload] Hot reload code already exists in ${fileName}, skipping injection`);
        return;
      }

      // 读取热重载代码
      const hotReloadCode = fs.readFileSync(
        path.join(__dirname, hotReloadFileName),
        'utf8'
      );

      // 添加标记注释和热重载代码
      const injectedContent = targetContent + '\n\n' + hotReloadMarker + '\n' + hotReloadCode;

      // 写入文件
      fs.writeFileSync(targetPath, injectedContent);
      console.log(`[ChromeHotReload] Injected hot reload code into ${fileName}`);

    } catch (error) {
      console.error(`[ChromeHotReload] Failed to inject hot reload code into ${fileName}:`, error);
    }
  }

  getChangedFiles(compilation) {
    const changedFiles = [];
    const relevantExtensions = ['.ts', '.js', '.vue', '.css', '.scss', '.sass', '.less'];

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

    // 过滤相关文件：只关注源代码文件的变化
    const filteredFiles = changedFiles.filter(file => {
      // 排除 node_modules
      if (file.includes('node_modules')) {
        return false;
      }

      // 排除热重载相关文件
      if (file.includes('hot-reload') || file.includes('webpack-plugins')) {
        return false;
      }

      // 只包含相关扩展名的文件
      const hasRelevantExtension = relevantExtensions.some(ext => file.endsWith(ext));
      if (!hasRelevantExtension) {
        return false;
      }

      return true;
    });

    // 更新最后构建时间
    this.lastBuildTime = Date.now();

    if (filteredFiles.length > 0) {
      console.log('[ChromeHotReload] Detected changes in:', filteredFiles.map(f => path.basename(f)));
    }

    return filteredFiles;
  }

  cleanup() {
    // 清除防抖定时器
    if (this.notifyTimeout) {
      clearTimeout(this.notifyTimeout);
      this.notifyTimeout = null;
    }

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