<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { store } from '../store';
import { t } from '../i18n';
import { loanCalc, fmtKip, formatShortDateTime } from '../logic';
import { getApps, saveApps, showToast } from '../apps';

const targetId = computed(() => store.modals.pay);
const app = computed(() => store.apps.find((a) => a.id === targetId.value) || null);

const form = reactive({ type: 'interest', amount: '' });
const err = reactive({ show: false, msg: '' });
const amountInvalid = ref(false);

watch(targetId, (id) => {
  if (id) {
    form.type = 'interest';
    form.amount = '';
    err.show = false;
    amountInvalid.value = false;
  }
});

const calc = computed(() => (app.value ? loanCalc(app.value) : null));

const history = computed(() => {
  if (!calc.value) return [];
  return (calc.value.payBreak || []).slice().sort((a, b) => a.at - b.at);
});

const preview = computed(() => {
  const c = calc.value;
  if (!c) return null;
  const type = form.type;
  const amount = Number(form.amount) || 0;
  if (amount <= 0) return null;
  const typeLabel = t(type === 'interest' ? 'payTypeInterest' : (type === 'all' ? 'payTypeAll' : 'payTypeCustom'));
  if (type === 'all') {
    const remTotal = Math.max(0, c.remTotal - amount);
    return { html: t('payPrevAllHtml', { amount: fmtKip(amount), type: typeLabel, remTotal: fmtKip(remTotal) }) };
  }
  if (type === 'custom') {
    const iPart = Math.min(c.remInterest, amount);
    const pPart = Math.min(c.remPrincipal, amount - iPart);
    const remTotal = Math.max(0, c.remTotal - amount);
    return { html: t('payPrevCustomHtml', { amount: fmtKip(amount), type: typeLabel, iPart: fmtKip(iPart), pPart: fmtKip(pPart), remTotal: fmtKip(remTotal) }) };
  }
  const remType = Math.max(0, c.remInterest - amount);
  const remTotal = remType + c.remPrincipal;
  return { html: t('payPrevHtml', { amount: fmtKip(amount), type: typeLabel, typeLabel: typeLabel, remType: fmtKip(remType), remTotal: fmtKip(remTotal) }) };
});

function onTypeChange() {
  const c = calc.value;
  if (!c) return;
  if (form.type === 'all') {
    form.amount = String(Math.round(c.remTotal));
    amountInvalid.value = false;
    err.show = false;
  } else if (form.type === 'custom') {
    form.amount = '';
    amountInvalid.value = false;
    err.show = false;
  }
}

function onAmountInput() {
  amountInvalid.value = false;
  err.show = false;
}

function close() { store.modals.pay = null; }

function submit() {
  const c = calc.value;
  const a = app.value;
  if (!a || !c) return;
  const type = form.type;
  const amount = Number(form.amount);
  const rem = type === 'interest' ? c.remInterest : c.remTotal;
  if (!amount || amount <= 0) {
    amountInvalid.value = true;
    err.msg = t('payErrAmount');
    err.show = true;
    return;
  }
  if (rem <= 0) {
    amountInvalid.value = true;
    err.msg = t('payErrZero');
    err.show = true;
    return;
  }
  if (amount > rem) {
    amountInvalid.value = true;
    err.msg = t('payErrOver', { max: fmtKip(rem) });
    err.show = true;
    return;
  }
  if (type === 'all' && amount !== rem) {
    amountInvalid.value = true;
    err.msg = t('payErrAllShort', { total: fmtKip(rem) });
    err.show = true;
    return;
  }
  const list = getApps();
  const target = list.find((x) => x.id === a.id);
  if (!target) return;
  target.payments = target.payments || [];
  const rec = { amount: amount, type: type, at: Date.now() };
  if (type === 'all') rec.interestPortion = c.remInterest;
  target.payments.push(rec);
  try {
    saveApps(list);
  } catch (err2) {
    target.payments.pop();
    amountInvalid.value = true;
    err.msg = t('errSave');
    err.show = true;
    return;
  }
  close();
  showToast(t('paySaved'));
}
</script>

<template>
  <div v-if="app" class="modal" @click.self="close">
    <div class="modal-box">
      <div class="modal-head">
        <h3>{{ t('payTitle') }}</h3>
        <button type="button" class="modal-close" aria-label="ปิด" @click="close">✕</button>
      </div>
      <div v-if="calc" class="pay-summary" v-html="t('paySumHtml', {
        principal: fmtKip(calc.remPrincipal),
        interest: fmtKip(calc.remInterest),
        total: fmtKip(calc.remTotal),
        paid: fmtKip(calc.paidTotal),
      })"></div>
      <form id="pay-form" novalidate @submit.prevent="submit">
        <div class="field">
          <label for="pay-type">{{ t('payType') }}</label>
          <select id="pay-type" v-model="form.type" @change="onTypeChange">
            <option value="interest">{{ t('payTypeInterest') }}</option>
            <option value="custom">{{ t('payTypeCustom') }}</option>
            <option value="all">{{ t('payTypeAll') }}</option>
          </select>
        </div>
        <div class="field" :class="{ invalid: amountInvalid }">
          <label for="pay-amount">{{ t('payAmount') }}</label>
          <input type="number" id="pay-amount" v-model="form.amount" min="0" step="100000" inputmode="numeric" placeholder="500000" @input="onAmountInput">
          <small class="pay-err" :class="{ show: err.show }">{{ err.msg }}</small>
        </div>
        <div v-if="preview" class="pay-preview show" v-html="preview.html"></div>
        <div v-if="history.length" class="pay-history">
          <h4>{{ t('payHistory') }}</h4>
          <div class="pay-history-list">
            <div v-for="(e, i) in history" :key="i" class="ph-item">
              <span class="ph-date">🗓 {{ formatShortDateTime(e.at) }}</span>
              <span class="ph-nums"><b>💵 {{ fmtKip(e.total) }}</b><br><span class="ph-i">ดอก {{ fmtKip(e.amount) }}</span> · <span class="ph-p">ต้น {{ fmtKip(e.principal) }}</span></span>
            </div>
          </div>
        </div>
        <div class="add-actions">
          <button type="button" class="btn btn-ghost2" @click="close">{{ t('addCancel') }}</button>
          <button type="submit" class="btn btn-green">{{ t('paySave') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
