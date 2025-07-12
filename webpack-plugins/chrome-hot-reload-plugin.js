import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChromeHotReloadPlugin {
  constructor(options = {}) {
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
    // 检查 webpack 模式而不是环境变量
    if (compiler.options.mode !== 'development') {
      return;
    }

    // 在编译完成后注入热重载代码
    compiler.hooks.done.tap('ChromeHotReloadPlugin', (stats) => {
      // 检查是否有错误
      if (stats.hasErrors()) {
        return;
      }

      this.injectHotReloadCode(stats.compilation);

      const changedFiles = this.getChangedFiles(stats.compilation);
      if (changedFiles.length === 0) {
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
        this.clients.add(ws);

        ws.on('close', () => {
          this.clients.delete(ws);
        });

        ws.on('error', (error) => {
          console.error('[HotReload] WebSocket连接错误:', error.message);
          this.clients.delete(ws);
        });

        // 发送连接确认
        ws.send(JSON.stringify({
          type: 'connected',
          timestamp: Date.now()
        }));
      });

      this.server.on('error', (error) => {
        console.error('[HotReload] WebSocket服务器错误:', error.message);
      });

      console.log(`[HotReload] 热更新服务已启动 ws://${this.options.host}:${this.options.port}`);
    } catch (error) {
      console.error('[HotReload] 启动WebSocket服务器失败:', error.message);
    }
  }

  notifyClients(message) {
    const messageStr = JSON.stringify(message);
    
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

    // 注入到 background.js
    const backgroundPath = path.join(outputPath, 'chrome', 'background.js');
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

    } catch (error) {
      console.error(`[HotReload] 注入热更新代码失败 ${fileName}:`, error.message);
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
      console.log('[HotReload] 检测到文件变化:', filteredFiles.map(f => path.basename(f)).join(', '));
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