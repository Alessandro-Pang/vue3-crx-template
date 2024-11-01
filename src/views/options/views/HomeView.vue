<script setup lang="ts">
import { useCounterStore } from "../store/counter";

const countStore = useCounterStore();
const clickHandler = () => {
  countStore.addCount();
};
</script>

<template>
  <div>This is <span style="color: #3366fa">HomeView</span></div>
  <div>count: {{ countStore.count }}</div>
  <div>button: <button @click="clickHandler">click Me</button></div>
</template>

<style lang="scss"></style>
