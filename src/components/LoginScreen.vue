<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { store } from '../store';
import { t } from '../i18n';
import {
  apiLogin, isLocked, getLockUntil, getFailCount,
  setToken, clearLock, setLock, resetFails, addFail, MAX_FAILS,
} from '../api';
import { hydrateApps } from '../apps';

const form = reactive({ user: '', pass: '' });
const err = reactive({ show: false, lock: false, msg: '' });
const submitting = ref(false);
let lockTimer = null;

function fmtLockTime(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? m + ' ' + t('lockMin') + ' ' + r + ' ' + t('lockSec') : r + ' ' + t('lockSec');
}

function applyLockUI() {
  if (!isLocked()) {
    err.show = false;
    err.lock = false;
    return;
  }
  err.lock = true;
  err.show = true;
  clearInterval(lockTimer);
  lockTimer = setInterval(() => {
    const left = getLockUntil() - Date.now();
    if (left <= 0) {
      clearInterval(lockTimer);
      resetFails();
      clearLock();
      applyLockUI();
      return;
    }
    err.msg = t('lockMsg', { time: fmtLockTime(left) });
  }, 250);
}

async function submit() {
  if (isLocked()) { applyLockUI(); return; }
  const u = form.user.trim();
  const p = form.pass;
  if (!u || !p) {
    err.msg = t('fbErrOther');
    err.show = true;
    return;
  }
  submitting.value = true;
  try {
    const data = await apiLogin(u, p);
    if (data && data.ok && data.token) {
      resetFails();
      clearLock();
      setToken(data.token);
      err.show = false;
      err.lock = false;
      store.authed = true;
      await hydrateApps();
      store.modals.loginOk = true;
    } else {
      const fails = getFailCount() + 1;
      addFail();
      if (fails >= MAX_FAILS) {
        setLock();
        applyLockUI();
      } else {
        err.msg = t('loginErr') + ' · ' + t('failLeft', { n: MAX_FAILS - fails });
        err.show = true;
      }
    }
  } catch (e) {
    err.msg = t('fbErrOther');
    err.show = true;
  }
  submitting.value = false;
}

onMounted(applyLockUI);
onUnmounted(() => clearInterval(lockTimer));
</script>

<template>
  <div id="login-screen">
    <div class="card login-card">
      <div class="login-logo"><span class="logo-icon">⚡</span> MoneyFast <span class="logo-sub">{{ t('brandTag') }}</span></div>
      <h2>{{ t('loginTitle') }}</h2>
      <p class="login-sub">{{ t('loginSub') }}</p>
      <form id="login-form" novalidate @submit.prevent="submit">
        <div class="field">
          <label for="login-user">{{ t('loginUser') }}</label>
          <div class="login-input">
            <span class="login-ic">👤</span>
            <input type="text" id="login-user" v-model="form.user" autocomplete="username" placeholder="admin">
          </div>
        </div>
        <div class="field">
          <label for="login-pass">{{ t('loginPass') }}</label>
          <div class="login-input">
            <span class="login-ic">🔒</span>
            <input type="password" id="login-pass" v-model="form.pass" autocomplete="current-password" placeholder="••••••">
          </div>
        </div>
        <div class="login-error" :class="{ show: err.show, lock: err.lock }">{{ err.msg }}</div>
        <button type="submit" class="btn btn-green btn-block btn-lg" :disabled="submitting">
          {{ submitting ? '...' : t('loginBtn') }}
        </button>
      </form>
    </div>
  </div>
</template>
