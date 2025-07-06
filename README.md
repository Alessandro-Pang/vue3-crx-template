# vue3-crx-template

Vue3 Chrome Extensions Template

## Project setup
```
pnpm install
```

### 首次使用热重载功能
1. 安装依赖后，确保已安装`ws`包（已包含在devDependencies中）
2. 运行`pnpm run dev`启动开发服务器
3. 在Chrome中加载扩展（开发者模式）
4. 修改content-script或background相关文件，扩展会自动重载

### Compiles and hot-reloads for development
```
pnpm run dev
```

**注意：** 项目已实现智能的Chrome扩展热重载机制：
- 禁用了webpack默认的热重载，避免页面不断刷新
- 实现了自定义的Chrome扩展重载系统，使用`chrome.runtime.reload()`
- 在content-script中添加了防重复注入的逻辑
- 通过WebSocket连接开发服务器，实现精确的扩展重载

当修改content-script或background相关文件时，扩展会自动重载而不会刷新页面。

### 热重载工作原理
1. webpack插件监听Chrome扩展相关文件变化
2. 通过WebSocket通知content-script
3. content-script发送消息给background script
4. background script调用`chrome.runtime.reload()`重载扩展

### Compiles and minifies for production
```
pnpm run build
```

### Lints and fixes files
```
pnpm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
