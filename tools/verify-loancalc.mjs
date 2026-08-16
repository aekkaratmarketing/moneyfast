/* ตรวจว่า loanCalc ใหม่ (Vue) ให้ผลเหมือนเดิม (admin.html) ทุกกรณี */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = {};

const WEEK = 7 * 24 * 60 * 60 * 1000;
const RATE = 0.2;

/* loanCalc เดิม — คัดลอกจาก admin.html แบบคำต่อคำ */
function oldCalc(app, asOf) {
  asOf = asOf || Date.now();
  const original = Number(app.amount || 0);
  const start = Number(app.createdAt) || Number(app.statusChangedAt) || Date.now();
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

const { loanCalc: newCalc } = await import('../src/logic.js');

const t0 = 1720000000000;
const cases = [
  { name: 'กู้ 1,000,000 ยังไม่จ่าย ผ่าน 2 สัปดาห์', app: { amount: 1000000, createdAt: t0 }, asOf: t0 + 2 * WEEK },
  { name: 'จ่ายดอก 1 งวด', app: { amount: 1000000, createdAt: t0, payments: [{ amount: 200000, type: 'interest', at: t0 + WEEK }] }, asOf: t0 + 2 * WEEK },
  { name: 'จ่ายแบบระบุจำนวน (ดอก+ต้น)', app: { amount: 1000000, createdAt: t0, payments: [{ amount: 500000, type: 'custom', at: t0 + WEEK }] }, asOf: t0 + 3 * WEEK },
  { name: 'จ่ายทั้งหมด', app: { amount: 500000, createdAt: t0, payments: [{ amount: 500000, type: 'all', at: t0 + WEEK }] }, asOf: t0 + 4 * WEEK },
  { name: 'จ่ายต้นก่อนครบสัปดาห์', app: { amount: 1000000, createdAt: t0, payments: [{ amount: 400000, type: 'principal', at: t0 + 2 * 86400000 }] }, asOf: t0 + 3 * WEEK },
  { name: 'หลายงวด', app: { amount: 2000000, createdAt: t0, payments: [
    { amount: 400000, type: 'custom', at: t0 + WEEK },
    { amount: 300000, type: 'interest', at: t0 + 2 * WEEK },
  ] }, asOf: t0 + 5 * WEEK },
];

let fail = 0;
for (const c of cases) {
  const o = oldCalc(c.app, c.asOf);
  const n = newCalc(c.app, c.asOf);
  const keys = ['remPrincipal', 'remInterest', 'paidInterest', 'paidPrincipal', 'paidTotal', 'remTotal', 'done'];
  const diffs = keys.filter((k) => Math.abs((o[k] || 0) - (n[k] || 0)) > 0.0001 || String(o[k]) !== String(n[k]));
  if (diffs.length) {
    console.log('❌', c.name, '-> ต่างที่:', diffs, JSON.stringify({ o, n }));
    fail++;
  } else {
    console.log('✅', c.name);
  }
}
process.exit(fail ? 1 : 0);
