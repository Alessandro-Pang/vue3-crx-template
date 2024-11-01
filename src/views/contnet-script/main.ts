import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";

export default (rootContainer: string | HTMLElement) => {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount(rootContainer);
  return app;
};
