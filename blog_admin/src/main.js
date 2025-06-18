import { createApp } from 'vue'
import App from './App.vue'
import {createPinia} from "pinia"
import {createPersistedState} from "pinia-persistedstate-plugin"
import router from '@/router'
import ElementPlus from "element-plus"
import locale from 'element-plus/dist/locale/zh-cn'
import 'element-plus/dist/index.css'
import '@/assets/base.css'

const app = createApp(App);
const pinia = createPinia();
const persist = createPersistedState();
pinia.use(persist);
app.use(pinia);
app.use(router);
app.use(ElementPlus, {locale});
app.mount('#app')

