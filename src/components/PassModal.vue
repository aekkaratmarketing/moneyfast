<script setup>
import { reactive, ref, computed } from 'vue';
import { store } from '../store';
import { t } from '../i18n';
import { apiPassword } from '../api';
import { showToast } from '../apps';

const form = reactive({ current: '', next: '', confirm: '' });
const err = reactive({ show: false, msg: '' });
const submitting = ref(false);

const open = computed(() => store.modals.pass);
const close = () => { store.modals.pass = false; };

async function submit() {
  const cur = form.current;
  const nw = form.next;
  const cf = form.confirm;
  if (!nw || nw.length < 4) {
    err.msg = t('passErrShort');
    err.show = true;
    return;
  }
  if (nw !== cf) {
    err.msg = t('passErrMatch');
    err.show = true;
    return;
  }
  submitting.value = true;
  try {
    const data = await apiPassword(cur, nw);
    if (data && data.ok) {
      close();
      showToast(t('passSaved'));
    } else if (data && data.error === 'wrong-current') {
      err.msg = t('passErrCurrent');
      err.show = true;
    } else {
      err.msg = t('errSave');
      err.show = true;
    }
  } catch (e) {
    err.msg = t('errSave');
    err.show = true;
  }
  submitting.value = false;
}

function clearErr() { err.show = false; }
</script>

<template>
  <div v-if="open" class="modal" @click.self="close">
    <div class="modal-box">
      <div class="modal-head">
        <h3>{{ t('passTitle') }}</h3>
        <button type="button" class="modal-close" aria-label="ปิด" @click="close">✕</button>
      </div>
      <form id="pass-form" novalidate @submit.prevent="submit">
        <div class="field">
          <label for="pass-current">{{ t('passCurrent') }}</label>
          <div class="login-input">
            <span class="login-ic">🔑</span>
            <input type="password" id="pass-current" v-model="form.current" autocomplete="current-password" placeholder="••••••" @input="clearErr">
          </div>
        </div>
        <div class="field">
          <label for="pass-new">{{ t('passNew') }}</label>
          <div class="login-input">
            <span class="login-ic">🔒</span>
            <input type="password" id="pass-new" v-model="form.next" autocomplete="new-password" placeholder="••••••" @input="clearErr">
          </div>
        </div>
        <div class="field">
          <label for="pass-confirm">{{ t('passConfirm') }}</label>
          <div class="login-input">
            <span class="login-ic">✅</span>
            <input type="password" id="pass-confirm" v-model="form.confirm" autocomplete="new-password" placeholder="••••••" @input="clearErr">
          </div>
        </div>
        <div class="login-error" :class="{ show: err.show }">{{ err.msg }}</div>
        <div class="add-actions modal-actions-center">
          <button type="button" class="btn btn-ghost2" @click="close">{{ t('addCancel') }}</button>
          <button type="submit" class="btn btn-green" :disabled="submitting">{{ t('passSave') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
