<template>
  <div>This is HomeView</div>
  <div>count: {{ countStore.count }}</div>
  <div>button: <button @click="clickHandler">click Me</button></div>
</template>

<style lang="scss"></style>
<script setup lang="ts">
import { useCounterStore } from "../store";

const countStore = useCounterStore();
const clickHandler = () => {
  countStore.addCount();
};
</script>
