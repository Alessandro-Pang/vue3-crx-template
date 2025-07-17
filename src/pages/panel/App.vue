<!--
 * @Author: zi.yang
 * @Date: 2024-11-01 12:02:06
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-08 07:13:26
 * @Description: 
 * @FilePath: /vue3-crx-template/src/views/panel/App.vue
-->
<script setup lang="ts">
import { useCounterStore } from './store/counter';

const counterStore = useCounterStore();
</script>

<template>
  <div class="wrapper">
    <div>Chrome Extension Panel Page</div>
    <router-link style="margin-right: 10px" to="/">Go to Home</router-link>
    <router-link style="margin-left: 10px" to="/about">Go to About</router-link>
    <router-view />
    <div>counter-getter: {{ counterStore.getCount }}</div>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  width: 220px;
  border-radius: 6px;
  background: #fff;
  padding: 20px;
  line-height: 26px;
  box-shadow: 0 0 8px #000;
  font-size: 14px;

  &::v-deep(button) {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.2em 1em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    background-color: #f9f9f9;
    cursor: pointer;
    transition: border-color 0.25s;

    &:hover {
      border-color: #646cff;
    }
  }
}
</style>
