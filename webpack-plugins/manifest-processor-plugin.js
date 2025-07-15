/*
 * @Author: zi.yang
 * @Date: 2025-07-13 11:31:31
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-15 07:51:54
 * @Description: 动态处理 manifest.json，支持自动写入 content scripts 和 background
 * @FilePath: /vue3-crx-template/webpack-plugins/manifest-processor-plugin.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Manifest 处理插件
 * 用于在不同环境下动态修改 manifest.json 文件
 * 支持自动检测并写入 content scripts 和 background
 */
class ManifestProcessorPlugin {
  constructor(options = {}) {
    this.options = {
      manifestPath: 'public/manifest.json',
      outputPath: 'manifest.json',
      isDev: process.env.NODE_ENV !== 'production',
      autoDetectScripts: true, // 是否自动检测脚本文件
      contentScriptsConfigPath: 'content-scripts.config.js', // content scripts 配置文件路径
      ...options,
    };
    this.contentScriptsConfig = null;
  }

  /**
   * 加载 content scripts 配置文件
   * @returns {Object} 配置对象
   */
  async loadContentScriptsConfig() {
    if (this.contentScriptsConfig) {
      return this.contentScriptsConfig;
    }

    try {
      const configPath = path.resolve(process.cwd(), this.options.contentScriptsConfigPath);
      if (fs.existsSync(configPath)) {
        const configUrl = pathToFileURL(configPath).href;
        const configModule = await import(configUrl);
        this.contentScriptsConfig = configModule.default || {};
      }
    } catch (error) {
      console.warn('加载 content scripts 配置文件失败，使用默认配置:', error.message);
    }

    if (!this.contentScriptsConfig) {
      this.contentScriptsConfig = {
        default: {
          matches: ['<all_urls>'],
          run_at: 'document_end',
          all_frames: true,
        }
      };
    }

    return this.contentScriptsConfig;
  }

  /**
   * 获取指定 content script 的配置
   * @param {string} scriptName script 名称（不含扩展名）
   * @param {Object} config 配置对象
   * @returns {Object} script 配置
   */
  getContentScriptConfig(scriptName, config) {
    // 移除路径前缀和扩展名，提取纯文件名
    // 例如: chrome/content-script-ecommerce.abc123.js -> content-script-ecommerce
    let baseName = scriptName.replace(/^chrome\//, '');
    baseName = baseName.replace(/\.[a-f0-9]+\.js$/, '');
    baseName = baseName.replace(/\.js$/, '');

    // 优先使用具体配置，否则使用默认配置
    return config[baseName] || config.default;
  }

  /**
   * 自动检测构建的脚本文件
   * @param {Object} compilation webpack compilation 对象
   * @returns {Object} 检测到的脚本信息
   */
  detectScripts(compilation) {
    const scripts = {
      background: null,
      contentScripts: [],
    };

    // 获取所有资源文件名
    const assets = Object.keys(compilation.assets);

    // 如果当前编译没有 chrome 资源，尝试从 dist 目录读取
    const chromeAssets = assets.filter((asset) => asset.startsWith('chrome/'));
    if (chromeAssets.length === 0) {
      return this.detectScriptsFromDist();
    }

    // 检测 background script (支持 contenthash)
    const backgroundJs = assets.find(
      (asset) => asset.match(/^chrome\/background\.[a-f0-9]+\.js$/) || asset === 'chrome/background.js'
    );
    if (backgroundJs) {
      scripts.background = backgroundJs;
    }

    // 检测 content scripts (支持 contenthash)
    const contentScriptPattern = /^chrome\/content-script(?:-\w+)?(?:\.[a-f0-9]+)?\.js$/;
    const contentScriptJs = assets.filter((asset) =>
      contentScriptPattern.test(asset)
    );

    contentScriptJs.forEach((jsFile) => {
      // 提取基础名称，去掉 contenthash 和扩展名
      const baseName = jsFile.replace(/\.[a-f0-9]+\.js$/, '').replace(/\.js$/, '');
      const cssFile = assets.find((asset) =>
        asset.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.[a-f0-9]+\\.css$`)) ||
        asset === `${baseName}.css`
      );

      scripts.contentScripts.push({
        js: jsFile,
        css: cssFile || null,
      });
    });
    return scripts;
  }

  detectScriptsFromDist() {
    const scripts = {
      background: null,
      contentScripts: [],
    };

    try {
      const distPath = path.resolve(process.cwd(), 'dist');
      const chromePath = path.join(distPath, 'chrome');

      if (!fs.existsSync(chromePath)) {
        return scripts;
      }

      const files = fs.readdirSync(chromePath);

      // 检测 background script (支持 contenthash)
      const backgroundFile = files.find(file =>
        file.match(/^background\.[a-f0-9]+\.js$/) || file === 'background.js'
      );
      if (backgroundFile) {
        scripts.background = `chrome/${backgroundFile}`;
      }

      // 检测 content scripts (支持 contenthash)
      const contentScriptPattern = /^content-script(?:-\w+)?(?:\.[a-f0-9]+)?\.js$/;
      const contentScriptFiles = files.filter((file) =>
        contentScriptPattern.test(file)
      );

      contentScriptFiles.forEach((jsFile) => {
        // 提取基础名称，去掉 contenthash 和扩展名
        const baseName = jsFile.replace(/\.[a-f0-9]+\.js$/, '').replace(/\.js$/, '');
        const cssFile = files.find(file =>
          file.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.[a-f0-9]+\\.css$`)) ||
          file === `${baseName}.css`
        );

        scripts.contentScripts.push({
          js: `chrome/${jsFile}`,
          css: cssFile ? `chrome/${cssFile}` : null,
        });
      });
    } catch {
      // 静默处理错误，返回空结果
    }

    return scripts;
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync(
      'ManifestProcessorPlugin',
      async (compilation, callback) => {
        try {
          // 读取原始 manifest.json
          const manifestPath = path.resolve(
            process.cwd(),
            this.options.manifestPath
          );
          const manifestContent = fs.readFileSync(manifestPath, 'utf8');
          const manifest = JSON.parse(manifestContent);

          // 如果启用自动检测脚本
          if (this.options.autoDetectScripts) {
            const detectedScripts = this.detectScripts(compilation);
            const config = await this.loadContentScriptsConfig();

            // 动态设置 background
            if (detectedScripts.background) {
              manifest.background = {
                service_worker: detectedScripts.background,
              };
            }

            // 动态设置 content_scripts
            if (detectedScripts.contentScripts.length > 0) {
              manifest.content_scripts = detectedScripts.contentScripts.map(
                (script) => {
                  // 获取该 script 的自定义配置
                  const scriptConfig = this.getContentScriptConfig(script.js, config);

                  const contentScript = {
                    ...scriptConfig,
                    js: [script.js],
                  };

                  // 在生产环境下添加 CSS 文件
                  if (!this.options.isDev && script.css) {
                    contentScript.css = [script.css];
                  }

                  return contentScript;
                }
              );
            }
          } else {
            // 在开发环境下，移除 content_scripts 中的 css 字段
            if (this.options.isDev && manifest.content_scripts) {
              manifest.content_scripts = manifest.content_scripts.map(
                (script) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { css, ...scriptWithoutCss } = script;
                  return scriptWithoutCss;
                }
              );
            }
          }

          // 将处理后的 manifest 添加到输出中
          const processedManifest = JSON.stringify(manifest, null, 2);
          compilation.assets[this.options.outputPath] = {
            source: () => processedManifest,
            size: () => processedManifest.length,
          };

          callback();
        } catch (error) {
          console.error('ManifestProcessorPlugin 处理失败:', error);
          callback(error);
        }
      }
    );
  }
}

export default ManifestProcessorPlugin;
