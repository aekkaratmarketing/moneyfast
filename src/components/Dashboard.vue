<script setup>
import { computed, watch } from 'vue';
import { store } from '../store';
import { t, langState } from '../i18n';
import {
  loanCalc, fmtNum, fmtKip, compactKip, buildSeries, getRangeBounds,
  DAY, TZ, toDateInput, buildCsv,
} from '../logic';
import { getApps, showToast, exportCsv } from '../apps';
import CustomerCard from './CustomerCard.vue';

const apps = computed(() => store.apps);

const stats = computed(() => {
  const list = store.apps;
  let repay = 0;
  let profit = 0;
  list.forEach((a) => {
    const c = loanCalc(a);
    repay += c.paidTotal;
    profit += c.paidInterest;
  });
  return {
    count: list.length,
    loaned: list.reduce((s, a) => s + Number(a.amount || 0), 0),
    repay: repay,
    profit: profit,
  };
});

const deep = computed(() => {
  const now = Date.now();
  const list = store.apps;
  const total = list.reduce((s, a) => s + Number(a.amount || 0), 0);
  return {
    new7: list.filter((a) => now - a.createdAt <= 7 * DAY).length,
    new30: list.filter((a) => now - a.createdAt <= 30 * DAY).length,
    avg: list.length ? total / list.length : 0,
  };
});

const filtered = computed(() => {
  const q = store.search.trim().toLowerCase();
  return store.apps.filter((a) => {
    const imgNames = (a.houseImages || []).map((h) => (h && h.name) || '').join(' ');
    const hay = (a.first + ' ' + a.last + ' ' + a.phone + ' ' + (a.houseFileName || '') + ' ' + imgNames).toLowerCase();
    return !q || hay.includes(q);
  });
});

const range = computed(() => getRangeBounds(store.chartDays, store.customStart, store.customEnd));

const series = computed(() => {
  const b = range.value;
  if (!b) return [];
  const events = [];
  store.apps.forEach((a) => {
    (loanCalc(a).payBreak || []).forEach((e) => { if (Number(e.amount)) events.push(e); });
  });
  return buildSeries(events, (e) => e.at, (e) => e.amount, null, b);
});

const chartMax = computed(() => Math.max(1, ...series.value.map((d) => d.total)));

const chartTotal = computed(() => {
  if (!range.value) return '';
  const total = series.value.reduce((s, d) => s + d.total, 0);
  const rangeText = store.chartDays === 'custom'
    ? (store.customStart + ' → ' + store.customEnd)
    : (store.chartDays + ' ' + t('days'));
  return total > 0 ? t('chartTotal', { range: rangeText, total: fmtKip(total) }) : '';
});

const chartLabelEvery = computed(() => (series.value.length > 14 ? Math.ceil(series.value.length / 7) : 1));

function chartTip(d) {
  return d.count ? fmtKip(d.total) + ' · ' + d.count + ' ' + t('decidedUnit') : fmtKip(d.total);
}
function showBarLabel(idx) {
  const every = chartLabelEvery.value;
  return every === 1 || idx % every === 0 || idx === series.value.length - 1;
}

const cleared = computed(() => store.apps
  .filter((a) => loanCalc(a).done)
  .map((a) => {
    const c = loanCalc(a);
    const lastPay = (a.payments || []).reduce((m, p) => Math.max(m, Number(p.at) || 0), 0);
    return { app: a, calc: c, clearedAt: lastPay || a.statusChangedAt || a.createdAt };
  })
  .sort((x, y) => y.clearedAt - x.clearedAt)
  .slice(0, 5));

function setDays(days) {
  store.chartDays = days;
  if (days === 'custom') {
    if (!store.customStart) store.customStart = toDateInput(new Date(Date.now() - 6 * DAY));
    if (!store.customEnd) store.customEnd = toDateInput(new Date());
  }
}

function applyRange() {
  const fromVal = store.customStart;
  const toVal = store.customEnd;
  if (!fromVal || !toVal || new Date(toVal + 'T00:00:00+07:00') < new Date(fromVal + 'T00:00:00+07:00')) {
    showToast(t('rangeErr'), true);
    return;
  }
  showToast(t('rangeApplied'));
}

function doExport() {
  const list = getApps();
  exportCsv(list);
  showToast(t('expDone'));
}

function openAdd() {
  store.editingId = null;
  store.modals.add = true;
}

function formatClearedDate(ts) {
  return new Date(ts).toLocaleString(langState.lang === 'lo' ? 'lo-LA' : 'th-TH', {
    timeZone: TZ,
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
</script>

<template>
  <div>
    <div class="page-head">
      <h1>{{ t('adminTitle') }}</h1>
      <p>{{ t('adminSub') }}</p>
      <p v-if="store.syncShown" class="sync-note" :class="store.apiOk ? 'sync-on' : 'sync-off'">
        {{ store.apiOk ? t('syncOnline') : t('syncOffline') }}
      </p>
    </div>

    <div class="stats">
      <div class="stat approved">
        <div class="st-num">{{ stats.count }}</div>
        <div class="st-label">{{ t('stCount') }}</div>
      </div>
      <div class="stat approved">
        <div class="st-num">{{ fmtKip(stats.loaned) }}</div>
        <div class="st-label">{{ t('stLoaned') }}</div>
      </div>
      <div class="stat approved">
        <div class="st-num">{{ fmtKip(stats.repay) }}</div>
        <div class="st-label">{{ t('stRepay') }}</div>
      </div>
      <div class="stat profit">
        <div class="st-num">{{ fmtKip(stats.profit) }}</div>
        <div class="st-label">{{ t('stProfit') }}</div>
      </div>
    </div>

    <div class="card mini-card">
      <h3>{{ t('statsTitle') }}</h3>
      <div class="mini-grid">
        <div class="mini">
          <div class="mini-num">{{ deep.new7 }}</div>
          <div class="mini-label">{{ t('stNew7') }}</div>
        </div>
        <div class="mini">
          <div class="mini-num">{{ deep.new30 }}</div>
          <div class="mini-label">{{ t('stNew30') }}</div>
        </div>
        <div class="mini">
          <div class="mini-num">{{ deep.avg ? fmtKip(deep.avg) : '—' }}</div>
          <div class="mini-label">{{ t('stAvg') }}</div>
        </div>
      </div>
    </div>

    <div class="range-row">
      <span class="range-label">{{ t('rangeTitle') }}</span>
      <div class="range-pills" id="range-pills">
        <button type="button" :class="['range-pill', { active: store.chartDays === '7' }]" @click="setDays('7')">{{ t('range7') }}</button>
        <button type="button" :class="['range-pill', { active: store.chartDays === '30' }]" @click="setDays('30')">{{ t('range30') }}</button>
        <button type="button" :class="['range-pill', { active: store.chartDays === '90' }]" @click="setDays('90')">{{ t('range90') }}</button>
        <button type="button" :class="['range-pill', { active: store.chartDays === 'custom' }]" @click="setDays('custom')">{{ t('rangeCustom') }}</button>
      </div>
      <div v-if="store.chartDays === 'custom'" class="range-custom">
        <input type="date" v-model="store.customStart" aria-label="จาก">
        <span>{{ t('rangeTo') }}</span>
        <input type="date" v-model="store.customEnd" :aria-label="t('rangeTo')">
        <button type="button" class="btn btn-green" @click="applyRange">{{ t('rangeApply') }}</button>
      </div>
    </div>

    <div class="charts-row">
      <div class="card chart-card">
        <div class="chart-head">
          <div class="chart-icon">💰</div>
          <div>
            <h3>{{ t('chartApproved') }}</h3>
            <div class="chart-sub">{{ chartTotal }}</div>
          </div>
        </div>
        <div v-if="series.length && series.some((d) => d.total > 0)" class="chart">
          <div v-for="(d, idx) in series" :key="idx" class="bar-col">
            <div class="bar-val">{{ d.total ? compactKip(d.total) : '' }}</div>
            <div class="bar gold" :style="{ height: Math.max(3, Math.round((d.total / chartMax) * 100)) + '%' }" :title="chartTip(d)"></div>
            <div class="bar-label">{{ showBarLabel(idx) ? d.label : '' }}</div>
          </div>
        </div>
        <div v-else class="chart"><div class="chart-empty">{{ t('chartEmpty') }}</div></div>
      </div>
    </div>

    <div class="card mini-card">
      <h3>{{ t('clearedTitle') }}</h3>
      <div v-if="cleared.length" class="cleared-list">
        <div v-for="d in cleared" :key="d.app.id" class="cleared-item">
          <div class="ci-avatar">✓</div>
          <div class="ci-main">
            <div class="ci-name">{{ d.app.first }} {{ d.app.last }}</div>
            <div class="ci-meta">🗓 {{ formatClearedDate(d.clearedAt) }}</div>
          </div>
          <div class="ci-nums">
            <div class="ci-profit">💰 {{ t('profitLabel', { profit: fmtKip(d.calc.paidInterest) }) }}</div>
            <div class="ci-repay">{{ t('repayLabel', { repay: fmtKip(d.calc.paidTotal) }) }}</div>
          </div>
        </div>
      </div>
      <div v-else class="cleared-empty">{{ t('clearedEmpty') }}</div>
    </div>

    <div class="controls">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="search" v-model="store.search" :placeholder="t('searchPh')">
      </div>
      <div class="toolbar-btns">
        <button type="button" class="btn btn-green" @click="openAdd">➕ {{ t('addBtn') }}</button>
        <button type="button" class="btn btn-ghost2" @click="doExport">📥 {{ t('exportBtn') }}</button>
      </div>
    </div>

    <div class="app-list">
      <template v-if="filtered.length">
        <CustomerCard v-for="a in filtered" :key="a.id" :app="a" />
      </template>
      <div v-else class="empty-note">{{ apps.length ? t('emptySearch') : t('emptyAll') }}</div>
    </div>
  </div>
</template>
