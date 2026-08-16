/* ===== MoneyFast — ตรรกะล้วน (ย้ายจาก admin.html แบบคำต่อคำ) ===== */
import { t, langState } from './i18n.js';

export const WEEKLY_RATE = 0.20;          // ค่าเริ่มต้น (รายเก่าที่ไม่มี interestRate)
export const INTEREST_RATES = [10, 15, 20, 25, 30];   // อัตราดอกเบี้ย % ต่อสัปดาห์ที่เลือกได้
export const appRate = (app) => (Number((app && app.interestRate) || 20) || 20) / 100;
export const MIN_AMOUNT = 100000;
export const MAX_AMOUNT = 500000000;

export const DAY = 24 * 60 * 60 * 1000;
export const TZ = 'Asia/Bangkok';
export const TZ_OFF = 7 * 60 * 60 * 1000;

const locale = () => (langState.lang === 'lo' ? 'lo-LA' : 'th-TH');

export const fmtNum = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));
export const fmtKip = (n) => fmtNum(n) + ' ' + t('kip');
export const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ดอกเบี้ยทบรายสัปดาห์: ทุกสัปดาห์คิดอัตรา (ค่าเริ่มต้น 20%) จากยอดต้นที่ค้างอยู่ จนกว่าจะชำระครบ */
export function loanCalc(app, asOf) {
  asOf = asOf || Date.now();
  const original = Number(app.amount || 0);
  const start = Number(app.createdAt) || Number(app.statusChangedAt) || Date.now();
  const RATE = appRate(app);
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const all = (app.payments || []).filter((p) => Number(p.at || 0) <= asOf).sort((a, b) => a.at - b.at);

  let principal = original;
  let accrued = 0;
  let paidInterest = 0;
  let paidPrincipal = 0;
  let elapsedWeeks = 0;
  const payBreak = [];

  const accrueTo = (t) => {
    const target = Math.max(1, Math.floor((t - start) / WEEK) + 1);
    while (elapsedWeeks < target) {
      accrued += RATE * principal;
      elapsedWeeks++;
    }
  };

  const applyPay = (p) => {
    accrueTo(Number(p.at || 0));
    let amt = Number(p.amount || 0);
    let iPart = 0;
    let pPart = 0;
    if (p.type === 'all' || p.type === 'custom') {
      iPart = Math.min(accrued, amt);
      paidInterest += iPart;
      accrued -= iPart;
      amt -= iPart;
      pPart = Math.min(principal, amt);
      paidPrincipal += pPart;
      principal -= pPart;
    } else if (p.type === 'principal') {
      pPart = Math.min(principal, amt);
      paidPrincipal += pPart;
      principal -= pPart;
      if (pPart > 0) accrued = Math.max(0, accrued - pPart * RATE * elapsedWeeks);
    } else {
      iPart = Math.min(accrued, amt);
      paidInterest += iPart;
      accrued -= iPart;
    }
    payBreak.push({ at: Number(p.at || 0), total: Number(p.amount || 0), amount: iPart, principal: pPart });
  };

  for (const p of all) applyPay(p);
  accrueTo(asOf);

  return {
    principal: original,
    remPrincipal: principal,
    remInterest: accrued,
    paidInterest: paidInterest,
    paidPrincipal: paidPrincipal,
    paidTotal: paidInterest + paidPrincipal,
    remTotal: principal + accrued,
    done: principal <= 0 && accrued <= 0,
    payBreak: payBreak,
  };
}

export function toFbLink(app) {
  const v = String(app.fb || '').trim();
  if (v) {
    if (/^https?:\/\//i.test(v)) return v;
    return 'https://www.facebook.com/' + v.replace(/^@/, '');
  }
  const name = String((app.first || '') + ' ' + (app.last || '')).trim();
  if (name) return 'https://www.facebook.com/search/top?q=' + encodeURIComponent(name);
  return '';
}

export function toWaLink(phone) {
  const intl = (phone || '').replace(/\D/g, '');
  let wa;
  if (intl.startsWith('020') && intl.length === 11) wa = '856' + intl.slice(1);
  else if (intl.startsWith('0')) wa = '66' + intl.slice(1);
  else wa = intl;
  return 'https://wa.me/' + wa;
}

/* สถิติเชิงลึก */
export function compactKip(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 1) + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(Math.round(n));
}

export function ictDayStart(ts) { return Math.floor((ts + TZ_OFF) / DAY) * DAY - TZ_OFF; }

export function getRangeBounds(chartDays, customStart, customEnd) {
  if (chartDays === 'custom' && customStart && customEnd) {
    const s = new Date(customStart + 'T00:00:00+07:00').getTime();
    const e = new Date(customEnd + 'T00:00:00+07:00').getTime();
    if (isNaN(s) || isNaN(e) || e < s) return null;
    const endTs = e + DAY;
    return { startTs: s, endTs: endTs, days: Math.max(1, Math.round((endTs - s) / DAY)) };
  }
  const endTs = ictDayStart(Date.now()) + DAY;
  const days = Number(chartDays) || 7;
  return { startTs: endTs - days * DAY, endTs: endTs, days: days };
}

export function dateLabel(ts, withWeekday) {
  const d = new Date(ts);
  if (withWeekday) return d.toLocaleDateString(locale(), { timeZone: TZ, weekday: 'short', day: 'numeric' });
  return d.toLocaleDateString(locale(), { timeZone: TZ, day: 'numeric', month: 'short' });
}

export function buildSeries(list, pickDate, pickAmount, filterFn, bounds) {
  const series = [];
  if (bounds.days <= 31) {
    const withWeekday = bounds.days <= 14;
    for (let i = 0; i < bounds.days; i++) {
      const s = bounds.startTs + i * DAY;
      const e = s + DAY;
      let total = 0;
      let count = 0;
      list.forEach((a) => {
        if (filterFn && !filterFn(a)) return;
        const ts = pickDate(a);
        if (ts >= s && ts < e) { total += pickAmount(a); count++; }
      });
      series.push({ label: dateLabel(s, withWeekday), total: total, count: count });
    }
  } else {
    for (let s = bounds.startTs; s < bounds.endTs; s += 7 * DAY) {
      const e = Math.min(s + 7 * DAY, bounds.endTs);
      let total = 0;
      let count = 0;
      list.forEach((a) => {
        if (filterFn && !filterFn(a)) return;
        const ts = pickDate(a);
        if (ts >= s && ts < e) { total += pickAmount(a); count++; }
      });
      series.push({ label: dateLabel(s, false), total: total, count: count });
    }
  }
  return series;
}

export function toDateInput(d) {
  const dd = new Date(d.getTime() + TZ_OFF);
  const y = dd.getFullYear();
  const m = String(dd.getMonth() + 1).padStart(2, '0');
  const day = String(dd.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/* แปลง epoch → ค่า input datetime-local (ตามเวลา Asia/Bangkok) */
export function toDateTimeInput(ts) {
  const d = new Date((Number(ts) || Date.now()) + TZ_OFF);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/* แปลงค่า input datetime-local (เวลา Asia/Bangkok) → epoch ms */
export function fromDateTimeInput(str) {
  if (!str) return null;
  const ms = Date.parse(String(str).replace(' ', 'T') + '+07:00');
  return isNaN(ms) ? null : ms;
}

export function quoteCsv(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

export function weekStart(ts) {
  const d = new Date(ts + TZ_OFF);
  const day = (d.getDay() + 6) % 7; // วันจันทร์ = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - TZ_OFF;
}

export function buildCsv(list) {
  const lines = [];
  const now = new Date();
  const totalAmount = list.reduce((s, a) => s + Number(a.amount || 0), 0);
  const new30 = list.filter((a) => Date.now() - a.createdAt <= 30 * DAY).length;

  lines.push(quoteCsv(t('expReportTitle') + ' — ' + t('brandName') + t('brandTag')));
  lines.push(quoteCsv(t('expGenerated')) + ',' + quoteCsv(now.toLocaleString(locale(), { timeZone: TZ })));
  lines.push('');

  lines.push([
    quoteCsv(t('stAll')), quoteCsv(t('stSum')), quoteCsv(t('stNew30')),
  ].join(','));
  lines.push([
    quoteCsv(list.length), quoteCsv(fmtNum(totalAmount)), quoteCsv(new30),
  ].join(','));
  lines.push('');

  lines.push([
    quoteCsv(t('expWeek')), quoteCsv(t('expReq')), quoteCsv(t('expReqAmt')),
    quoteCsv(t('expCust')),
  ].join(','));

  if (!list.length) {
    lines.push(quoteCsv(t('chartEmpty')));
    return lines.join('\n');
  }

  const weeks = new Map();
  list.forEach((a) => {
    const ws = weekStart(a.createdAt);
    if (!weeks.has(ws)) weeks.set(ws, { req: 0, reqAmt: 0, cust: new Set() });
    const w = weeks.get(ws);
    w.req += 1;
    w.reqAmt += Number(a.amount || 0);
    w.cust.add(a.phone);
  });

  [...weeks.entries()].sort((a, b) => b[0] - a[0]).forEach(([ws, w]) => {
    lines.push([
      quoteCsv(new Date(ws).toLocaleDateString('en-CA', { timeZone: TZ })),
      quoteCsv(w.req), quoteCsv(fmtNum(w.reqAmt)),
      quoteCsv(w.cust.size),
    ].join(','));
  });

  return lines.join('\n');
}

export function getAppImages(a) {
  if (Array.isArray(a.houseImages)) {
    return a.houseImages.map((h) => (typeof h === 'string' ? h : (h && h.dataUrl))).filter(Boolean);
  }
  if (a.houseImage) return [a.houseImage];
  return [];
}

export function fileToResizedDataUrl(file, maxDim) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatDateTime(ts) {
  return new Date(ts).toLocaleString(locale(), {
    timeZone: TZ,
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(ts) {
  return new Date(ts).toLocaleString(locale(), {
    timeZone: TZ,
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatShortDateTime(ts) {
  return new Date(ts).toLocaleString(locale(), {
    timeZone: TZ,
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
