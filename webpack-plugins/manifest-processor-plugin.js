/*
 * @Author: zi.yang
 * @Date: 2025-07-13 11:31:31
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-13 11:52:05
 * @Description: 开发环境去除 manifest.json 中的 content_scripts 的 css 字段
 * @FilePath: /vue3-crx-template/webpack-plugins/manifest-processor-plugin.js
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Manifest 处理插件
 * 用于在不同环境下动态修改 manifest.json 文件
 */
class ManifestProcessorPlugin {
  constructor(options = {}) {
    this.options = {
      manifestPath: 'public/manifest.json',
      outputPath: 'manifest.json',
      isDev: process.env.NODE_ENV !== 'production',
      ...options
    };
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('ManifestProcessorPlugin', (compilation, callback) => {
      try {
        // 读取原始 manifest.json
        const manifestPath = path.resolve(process.cwd(), this.options.manifestPath);
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);

        // 在开发环境下，移除 content_scripts 中的 css 字段
        if (this.options.isDev && manifest.content_scripts) {
          manifest.content_scripts = manifest.content_scripts.map(script => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { css, ...scriptWithoutCss } = script;
            return scriptWithoutCss;
          });
        }

        // 将处理后的 manifest 添加到输出中
        const processedManifest = JSON.stringify(manifest, null, 2);
        compilation.assets[this.options.outputPath] = {
          source: () => processedManifest,
          size: () => processedManifest.length
        };

        callback();
      } catch (error) {
        console.error('ManifestProcessorPlugin 处理失败:', error);
        callback(error);
      }
    });
  }
}

export default ManifestProcessorPlugin;