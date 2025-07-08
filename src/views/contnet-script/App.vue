<!--
 * @Author: zi.yang
 * @Date: 2024-11-01 10:41:42
 * @LastEditors: zi.yang
 * @LastEditTime: 2025-07-08 07:56:20
 * @Description: 
 * @FilePath: /vue3-crx-template/src/views/contnet-script/App.vue
-->
<script setup lang="ts">
import { useCounterStore } from './store/counter';

const counterStore = useCounterStore();
</script>

<template>
  <div class="wrapper">
    <div>Content Script Inject Vue Component</div>
    <router-link style="margin-right: 10px" to="/">Go to Home</router-link>
    <router-link style="margin-left: 10px" to="/about">Go to About</router-link>
    <router-view />
    <div>counter-getter: {{ counterStore.getCount }}</div>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  &::v-deep(button) {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.2em 1em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    background-color: #646cff;
    cursor: pointer;
    transition: border-color 0.25s;

    &:hover {
      border-color: #646cff;
    }
  }
}
</style>
