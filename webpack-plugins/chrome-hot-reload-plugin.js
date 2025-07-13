/*
 * @Author: zi.yang
 * @Date: 2025-07-12 23:52:14
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-13 11:52:15
 * @Description: chrome扩展热重载插件，提供开发时的自动重载功能
 * @FilePath: /vue3-crx-template/webpack-plugins/chrome-hot-reload-plugin.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Chrome扩展热重载插件
 * 提供开发时的自动重载功能，支持background和content-script
 */
class ChromeHotReloadPlugin {
  constructor(options = {}) {
    this.options = {
      port: options.port || 9090,
      host: options.host || 'localhost',
      entries: options.entries || ['chrome/background', 'chrome/content-script'],
      debounceDelay: options.debounceDelay || 300,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || 1000,
      enableLogging: options.enableLogging !== false, // 默认启用日志
      ...options
    };
    this.server = null;
    this.clients = new Set();
    this.lastBuildTime = Date.now();
    this.notifyTimeout = null;
    this.lastNotifyTime = 0;
    this.isShuttingDown = false;
    this.fileWatcher = new Map(); // 文件变化缓存
  }

  apply(compiler) {
    // 存储上次构建时间
    this.lastBuildTime = Date.now();
    this.changedFiles = new Set();
    this.currentBuildChangedFiles = new Set();

    // 检查 webpack 模式而不是环境变量
    if (compiler.options.mode !== 'development') {
      this.log('非开发模式，跳过热重载插件初始化');
      return;
    }

    this.log('初始化Chrome热重载插件');

    // 监听文件变化事件
    compiler.hooks.invalid.tap('ChromeHotReloadPlugin', (fileName, changeTime) => {
      if (fileName && !this.isShuttingDown) {
        // 过滤重复的文件变化事件
        const lastChangeTime = this.fileWatcher.get(fileName);
        if (!lastChangeTime || changeTime - lastChangeTime > 100) {
          this.changedFiles.add(fileName);
          this.fileWatcher.set(fileName, changeTime || Date.now());
          this.log(`文件变化: ${fileName}`);
        }
      }
    });

    // 在编译开始时保存当前变化的文件
    compiler.hooks.compile.tap('ChromeHotReloadPlugin', () => {
      if (!this.isShuttingDown) {
        this.currentBuildChangedFiles = new Set(this.changedFiles);
      }
    });

    // 在编译完成后注入热重载代码
    compiler.hooks.done.tap('ChromeHotReloadPlugin', (stats) => {
      if (this.isShuttingDown) return;

      // 检查是否有错误
      if (stats.hasErrors()) {
        this.log('编译有错误，跳过热更新', 'warn');
        const errors = stats.compilation.errors.map(err => err.message).join('\n');
        this.notifyClients({
          type: 'compilation-error',
          timestamp: Date.now(),
          errors: errors
        });
        return;
      }

      if (!this.server) {
        this.log('WebSocket服务器未启动，尝试重新启动', 'warn');
        this.startWebSocketServer();
        return;
      }

      try {
        this.injectHotReloadCode(stats.compilation);
      } catch (error) {
        this.log(`注入热重载代码失败: ${error.message}`, 'error');
        return;
      }

      const changedFiles = this.getChangedFiles(stats.compilation, true);
      if (changedFiles.length === 0) {
        this.log('没有文件变化，跳过热更新');
        return;
      }

      this.log(`检测到 ${changedFiles.length} 个文件变化`);
      this.scheduleReload(changedFiles);
    });

    compiler.hooks.watchRun.tap('ChromeHotReloadPlugin', () => {
      if (!this.server && !this.isShuttingDown) {
        this.startWebSocketServer();
      }
    });

    compiler.hooks.watchClose.tap('ChromeHotReloadPlugin', () => {
      this.log('监听关闭，清理资源');
      this.cleanup();
    });

    // 监听进程退出事件
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  /**
   * 启动WebSocket服务器
   */
  startWebSocketServer() {
    if (this.isShuttingDown) return;

    try {
      const server = new WebSocketServer({
        port: this.options.port,
        host: this.options.host,
        perMessageDeflate: false, // 禁用压缩以提高性能
        maxPayload: 1024 * 1024 // 1MB最大负载
      });

      server.on('connection', (ws, request) => {
        this.log(`新客户端连接: ${request.socket.remoteAddress}`);
        this.clients.add(ws);

        ws.on('close', (code, reason) => {
          this.log(`客户端断开连接: ${code} ${reason}`);
          this.clients.delete(ws);
        });

        ws.on('error', (error) => {
          this.log(`WebSocket客户端错误: ${error.message}`, 'error');
          this.clients.delete(ws);
        });

        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // 发送连接确认
        this.sendToClient(ws, {
          type: 'connected',
          timestamp: Date.now(),
          config: {
            debounceDelay: this.options.debounceDelay,
            entries: this.options.entries
          }
        });
      });

      server.on('error', (error) => {
        this.log(`WebSocket服务器错误: ${error.message}`, 'error');
        this.server = null;

        // 如果端口被占用，尝试使用其他端口
        if (error.code === 'EADDRINUSE') {
          this.options.port += 1;
          this.log(`端口被占用，尝试使用端口 ${this.options.port}`);
          setTimeout(() => this.startWebSocketServer(), 1000);
        }
      });

      server.on('listening', () => {
        this.log(`WebSocket服务器启动成功: ${this.options.host}:${this.options.port}`);
      });

      this.server = server;

      // 启动心跳检测
      this.startHeartbeat();

    } catch (error) {
      this.log(`启动WebSocket服务器失败: ${error.message}`, 'error');
      this.server = null;
    }
  }

  /**
   * 日志记录方法
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[HotReload ${timestamp}]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️  ${message}`);
        break;
      case 'success':
        console.log(`${prefix} ✅ ${message}`);
        break;
      default:
        console.log(`${prefix} ℹ️  ${message}`);
    }
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isShuttingDown) return;

      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          if (client.isAlive === false) {
            this.log('客户端心跳超时，断开连接');
            client.terminate();
            this.clients.delete(client);
            return;
          }

          client.isAlive = false;
          client.ping();
        } else {
          this.clients.delete(client);
        }
      });
    }, 30000); // 30秒心跳检测
  }

  /**
   * 安全发送消息给单个客户端
   */
  sendToClient(client, message) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        return true;
      } catch (error) {
        this.log(`发送消息失败: ${error.message}`, 'error');
        this.clients.delete(client);
        return false;
      }
    }
    return false;
  }

  /**
   * 通知所有客户端
   */
  notifyClients(message) {
    if (this.clients.size === 0) {
      this.log('没有连接的客户端');
      return;
    }

    let successCount = 0;
    const deadClients = new Set();

    this.clients.forEach(client => {
      if (this.sendToClient(client, message)) {
        successCount++;
      } else {
        deadClients.add(client);
      }
    });

    // 清理失效的客户端
    deadClients.forEach(client => this.clients.delete(client));

    this.log(`消息已发送给 ${successCount} 个客户端`);
  }

  /**
   * 防抖重载调度
   */
  scheduleReload(changedFiles) {
    // 防抖处理：清除之前的定时器
    if (this.notifyTimeout) {
      clearTimeout(this.notifyTimeout);
    }

    // 延迟通知客户端，避免频繁重载
    this.notifyTimeout = setTimeout(() => {
      const now = Date.now();
      if (now - this.lastNotifyTime < this.options.debounceDelay) {
        this.log('重载请求过于频繁，跳过');
        return;
      }

      this.lastNotifyTime = now;
      this.log('触发热重载', 'success');

      this.notifyClients({
        type: 'chrome-reload',
        timestamp: now,
        changedFiles: changedFiles,
        buildTime: this.lastBuildTime
      });
    }, this.options.debounceDelay);
  }

  /**
   * 注入热重载代码到编译后的文件
   */
  injectHotReloadCode(compilation) {
    const outputPath = compilation.outputOptions.path;
    const injectionPromises = [];

    // 并行注入热重载代码
    this.options.entries.forEach(entry => {
      const entryPath = path.join(outputPath, `${entry}.js`);
      if (fs.existsSync(entryPath)) {
        const hotReloadFileName = entry.includes('background')
          ? 'hot-reload-background.js'
          : 'hot-reload-content-script.js';

        injectionPromises.push(
          this.injectToFile(entryPath, hotReloadFileName)
        );
      }
    });

    return Promise.all(injectionPromises);
  }

  /**
   * 向指定文件注入热重载代码
   */
  async injectToFile(targetPath, hotReloadFileName) {
    try {
      const targetContent = await fs.promises.readFile(targetPath, 'utf8');
      const hotReloadMarker = '// Hot reload code injected by ChromeHotReloadPlugin';

      // 检查是否已经注入过
      if (targetContent.includes(hotReloadMarker)) {
        this.log(`跳过重复注入: ${path.basename(targetPath)}`);
        return;
      }

      const hotReloadPath = path.join(__dirname, hotReloadFileName);
      if (!fs.existsSync(hotReloadPath)) {
        throw new Error(`热重载文件不存在: ${hotReloadPath}`);
      }

      let hotReloadCode = await fs.promises.readFile(hotReloadPath, 'utf8');

      // 替换WebSocket URL
      const wsUrl = `ws://${this.options.host}:${this.options.port}`;
      hotReloadCode = hotReloadCode.replace(/ws:\/\/localhost:9090/g, wsUrl);

      // 注入配置信息
      const configInjection = `
// Hot reload configuration
${hotReloadFileName.includes('background') ? 'self' : 'window'}.HOT_RELOAD_CONFIG = ${JSON.stringify({
        debounceDelay: this.options.debounceDelay,
        maxReconnectAttempts: this.options.maxReconnectAttempts,
        reconnectDelay: this.options.reconnectDelay
      })};
`;

      const injectedContent = targetContent + '\n\n' + hotReloadMarker + configInjection + hotReloadCode;
      await fs.promises.writeFile(targetPath, injectedContent);

      this.log(`热重载代码注入成功: ${path.basename(targetPath)}`, 'success');
    } catch (error) {
      this.log(`注入热重载代码失败 ${targetPath}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 获取变化的文件列表
   */
  getChangedFiles(compilation, clearFiles = false) {
    const changedFiles = Array.from(this.currentBuildChangedFiles)
      .filter(file => {
        // 过滤掉不相关的文件类型
        const ext = path.extname(file).toLowerCase();
        return ['.js', '.ts', '.vue', '.css', '.scss', '.sass', '.less'].includes(ext);
      })
      .map(file => path.relative(process.cwd(), file));

    // 只在明确指定时才清空文件列表
    if (clearFiles) {
      this.changedFiles.clear();
      this.currentBuildChangedFiles.clear();
      // 清理文件监听缓存
      this.fileWatcher.clear();
    }

    return changedFiles;
  }

  /**
   * 清理所有资源
   */
  cleanup() {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.log('开始清理热重载插件资源');

    // 清除所有定时器
    if (this.notifyTimeout) {
      clearTimeout(this.notifyTimeout);
      this.notifyTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // 关闭所有WebSocket连接
    if (this.clients.size > 0) {
      this.log(`关闭 ${this.clients.size} 个客户端连接`);
      this.clients.forEach(client => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.close(1000, 'Server shutting down');
          }
        } catch (error) {
          this.log(`关闭客户端连接失败: ${error.message}`, 'error');
        }
      });
      this.clients.clear();
    }

    // 关闭WebSocket服务器
    if (this.server) {
      this.server.close((error) => {
        if (error) {
          this.log(`关闭WebSocket服务器失败: ${error.message}`, 'error');
        } else {
          this.log('WebSocket服务器已关闭', 'success');
        }
      });
      this.server = null;
    }

    // 清理文件监听缓存
    this.fileWatcher.clear();

    this.log('热重载插件资源清理完成', 'success');
  }
}

export default ChromeHotReloadPlugin;