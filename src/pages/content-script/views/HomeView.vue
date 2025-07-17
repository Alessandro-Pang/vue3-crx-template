<!--
 * @Author: zi.yang
 * @Date: 2024-11-01 11:30:17
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-13 23:09:53
 * @Description: 
 * @FilePath: /vue3-crx-template/src/views/content-script/views/HomeView.vue
-->
<script setup lang="ts">
import { reactive, ref } from 'vue';

import { useCounterStore } from '../store/counter';

const countStore = useCounterStore();
const isHighlighting = ref(false);
const showStats = ref(false);
const stats = reactive({
  链接数量: 0,
  图片数量: 0,
  段落数量: 0,
  标题数量: 0,
  表单元素: 0,
  视频数量: 0,
  列表数量: 0,
  表格数量: 0,
});

const clickHandler = () => {
  countStore.addCount();
};

const handlerHighlightLink = () => {
  const links = document.querySelectorAll('a');
  isHighlighting.value = !isHighlighting.value;

  links.forEach((link) => {
    if (isHighlighting.value) {
      link.classList.add('vue3-crx-highlight');
      // 添加点击事件监听
      link.addEventListener('click', handleLinkClick, { once: true });
    } else {
      link.classList.remove('vue3-crx-highlight');
      link.removeEventListener('click', handleLinkClick);
    }
  });
};

const handleLinkClick = (event: Event) => {
  event.preventDefault();
  const link = event.target as HTMLAnchorElement;
  const url = link.href;

  // 创建提示框显示链接信息
  const tooltip = document.createElement('div');
  tooltip.className = 'vue3-crx-link-tooltip';
  tooltip.innerHTML = `
    <div class="tooltip-content">
      <strong>链接信息:</strong><br>
      <span class="tooltip-text">${link.textContent || '无文本'}</span><br>
      <span class="tooltip-url">${url}</span>
      <div class="tooltip-actions">
        <button onclick="window.open('${url}', '_blank'); this.parentElement.parentElement.parentElement.remove();">打开链接</button>
        <button onclick="this.parentElement.parentElement.parentElement.remove();">关闭</button>
      </div>
    </div>
  `;

  document.body.appendChild(tooltip);

  // 3秒后自动移除
  setTimeout(() => {
    if (tooltip.parentElement) {
      tooltip.remove();
    }
  }, 5000);
};

const updateStats = () => {
  stats.链接数量 = document.querySelectorAll('a').length;
  stats.图片数量 = document.querySelectorAll('img').length;
  stats.段落数量 = document.querySelectorAll('p').length;
  stats.标题数量 = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
  stats.表单元素 = document.querySelectorAll(
    'input, textarea, select, button'
  ).length;
  stats.视频数量 = document.querySelectorAll(
    'video, iframe[src*="youtube"], iframe[src*="vimeo"]'
  ).length;
  stats.列表数量 = document.querySelectorAll('ul, ol').length;
  stats.表格数量 = document.querySelectorAll('table').length;
};

const handleStatistic = () => {
  updateStats();
  showStats.value = !showStats.value;
};

const copyStats = () => {
  const statsText = Object.entries(stats)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  navigator.clipboard.writeText(`页面统计信息:\n${statsText}`).then(() => {
    // 显示复制成功提示
    const toast = document.createElement('div');
    toast.className = 'vue3-crx-toast';
    toast.textContent = '统计信息已复制到剪贴板！';
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 2000);
  });
};
</script>

<template>
  <div class="home-view">
    <div class="header">
      <h3 class="title">🏠 <span class="highlight">HomeView</span></h3>
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

      <div class="action-group">
        <h4 class="group-title">页面工具</h4>
        <button
          class="btn"
          :class="isHighlighting ? 'btn-warning' : 'btn-secondary'"
          @click="handlerHighlightLink"
        >
          <span class="btn-icon">🔗</span>
          {{ isHighlighting ? '取消高亮' : '高亮链接' }}
        </button>
        <button
          class="btn"
          :class="showStats ? 'btn-success' : 'btn-info'"
          @click="handleStatistic"
        >
          <span class="btn-icon">📊</span>
          {{ showStats ? '隐藏统计' : '页面统计' }}
        </button>
      </div>

      <!-- 统计信息面板 -->
      <div v-if="showStats" class="stats-panel">
        <div class="stats-header">
          <h4 class="stats-title">📈 页面统计信息</h4>
          <button class="btn btn-mini" @click="copyStats">
            <span class="btn-icon">📋</span>
            复制
          </button>
        </div>
        <div class="stats-grid">
          <div v-for="(value, key) in stats" :key="key" class="stat-item">
            <span class="stat-label">{{ key }}</span>
            <span class="stat-value">{{ value }}</span>
          </div>
        </div>
        <div class="stats-footer">
          <small class="stats-note"
            >💡 点击"高亮链接"后可点击链接查看详细信息</small
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.home-view {
  .header {
    margin-bottom: 16px;

    .title {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;

      .highlight {
        color: #3366fa;
        text-shadow: 0 1px 2px rgba(51, 102, 250, 0.3);
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

      &:last-child {
        margin-bottom: 0;
      }

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

        &.btn-secondary {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
          }
        }

        &.btn-info {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(79, 172, 254, 0.4);
          }
        }

        &.btn-warning {
          background: linear-gradient(135deg, #ffa726 0%, #ff7043 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 167, 38, 0.4);
          }
        }

        &.btn-success {
          background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 187, 106, 0.4);
          }
        }

        &.btn-mini {
          padding: 4px 8px;
          font-size: 11px;
          background: linear-gradient(135deg, #90a4ae 0%, #607d8b 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(144, 164, 174, 0.4);
          }
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    .stats-panel {
      margin-top: 16px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);

      .stats-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .stats-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #e0e0e0;
        }
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 12px;

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          font-size: 12px;

          .stat-label {
            color: #b0b0b0;
          }

          .stat-value {
            font-weight: 600;
            color: #4fc3f7;
          }
        }
      }

      .stats-footer {
        .stats-note {
          color: #90a4ae;
          font-size: 10px;
          line-height: 1.3;
        }
      }
    }
  }
}
</style>

<style lang="scss">
.vue3-crx-highlight {
  position: relative;
  padding: 2px 4px !important;
  margin: 0 1px !important;
  background: linear-gradient(135deg, #ffeb3b 0%, #ffc107 100%) !important;
  color: #333 !important;
  border-radius: 3px !important;
  box-shadow: 0 2px 4px rgba(255, 193, 7, 0.3) !important;
  transition: all 0.3s ease !important;
  cursor: pointer !important;
  text-decoration: none !important;

  &:hover {
    background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 8px rgba(255, 152, 0, 0.4) !important;
  }

  &::before {
    content: '🔗';
    position: absolute;
    top: -8px;
    right: -8px;
    font-size: 10px;
    background: #ff5722;
    color: white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

.vue3-crx-link-tooltip {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10000;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  animation: tooltipFadeIn 0.3s ease;

  .tooltip-content {
    padding: 16px;
    color: white;
    font-size: 13px;
    max-width: 300px;

    strong {
      color: #4fc3f7;
      font-size: 14px;
    }

    .tooltip-text {
      display: block;
      margin: 8px 0;
      color: #e0e0e0;
      font-weight: 500;
    }

    .tooltip-url {
      display: block;
      margin: 8px 0;
      color: #81c784;
      font-size: 11px;
      word-break: break-all;
      background: rgba(255, 255, 255, 0.05);
      padding: 4px 8px;
      border-radius: 4px;
    }

    .tooltip-actions {
      margin-top: 12px;
      display: flex;
      gap: 8px;

      button {
        padding: 6px 12px;
        border: none;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &:first-child {
          background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
          }
        }

        &:last-child {
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
          color: white;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
          }
        }
      }
    }
  }
}

.vue3-crx-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10001;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 16px rgba(76, 175, 80, 0.3);
  animation: toastSlideIn 0.3s ease;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }

  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
