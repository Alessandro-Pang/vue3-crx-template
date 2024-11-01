import { defineStore } from "pinia";

export const useCounterStore = defineStore("counter", {
  state: () => ({ count: 1 }),
  getters: {
    getCount: (state) => state.count * 2,
  },
  actions: {
    addCount() {
      this.count++;
    },
  },
});
