import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
useAuthStore().restoreSession();
app.use(router);
app.use(PrimeVue);

app.mount('#app');
