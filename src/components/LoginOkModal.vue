<script setup>
import { computed } from 'vue';
import { store } from '../store';
import { t } from '../i18n';

const open = computed(() => store.modals.loginOk);
const close = () => { store.modals.loginOk = false; };
</script>

<template>
  <div v-if="open" class="modal" @click.self="close">
    <div class="modal-box modal-center">
      <div class="login-ok-icon">✅</div>
      <h3>{{ t('loginOkTitle') }}</h3>
      <p class="del-msg">{{ t('loginOkMsg') }}</p>
      <div class="add-actions modal-actions-center">
        <button type="button" class="btn btn-green" @click="close">{{ t('loginOkBtn') }}</button>
      </div>
    </div>
  </div>
</template>
