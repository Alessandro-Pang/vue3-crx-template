<!--
 * @Author: zi.yang
 * @Date: 2024-11-01 11:30:17
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-12 11:29:49
 * @Description: 
 * @FilePath: /vue3-crx-template/src/views/content-script/views/HomeView.vue
-->
<script setup lang="ts">
import { useCounterStore } from '../store/counter';

const countStore = useCounterStore();
const clickHandler = () => {
  countStore.addCount();
};

const handlerHighlightLink = () => {
  const links = document.querySelectorAll('a');
  links.forEach((link) => {
    link.classList.toggle('vue3-crx-highlight');
  });
};

const handleStatistic = () => {
  const stats = {
    链接数量: document.querySelectorAll('a').length,
    图片数量: document.querySelectorAll('img').length,
    段落数量: document.querySelectorAll('p').length,
    标题数量: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
  };
  alert(
    `页面统计:\n${Object.entries(stats)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')}`
  );
};
</script>

<template>
  <div>This is <span style="color: #3366fa">HomeView</span></div>
  <div>count: {{ countStore.count }}</div>
  <div>button: <button @click="clickHandler">click Me</button></div>
  <div class="button-container">
    <button @click="handlerHighlightLink">高亮链接</button>
    <button @click="handleStatistic">页面统计</button>
  </div>
</template>

<style lang="scss" scoped>
.button-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin: 6px 0;
  gap: 6px;
  font-size: 12px;
}
</style>

<style lang="scss">
.vue3-crx-highlight {
  background-color: yellow !important;
  transition: background-color 0.3s ease;
}
</style>
