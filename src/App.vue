<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { store } from './store';
import { t, langState, setLang } from './i18n';
import { isAuthed, getToken, apiMe, clearToken } from './api';
import { hydrateApps, saveApps, showToast } from './apps';
import { esc, fmtKip, TZ_OFF } from './logic';
import LoginScreen from './components/LoginScreen.vue';
import Dashboard from './components/Dashboard.vue';
import AddEditModal from './components/AddEditModal.vue';
import PayModal from './components/PayModal.vue';
import PassModal from './components/PassModal.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import LoginOkModal from './components/LoginOkModal.vue';
import Lightbox from './components/Lightbox.vue';
import Toast from './components/Toast.vue';

/* ---------- ธีม ---------- */
const dark = computed(() => store.dark);
function toggleTheme() {
  store.dark = !store.dark;
  try { localStorage.setItem('moneyfast_theme', store.dark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
  document.documentElement.setAttribute('data-theme', store.dark ? 'dark' : 'light');
}

/* ---------- ภาษา ---------- */
const lang = computed(() => langState.lang);
function switchLang(l) {
  setLang(l);
}

/* ---------- ล็อกอิน/ออกจากระบบ ---------- */
const year = computed(() => new Date(Date.now() + TZ_OFF).getFullYear());

function logout() {
  clearToken();
  store.authed = false;
}

/* ---------- modal: ลบ ---------- */
const delTarget = computed(() => store.modals.del ? store.apps.find((a) => a.id === store.modals.del) : null);
const delMsg = computed(() => delTarget.value
  ? t('delMsgHtml', { name: esc(delTarget.value.first + ' ' + delTarget.value.last) })
  : '');
function confirmDel() {
  if (!store.modals.del) return;
  const list = store.apps.filter((a) => a.id !== store.modals.del);
  saveApps(list);
  store.modals.del = null;
  showToast(t('toastDeleted'));
}

/* ---------- modal: ยืนยันการบันทึก ---------- */
const saveMsg = computed(() => t('saveMsgHtml', {
  name: esc((store.pendingSaveInfo && store.pendingSaveInfo.name) || ''),
  amount: fmtKip((store.pendingSaveInfo && store.pendingSaveInfo.amount) || 0),
  rate: (store.pendingSaveInfo && store.pendingSaveInfo.rate) || 20,
}));
function confirmSave() {
  if (store.pendingSave) store.pendingSave();
}

/* ---------- Escape ปิด modal ---------- */
function onKeydown(e) {
  if (e.key !== 'Escape') return;
  if (store.modals.pay) store.modals.pay = null;
  else if (store.modals.add) { store.modals.add = false; store.editingId = null; }
  else if (store.modals.del) store.modals.del = null;
  else if (store.modals.save) store.modals.save = false;
  else if (store.modals.pass) store.modals.pass = false;
  else if (store.modals.loginOk) store.modals.loginOk = false;
  else if (store.lightbox) store.lightbox = null;
}

/* ---------- เริ่มต้น: ตรวจ token กับเซิร์ฟเวอร์ ---------- */
onMounted(async () => {
  const savedDark = localStorage.getItem('moneyfast_theme') === 'dark';
  store.dark = savedDark;
  document.documentElement.setAttribute('data-theme', savedDark ? 'dark' : 'light');
  document.documentElement.lang = langState.lang;
  document.title = t('title');

  /* fail-open: ถ้า API ค้างเกินกำหนด ให้แสดงหน้า UI ทันที (กันจอขาวค้างตลอด) */
  const failOpen = setTimeout(() => { store.loading = false; }, 12000);
  try {
    if (isAuthed()) {
      try {
        await apiMe();
        store.authed = true;
        await hydrateApps();
      } catch (e) {
        if (e && e.unauth) {
          clearToken();
          store.authed = false;
        } else {
          // เน็ตขัดข้อง/API ค้าง → เข้าระบบชั่วคราวด้วยข้อมูล cache
          store.authed = true;
          await hydrateApps();
        }
      }
    }
  } finally {
    clearTimeout(failOpen);
    store.loading = false;
  }
});

onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <header class="navbar">
    <div class="container nav-inner">
      <div class="nav-left">
        <a href="/" class="logo"><span class="logo-icon">⚡</span> {{ t('brandName') }} <span class="logo-sub">{{ t('brandTag') }}</span></a>
        <button type="button" class="theme-btn" :aria-label="dark ? t('themeLight') : t('themeDark')" @click="toggleTheme">{{ dark ? '☀️' : '🌙' }}</button>
        <div class="lang-switch" role="group" aria-label="ภาษา">
          <button type="button" class="lang-btn" :class="{ active: lang === 'th' }" @click="switchLang('th')">ไทย</button>
          <button type="button" class="lang-btn" :class="{ active: lang === 'lo' }" @click="switchLang('lo')">ລາວ</button>
        </div>
      </div>
      <div v-if="store.authed" class="nav-right">
        <button type="button" class="btn btn-ghost2" @click="store.modals.pass = true">{{ t('passBtn') }}</button>
        <button type="button" class="btn btn-ghost2" @click="logout">{{ t('logoutBtn') }}</button>
      </div>
    </div>
  </header>

  <main>
    <div class="container">
      <LoginScreen v-if="!store.loading && !store.authed" />
      <Dashboard v-if="!store.loading && store.authed" />
    </div>
  </main>

  <footer class="footer">
    <div class="container footer-inner">
      <div class="logo"><span class="logo-icon">⚡</span> {{ t('brandName') }} <span class="logo-sub">{{ t('brandTag') }}</span></div>
      <p>© {{ year }} {{ t('brandName') }}{{ t('brandTag') }}</p>
    </div>
  </footer>

  <AddEditModal />
  <PayModal />
  <PassModal />
  <ConfirmModal
    :open="!!store.modals.del"
    :title="t('delTitle')"
    :msg="delMsg"
    :confirm-label="t('delConfirm')"
    danger
    @confirm="confirmDel"
    @cancel="store.modals.del = null"
  />
  <ConfirmModal
    :open="store.modals.save"
    :title="t('saveTitle')"
    :msg="saveMsg"
    :confirm-label="t('saveConfirm')"
    @confirm="confirmSave"
    @cancel="store.modals.save = false"
  />
  <LoginOkModal />
  <Lightbox />
  <Toast />
</template>
