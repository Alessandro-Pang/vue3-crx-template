<script setup lang="ts">
import { useCounterStore } from "./store/counter";
const counterStore = useCounterStore();
</script>

<template>
  <div>Chrome Extension Options Page</div>
  <router-link style="margin-right: 10px" to="/">Go to Home</router-link>
  <router-link style="margin-left: 10px" to="/about">Go to About</router-link>
  <router-view />
  <div>counter-getter: {{ counterStore.getCount }}</div>
</template>

<style lang="scss"></style>
