import { createApp } from "vue";
import App from "./App.vue";

import PrimeVue from "primevue/config";
import Button from "primevue/button";

const app = createApp(App);

app.use(PrimeVue);
app.component("Button", Button);

app.mount("#app");
