<!--
 * @Author: zi.yang
 * @Date: 2024-11-01 10:41:42
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-13 22:36:02
 * @Description: 
 * @FilePath: /vue3-crx-template/src/views/content-script/App.vue
-->
<script setup lang="ts">
function handleRemove() {
  // @ts-expect-error 忽略类型错误
  window.cleanupVueApp();
}
</script>

<template>
  <div class="wrapper">
    <div class="app-header">
      <h2 class="app-title">🚀 Vue3 Chrome Extension</h2>
      <p class="app-subtitle">Content Script Demo</p>
    </div>
    
    <nav class="navigation">
      <router-link class="nav-link" to="/">
        <span class="nav-icon">🏠</span>
        Home
      </router-link>
      <router-link class="nav-link" to="/about">
        <span class="nav-icon">ℹ️</span>
        About
      </router-link>
    </nav>
    
    <div class="content">
      <router-view />
    </div>
    
    <div class="footer">
      <button class="btn btn-danger" @click="handleRemove">
        <span class="btn-icon">🗑️</span>
        卸载组件
      </button>
      
      <div class="status-info">
        ✨ 热重载测试成功！ ({{ new Date().toLocaleTimeString() }})
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 280px;
  
  .app-header {
    text-align: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    
    .app-title {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(45deg, #fff, #e3f2fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .app-subtitle {
      margin: 0;
      font-size: 12px;
      opacity: 0.8;
      color: #e3f2fd;
    }
  }
  
  .navigation {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    
    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      flex: 1;
      justify-content: center;
      
      .nav-icon {
        font-size: 14px;
      }
      
      &:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }
      
      &.router-link-active {
        background: rgba(255, 255, 255, 0.25);
        box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
      }
    }
  }
  
  .content {
    margin-bottom: 16px;
  }
  
  .footer {
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 8px;
      
      .btn-icon {
        font-size: 14px;
      }
      
      &.btn-danger {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        color: white;
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
        }
      }
      
      &:active {
        transform: translateY(0);
      }
    }
    
    .status-info {
      font-size: 11px;
      color: #ffeb3b;
      opacity: 0.9;
      text-align: center;
    }
  }
}
</style>
