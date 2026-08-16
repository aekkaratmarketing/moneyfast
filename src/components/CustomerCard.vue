<script setup>
import { computed } from 'vue';
import { store } from '../store';
import { t } from '../i18n';
import { loanCalc, fmtKip, toWaLink, toFbLink, getAppImages, formatDateTime, TZ } from '../logic';

const props = defineProps({ app: { type: Object, required: true } });

const lc = computed(() => loanCalc(props.app));
const fbLink = computed(() => toFbLink(props.app));
const time = computed(() => formatDateTime(props.app.createdAt));
const imgs = computed(() => getAppImages(props.app));

function openPay() { store.modals.pay = props.app.id; }
function openEdit() {
  store.editingId = props.app.id;
  store.modals.add = true;
}
function openDel() { store.modals.del = props.app.id; }
function openLightbox(src) { store.lightbox = src; }
</script>

<template>
  <div class="app-item" :data-done="lc.done ? 'true' : 'false'">
    <div class="ai-main">
      <div class="ai-name">
        {{ app.first }} {{ app.last }}
        <span v-if="lc.done" class="badge-cleared">{{ t('clearedBadge') }}</span>
        <span v-else class="badge-paying">{{ t('payingBadge') }}</span>
      </div>
      <div class="ai-meta"><span class="ai-ic">📱</span><span class="ai-txt">{{ app.phone }}<span class="ai-dot"> · </span>🗓 {{ time }}</span></div>
    </div>
    <div class="ai-money">
      <div class="ai-amount">กู้ {{ fmtKip(app.amount) }}</div>
      <div class="ai-line">📈 ดอกค้าง {{ fmtKip(lc.remInterest) }}</div>
      <div class="ai-line ai-due">💼 ค้างชำระรวม {{ fmtKip(lc.remTotal) }}</div>
      <div class="ai-line ai-profit">💰 กำไร {{ fmtKip(lc.paidInterest) }}</div>
      <div v-if="lc.done" class="ai-line ai-paid done">✅ {{ t('paidFull') }}</div>
      <div v-else class="ai-line ai-paid">💵 {{ t('paidLabel', { paid: fmtKip(lc.paidTotal), rem: fmtKip(lc.remTotal) }) }}</div>
    </div>
    <div v-if="imgs.length" class="ai-docs">
      <div class="ai-thumbs">
        <img v-for="(src, i) in imgs" :key="i" class="ai-thumb" :src="src" alt="" @click="openLightbox(src)">
      </div>
    </div>
    <div class="ai-controls">
      <div class="ai-actions">
        <button type="button" class="ai-pay" :aria-label="t('payAria')" @click="openPay">💰 {{ t('payBtn') }}</button>
        <button type="button" class="ai-edit" :aria-label="t('editAria')" @click="openEdit">✏️ {{ t('editBtn') }}</button>
        <a class="ai-wa" :href="toWaLink(app.phone)" target="_blank" rel="noopener">💬 {{ t('waBtn') }}</a>
        <a v-if="fbLink" class="ai-fb" :href="fbLink" target="_blank" rel="noopener">📘 {{ t('fbBtn') }}</a>
        <button v-if="lc.done" type="button" class="ai-del" :aria-label="t('delAria')" @click="openDel">🗑 {{ t('delBtn') }}</button>
      </div>
    </div>
  </div>
</template>
