/* ===== MoneyFast backend API (Cloudflare Pages Functions — /api/*) ===== */
export const API_BASE = '/api';

const AUTH_KEY = 'moneyfast_admin_auth';
const FAIL_KEY = 'moneyfast_fail_count';
const LOCK_KEY = 'moneyfast_lock_until';

export const MAX_FAILS = 5;
export const LOCK_MS = 5 * 60 * 1000;

export function getToken() { try { return localStorage.getItem(AUTH_KEY) || ''; } catch (e) { return ''; } }
export function isAuthed() { try { return !!localStorage.getItem(AUTH_KEY); } catch (e) { return false; } }
export function setToken(tok) { try { localStorage.setItem(AUTH_KEY, tok); } catch (e) { /* ignore */ } }
export function clearToken() { try { localStorage.removeItem(AUTH_KEY); } catch (e) { /* ignore */ } }

export function getFailCount() { try { return Number(localStorage.getItem(FAIL_KEY)) || 0; } catch (e) { return 0; } }
export function addFail() { try { localStorage.setItem(FAIL_KEY, String(getFailCount() + 1)); } catch (e) { /* ignore */ } }
export function resetFails() { try { localStorage.removeItem(FAIL_KEY); } catch (e) { /* ignore */ } }
export function getLockUntil() { try { const v = localStorage.getItem(LOCK_KEY); return v ? Number(v) : 0; } catch (e) { return 0; } }
export function isLocked() { return getLockUntil() > Date.now(); }
export function setLock() { try { localStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_MS)); } catch (e) { /* ignore */ } }
export function clearLock() { try { localStorage.removeItem(LOCK_KEY); } catch (e) { /* ignore */ } }

/* fetch พร้อม timeout — กันแอปค้างจอขาวเมื่อเน็ตช้า/ค้าง (AbortController) */
export const FETCH_TIMEOUT_MS = 8000;
export async function fetchT(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiLogin(username, password) {
  const res = await fetchT(API_BASE + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username, password: password }),
  });
  return res.json();
}

export async function apiMe() {
  const res = await fetchT(API_BASE + '/me', { headers: { 'Authorization': 'Bearer ' + getToken() } });
  if (!res.ok) {
    const err = new Error('unauth');
    err.unauth = true;
    throw err;
  }
  return res.json();
}

export async function apiPassword(current, next) {
  const res = await fetchT(API_BASE + '/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: JSON.stringify({ current: current, next: next }),
  });
  return res.json();
}
