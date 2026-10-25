import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './assets/main.css';

// Aura con el azul institucional (#0b3a63) como color primario
const SigeaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef5fb',
      100: '#d5e6f4',
      200: '#abcde9',
      300: '#76acd8',
      400: '#3f86c0',
      500: '#1d64a0',
      600: '#134f82',
      700: '#0b3a63',
      800: '#0a3154',
      900: '#082743',
      950: '#05182b',
    },
  },
});

const app = createApp(App);

app.use(createPinia());
useAuthStore().restoreSession();
app.use(router);
app.use(PrimeVue, {
  theme: { preset: SigeaPreset, options: { darkModeSelector: false } },
  // PrimeVue 5 pide clave de licencia (la Community License es gratuita para
  // estudiantes). Sin clave la app funciona, pero muestra un aviso en pantalla.
  license: import.meta.env.VITE_PRIMEUI_LICENSE || undefined,
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);

app.mount('#app');
