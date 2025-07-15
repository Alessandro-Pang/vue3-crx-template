# Vue3 Chrome Extension Template

一个功能相对完善且可以开箱即用的 Vue3 Chrome 扩展开发模板，支持 Manifest V3，集成了现代化的开发工具链和热重载功能。

## ✨ 特性

- 🚀 **Vue 3** + **TypeScript** + **Pinia** 状态管理
- 📦 **Manifest V3** 支持
- 🔥 **热重载** 开发体验
- 🎯 **多页面架构** - 支持 popup、options、devtools、side-panel 等
- 📝 **Content Script** 注入支持
- 🛠️ **完整的开发工具链** - ESLint、Prettier、Sass
- 🔧 **自定义 Webpack 配置** 优化构建

## 📁 项目结构

```tree
vue3-crx-template/
├── public/
│   ├── manifest.json          # Chrome 扩展配置文件
│   ├── icons/                 # 扩展图标
│   └── index.html            # HTML 模板
├── src/
│   ├── chrome/
│   │   ├── background.ts      # Service Worker 后台脚本
│   │   └── content-script.ts  # 内容脚本
│   ├── views/
│   │   ├── popup/            # 弹出页面
│   │   ├── options/          # 选项页面
│   │   ├── devtools/         # 开发者工具页面
│   │   ├── side-panel/       # 侧边栏页面
│   │   ├── panel/            # 面板页面
│   │   └── content-script/   # 内容脚本 Vue 组件
│   └── components/           # 共享组件
├── webpack-plugins/          # 自定义 Webpack 插件
└── webpack.chrome.config.js  # Chrome 扩展专用构建配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- pnpm (推荐) 或 npm

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm run dev
```

此命令会：

- 启动 Vue 开发服务器
- 监听 Chrome 扩展文件变化
- 支持热重载功能

### 构建生产版本

```bash
pnpm run build
```

构建完成后，`dist` 目录包含可直接加载到 Chrome 的扩展文件。

### 代码检查和格式化

```bash
pnpm run lint
```

## 🔧 Chrome 扩展加载

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目的 `dist` 目录

## 📖 页面说明

### Popup 页面

点击扩展图标时显示的弹出窗口，适合放置快速操作和状态展示。

### Options 页面

扩展的设置页面，用户可以在这里配置扩展的各种选项。

### DevTools 页面

集成到 Chrome 开发者工具中的面板，适合开发调试工具。

### Side Panel 页面

Chrome 侧边栏页面，提供持久化的用户界面。

### Content Script

注入到网页中的脚本，可以与页面内容进行交互。

#### 自动加载机制

项目支持 Content Script 的自动检测和加载：

- **自动检测**：构建时自动扫描 `src/chrome/` 目录下的 `content-script*.ts` 文件
- **动态注册**：自动将检测到的脚本添加到 `manifest.json` 的 `content_scripts` 字段
- **命名规则**：支持 `content-script.ts`、`content-script-social.ts`、`content-script-ecommerce.ts` 等命名方式

#### 自定义配置

通过 `content-scripts.config.js` 文件可以为每个 Content Script 配置不同的属性：

```javascript
export default {
  // 默认配置，适用于所有未单独配置的 content script
  default: {
    matches: ['<all_urls>'],
    run_at: 'document_end',
    all_frames: false,
    exclude_matches: []
  },

  // 为特定的 content script 配置
  'content-script': {
    matches: ['<all_urls>'],
    run_at: 'document_end',
    all_frames: false,
    exclude_matches: []
  },

  'content-script-social': {
    matches: ['*://*.twitter.com/*', '*://*.facebook.com/*'],
    run_at: 'document_idle',
    all_frames: true
  },

  'content-script-ecommerce': {
    matches: ['*://*.amazon.com/*', '*://*.taobao.com/*'],
    run_at: 'document_start',
    world: 'MAIN'
  }
};
```

**支持的配置选项：**

- `matches`: 匹配的网页 URL 模式
- `exclude_matches`: 排除的网页 URL 模式
- `include_globs`: 包含的 glob 模式
- `exclude_globs`: 排除的 glob 模式
- `run_at`: 脚本运行时机（`document_start`、`document_end`、`document_idle`）
- `all_frames`: 是否在所有框架中运行
- `world`: 脚本运行环境（`ISOLATED`、`MAIN`）

#### 添加新的 Content Script

1. 在 `src/chrome/` 目录下创建新的脚本文件，如 `content-script-custom.ts`
2. 在 `content-scripts.config.js` 中添加对应配置（可选，会使用默认配置）
3. 构建时会自动检测并添加到 manifest.json

#### 多脚本注入示例

```typescript
// src/chrome/content-script-social.ts
import createVueApp from '@/views/content-script-test/main';

// 需要注入多个 content-script 时，最好使用 IIFE 立即执行函数包裹，这样可以避免全局变量污染
// 否则，如果两个 content-script 都使用了同一个全局变量，那么它们之间就会互相影响。
// 例如：同时使用 const 声明 div 变量，就会报错：
//   Cannot redeclare block-scoped variable 'div'.
(() => {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.top = '100px';
  div.style.left = '100px';
  document.body.appendChild(div);
  createVueApp(div);
})();
```

## 🛠️ 技术栈

- **前端框架**: Vue 3 + Composition API
- **类型系统**: TypeScript
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **样式**: Sass/SCSS
- **构建工具**: Vue CLI + Webpack
- **代码规范**: ESLint + Prettier
- **包管理**: pnpm

## 📝 开发指南

### 添加新页面

1. 在 `src/views/` 下创建新的页面目录
2. 在 `vue.config.js` 的 `chromePageList` 数组中添加页面名称
3. 在 `public/manifest.json` 中配置相应的页面入口

### 权限配置

在 `public/manifest.json` 中的 `permissions` 和 `host_permissions` 字段配置所需权限。

### 热重载

开发模式下支持以下热重载：

- Vue 组件热重载
- Background Script 自动重载
- Content Script 自动重载

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 🔗 相关链接

- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)
- [Vue 3 文档](https://vuejs.org/)
- [Manifest V3 迁移指南](https://developer.chrome.com/docs/extensions/migrating/)
