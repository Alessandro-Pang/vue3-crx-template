/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Chrome Extension API 类型声明
declare const chrome: typeof import('@types/chrome').chrome;
