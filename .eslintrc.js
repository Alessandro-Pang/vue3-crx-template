/*
 * @Author: zi.yang
 * @Date: 2024-07-21 17:36:34
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-06 15:16:49
 * @Description:
 * @FilePath: /vue3-crx-template/.eslintrc.js
 */
module.exports = {
  root: true,
  env: {
    node: true,
    webextensions: true,
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/typescript/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    quotes: ['error', 'single'],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  },
};
