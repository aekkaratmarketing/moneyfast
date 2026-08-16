<script setup>
import { t } from '../i18n';

defineProps({
  open: Boolean,
  title: String,
  msg: String,
  confirmLabel: String,
  danger: { type: Boolean, default: false },
});
const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <div v-if="open" class="modal" @click.self="emit('cancel')">
    <div class="modal-box">
      <div class="modal-head">
        <h3>{{ title }}</h3>
        <button type="button" class="modal-close" aria-label="ปิด" @click="emit('cancel')">✕</button>
      </div>
      <p class="del-msg" v-html="msg"></p>
      <div class="add-actions">
        <button type="button" class="btn btn-ghost2" @click="emit('cancel')">{{ t('delCancel') }}</button>
        <button type="button" class="btn" :class="danger ? 'btn-danger' : 'btn-green'" @click="emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>
