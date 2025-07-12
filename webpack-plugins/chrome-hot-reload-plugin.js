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
    // 存储上次构建时间
    this.lastBuildTime = Date.now();
    this.changedFiles = new Set();
    this.currentBuildChangedFiles = new Set();

    // 检查 webpack 模式而不是环境变量
    if (compiler.options.mode !== 'development') {
      return;
    }

    // 监听文件变化事件
    compiler.hooks.invalid.tap('ChromeHotReloadPlugin', (fileName) => {
      if (fileName) {
        this.changedFiles.add(fileName);
      }
    });

    // 在编译开始时保存当前变化的文件
    compiler.hooks.compile.tap('ChromeHotReloadPlugin', () => {
      this.currentBuildChangedFiles = new Set(this.changedFiles);
    });

    // 在编译完成后注入热重载代码
    compiler.hooks.done.tap('ChromeHotReloadPlugin', (stats) => {

      // 检查是否有错误
      if (stats.hasErrors()) {
        console.log('[HotReload] 编译有错误，跳过热更新');
        return;
      }

      if (!this.server) {
        console.log('[HotReload] WebSocket服务器未启动');
        return;
      }

      this.injectHotReloadCode(stats.compilation);

      const changedFiles = this.getChangedFiles(stats.compilation, true);
      if (changedFiles.length === 0) {
        console.log('[HotReload] 没有检测到文件变化');
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

    // 添加afterCompile hook来检测文件变化
    compiler.hooks.afterCompile.tap('ChromeHotReloadPlugin', (compilation) => {
      if (!this.server) {
        return;
      }

      const changedFiles = this.getChangedFiles(compilation);
      if (changedFiles.length > 0) {
        this.notifyClients({
          type: 'chrome-reload',
          timestamp: Date.now(),
          changedFiles: changedFiles
        });
      }
    });

    compiler.hooks.watchClose.tap('ChromeHotReloadPlugin', () => {
      this.cleanup();
    });
  }

  startWebSocketServer() {
    try {
      const server = new WebSocketServer({
        port: this.options.port,
        host: this.options.host
      });

      server.on('connection', (ws) => {
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

      server.on('error', (error) => {
        console.error('[HotReload] WebSocket服务器错误:', error.message);
        this.server = null; // 重置服务器状态
      });

      // 只有在服务器成功启动后才设置this.server
      this.server = server;
      console.log(`[HotReload] 热更新服务已启动 ws://${this.options.host}:${this.options.port}`);
    } catch (error) {
      console.error('[HotReload] 启动WebSocket服务器失败:', error.message);
      this.server = null;
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
      let hotReloadCode = fs.readFileSync(
        path.join(__dirname, hotReloadFileName),
        'utf8'
      );

      // 替换WebSocket URL中的端口
      const wsUrl = `ws://${this.options.host}:${this.options.port}`;
      hotReloadCode = hotReloadCode.replace(/ws:\/\/localhost:9090/g, wsUrl);

      // 添加标记注释和热重载代码
      const injectedContent = targetContent + '\n\n' + hotReloadMarker + '\n' + hotReloadCode;

      // 写入文件
      fs.writeFileSync(targetPath, injectedContent);

    } catch (error) {
      console.error(`[HotReload] 注入热更新代码失败 ${fileName}:`, error.message);
    }
  }

  getChangedFiles(compilation, clearFiles = false) {
    const changedFiles = Array.from(this.currentBuildChangedFiles);

    // 只在明确指定时才清空文件列表
    if (clearFiles) {
      this.changedFiles.clear();
      this.currentBuildChangedFiles.clear();
    }

    return changedFiles;
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