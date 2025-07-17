<script setup lang="ts">
import { useCounterStore } from '../store/counter';

const countStore = useCounterStore();
const clickHandler = () => {
  countStore.addCount();
};
</script>

<template>
  <div class="about-view">
    <div class="header">
      <h3 class="title">ℹ️ <span class="highlight">AboutView</span></h3>
      <div class="counter-display">
        <span class="counter-label">计数器:</span>
        <span class="counter-value">{{ countStore.count }}</span>
        <span class="counter-getter">(×2 = {{ countStore.getCount }})</span>
      </div>
    </div>
    
    <div class="actions">
      <div class="action-group">
        <h4 class="group-title">基础操作</h4>
        <button class="btn btn-primary" @click="clickHandler">
          <span class="btn-icon">🔢</span>
          增加计数
        </button>
      </div>
      
      <div class="info-section">
        <h4 class="group-title">关于信息</h4>
        <div class="info-card">
          <p class="info-text">这是一个 Vue 3 Chrome 扩展的内容脚本示例页面。</p>
          <p class="info-text">展示了状态管理、路由导航和页面交互功能。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.about-view {
  .header {
    margin-bottom: 16px;
    
    .title {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      
      .highlight {
        color: #ff3333;
        text-shadow: 0 1px 2px rgba(255, 51, 51, 0.3);
      }
    }
    
    .counter-display {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      font-size: 13px;
      
      .counter-label {
        color: #e0e0e0;
      }
      
      .counter-value {
        font-weight: 600;
        color: #ffeb3b;
        font-size: 14px;
      }
      
      .counter-getter {
        color: #81c784;
        font-size: 12px;
      }
    }
  }
  
  .actions {
    .action-group {
      margin-bottom: 16px;
      
      .group-title {
        margin: 0 0 8px 0;
        font-size: 13px;
        font-weight: 500;
        color: #e0e0e0;
        opacity: 0.8;
      }
      
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-right: 8px;
        margin-bottom: 6px;
        padding: 6px 12px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        
        .btn-icon {
          font-size: 14px;
        }
        
        &.btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
        }
        
        &:active {
          transform: translateY(0);
        }
      }
    }
    
    .info-section {
      .group-title {
        margin: 0 0 8px 0;
        font-size: 13px;
        font-weight: 500;
        color: #e0e0e0;
        opacity: 0.8;
      }
      
      .info-card {
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border-left: 3px solid #ff3333;
        
        .info-text {
          margin: 0 0 8px 0;
          font-size: 12px;
          line-height: 1.4;
          color: #e0e0e0;
          
          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  }
}
</style>
