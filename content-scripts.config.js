/*
 * @Author: zi.yang
 * @Date: 2025-01-14 22:51:00
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-14 23:46:38
 * @Description: Content Scripts 配置文件
 * @FilePath: /vue3-crx-template/content-scripts.config.js
 */

/**
 * Content Scripts 配置
 * 为每个 content script 文件定义自定义属性
 * 
 * 配置格式：
 * {
 *   'script-name': {
 *     matches: ['<all_urls>'],
 *     run_at: 'document_end',
 *     all_frames: true,
 *     world: 'ISOLATED',
 *     exclude_matches: [],
 *     include_globs: [],
 *     exclude_globs: []
 *   }
 * }
 */
export default {
  // 默认配置，适用于所有未单独配置的 content script
  default: {
    matches: ['<all_urls>'],
    run_at: 'document_end',
    all_frames: false,
    exclude_matches: []
  },

  'content-script': {
    matches: ['<all_urls>'],
    run_at: 'document_end',
    all_frames: false,
    exclude_matches: []
  }
};