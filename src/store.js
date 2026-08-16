/* ===== Global reactive store ===== */
import { reactive } from 'vue';

export const store = reactive({
  loading: true,        // กำลังตรวจ token กับเซิร์ฟเวอร์
  authed: false,
  apiOk: false,         // ต่อเซิร์ฟเวอร์อยู่ไหม
  memApps: null,        // ข้อมูลในหน่วยความจำ (โหมดเซิร์ฟเวอร์)
  apps: [],
  syncShown: false,     // เคยตั้งสถานะ sync แล้วหรือยัง
  search: '',
  chartDays: '7',
  customStart: '',
  customEnd: '',
  dark: false,
  lightbox: null,
  toast: null,
  toastErr: false,
  toastTimer: null,
  modals: {
    add: false,
    pay: null,     // id ของลูกค้าที่จะรับชำระ
    del: null,     // id ของลูกค้าที่จะลบ
    save: false,
    pass: false,
    loginOk: false,
  },
  editingId: null,
  pendingSave: null,
  pendingSaveInfo: null,
});
