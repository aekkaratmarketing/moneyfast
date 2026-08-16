/* ===== ข้อมูลลูกค้า: เซิร์ฟเวอร์ (ซิงค์ข้ามเครื่อง) + สำรอง localStorage ตอน offline ===== */
import { store } from './store.js';
import { API_BASE, getToken } from './api.js';
import { t } from './i18n.js';
import { buildCsv } from './logic.js';

const STORE_KEY = 'moneyfast_applications';

export function showToast(msg, isError) {
  store.toast = msg;
  store.toastErr = !!isError;
  clearTimeout(store.toastTimer);
  store.toastTimer = setTimeout(() => { store.toast = null; }, 2600);
}

export function setSyncStatus(online) {
  store.syncShown = true;
  store.apiOk = online;
}

export function getApps() {
  if (store.apiOk && store.memApps) return store.memApps;
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
}

export function saveApps(list) {
  store.apps = list;
  if (store.apiOk && store.memApps) {
    store.memApps = list;
    fetch(API_BASE + '/apps', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(list),
    })
      .then((res) => { if (!res.ok) throw new Error('api'); return res.json(); })
      .then((serverList) => { store.memApps = Array.isArray(serverList) ? serverList : list; })
      .catch(() => {
        // ตัดการเชื่อมต่อ → สลับเป็นโหมดเครื่องเดียว
        store.apiOk = false;
        store.memApps = null;
        try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
        setSyncStatus(false);
        showToast('⚠️ ' + t('offlineMode'));
      });
  } else {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }
}

export async function hydrateApps() {
  try {
    const res = await fetch(API_BASE + '/apps', { headers: { 'Authorization': 'Bearer ' + getToken() } });
    if (!res.ok) throw new Error('api');
    const serverList = await res.json();
    store.memApps = Array.isArray(serverList) ? serverList : [];
    store.apps = store.memApps;
    store.apiOk = true;
    if (!store.memApps.length) {
      // ครั้งแรก: ถ้ามีข้อมูล local เก่า ให้นำขึ้นเซิร์ฟเวอร์
      try {
        const local = JSON.parse(localStorage.getItem(STORE_KEY)) || [];
        if (local.length) { store.memApps = local; store.apps = local; saveApps(local); }
      } catch (e) { /* ignore */ }
    }
    setSyncStatus(true);
  } catch (e) {
    store.apiOk = false;
    store.memApps = null;
    setSyncStatus(false);
    try { store.apps = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e2) { store.apps = []; }
  }
}

export function exportCsv(list) {
  const csv = buildCsv(list);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'moneyfast-report-' + new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
