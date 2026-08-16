/* ===== MoneyFast Admin (Vue 3) — entry ===== */
import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';
import { t, langState } from './i18n';

window.__dbg && window.__dbg.mark('js', 'เริ่มรัน Vue app');

/* โหมดมืด + ภาษาเริ่มต้น */
const dark = localStorage.getItem('moneyfast_theme') === 'dark';
document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
document.documentElement.lang = langState.lang;
document.title = t('title');

createApp(App).mount('#app');

/* PWA: ลงทะเบียน service worker (ติดตั้งลงหน้าจอ + ใช้ offline ได้) */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
  });
}

window.__dbg && window.__dbg.mark('js-done', 'Vue app เริ่มต้นเสร็จ');
