<template>
  <div></div>
</template>

<script setup lang="ts">
chrome.devtools.panels.create("CrxPenal", "", "panel.html", () => {
  console.log("Panel was successfully created!");
});
</script>
