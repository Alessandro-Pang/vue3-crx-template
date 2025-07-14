/*
 * @Author: zi.yang
 * @Date: 2025-07-13 11:31:31
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-14 08:17:36
 * @Description: 动态处理 manifest.json，支持自动写入 content scripts 和 background
 * @FilePath: /vue3-crx-template/webpack-plugins/manifest-processor-plugin.js
 */
import fs from 'node:fs';
import path from 'node:path';

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
      ...options,
    };
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

    // 检测 background script
    const backgroundJs = assets.find(
      (asset) => asset === 'chrome/background.js'
    );
    if (backgroundJs) {
      scripts.background = backgroundJs;
    }

    // 检测 content scripts
    const contentScriptPattern = /^chrome\/content-script(?:-\w+)?\.js$/;
    const contentScriptJs = assets.filter((asset) =>
      contentScriptPattern.test(asset)
    );

    contentScriptJs.forEach((jsFile) => {
      const baseName = jsFile.replace(/\.js$/, '');
      const cssFile = assets.find((asset) => asset === `${baseName}.css`);

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

      // 检测 background script
      if (files.includes('background.js')) {
        scripts.background = 'chrome/background.js';
      }

      // 检测 content scripts
      const contentScriptPattern = /^content-script(?:-\w+)?\.js$/;
      const contentScriptFiles = files.filter((file) =>
        contentScriptPattern.test(file)
      );

      contentScriptFiles.forEach((jsFile) => {
        const baseName = jsFile.replace(/\.js$/, '');
        const cssFile = files.includes(`${baseName}.css`)
          ? `${baseName}.css`
          : null;

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
      (compilation, callback) => {
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
                  const contentScript = {
                    matches: ['<all_urls>'],
                    js: [script.js],
                    run_at: 'document_end',
                    all_frames: true,
                  };

                  // 在生产环境或有 CSS 文件时添加 CSS
                  if (!this.options.isDev && script.css) {
                    contentScript.css = [script.css];
                  }

                  return contentScript;
                }
              );
            }
          } else {
            // 原有逻辑：在开发环境下，移除 content_scripts 中的 css 字段
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
