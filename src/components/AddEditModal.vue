<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { store } from '../store';
import { t } from '../i18n';
import { MIN_AMOUNT, MAX_AMOUNT, fmtKip, fileToResizedDataUrl } from '../logic';
import { getApps, saveApps, showToast } from '../apps';

const MAX_IMAGES = 10;

const form = reactive({ first: '', last: '', phone: '', fb: '', amount: '' });
const images = ref([]);          // [{ name, dataUrl }]
const errors = reactive({ first: '', last: '', phone: '', amount: '', house: '' });
const submitting = ref(false);

const isEdit = computed(() => !!store.editingId);
const title = computed(() => t(isEdit.value ? 'addTitleEdit' : 'addTitle'));
const saveLabel = computed(() => t(isEdit.value ? 'addSaveEdit' : 'addSave'));

const open = computed(() => store.modals.add);

watch(open, (val) => {
  if (val) initForm();
});

function initForm() {
  const app = store.editingId ? store.apps.find((a) => a.id === store.editingId) : null;
  if (app) {
    form.first = app.first || '';
    form.last = app.last || '';
    form.phone = app.phone || '';
    form.fb = app.fb || '';
    form.amount = app.amount || '';
    images.value = (Array.isArray(app.houseImages) ? app.houseImages : [])
      .map((h) => ({ name: (h && h.name) || '', dataUrl: (h && (h.dataUrl || h)) || '' }))
      .filter((h) => h.dataUrl);
    if (!images.value.length && app.houseImage) {
      images.value = [{ name: app.houseFileName || '', dataUrl: app.houseImage }];
    }
  } else {
    form.first = '';
    form.last = '';
    form.phone = '';
    form.fb = '';
    form.amount = '';
    images.value = [];
  }
  Object.keys(errors).forEach((k) => { errors[k] = ''; });
}

function close() { store.modals.add = false; store.editingId = null; }

const showSummary = computed(() => {
  const amount = Number(form.amount) || 0;
  return amount >= MIN_AMOUNT;
});

async function onFiles(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  if (!files.length) return;
  if (images.value.length + files.length > MAX_IMAGES) {
    errors.house = t('errImgMax');
    return;
  }
  for (const file of files) {
    if (!file.type.startsWith('image/')) { errors.house = t('errImgType'); return; }
    if (file.size > 5 * 1024 * 1024) { errors.house = t('errImgSize'); return; }
  }
  try {
    for (const file of files) {
      const dataUrl = await fileToResizedDataUrl(file, 900);
      images.value.push({ name: file.name, dataUrl: dataUrl });
    }
    errors.house = '';
  } catch (err) {
    errors.house = t('errImgType');
  }
}

function removeImage(i) { images.value.splice(i, 1); }

function validate() {
  let ok = true;
  if (form.first.trim().length < 2) { errors.first = t('errFirst'); ok = false; } else errors.first = '';
  if (form.last.trim().length < 2) { errors.last = t('errLast'); ok = false; } else errors.last = '';
  const phone = form.phone.replace(/\D/g, '');
  if (!/^0\d{8,10}$/.test(phone)) { errors.phone = t('errPhone'); ok = false; } else errors.phone = '';
  const amount = Number(form.amount);
  if (!amount || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    errors.amount = t('errAmount', { min: fmtKip(MIN_AMOUNT), max: fmtKip(MAX_AMOUNT) });
    ok = false;
  } else errors.amount = '';
  return ok;
}

function onSubmit() {
  if (!validate()) return;
  store.pendingSave = doSave;
  store.pendingSaveInfo = { name: (form.first.trim() + ' ' + form.last.trim()), amount: Number(form.amount) || 0 };
  store.modals.save = true;
}

function doSave() {
  const wasEdit = isEdit.value;
  submitting.value = true;

  const houseImages = images.value.map((img) => ({ name: img.name, dataUrl: img.dataUrl }));
  const first = form.first.trim();
  const last = form.last.trim();
  const phone = form.phone.replace(/\D/g, '');
  const amount = Number(form.amount);
  const list = getApps();

  const saveWithQuotaFallback = (target) => {
    try {
      saveApps(list);
    } catch (err) {
      const stripped = Object.assign({}, target);
      delete stripped.houseImages;
      delete stripped.houseImage;
      if (wasEdit) {
        const idx = list.findIndex((a) => a.id === store.editingId);
        if (idx >= 0) list[idx] = stripped;
      } else {
        list[0] = stripped;
      }
      try { saveApps(list); } catch (err2) {
        submitting.value = false;
        showToast(t('errSave'), true);
        return false;
      }
    }
    return true;
  };

  if (wasEdit) {
    const idx = list.findIndex((a) => a.id === store.editingId);
    if (idx >= 0) {
      const old = list[idx];
      list[idx] = Object.assign({}, old, {
        first: first,
        last: last,
        phone: phone,
        fb: form.fb.trim(),
        houseFileName: houseImages.length ? houseImages.map((h) => h.name).join(', ') : '',
        houseImages: houseImages,
        amount: amount,
      });
      if (!saveWithQuotaFallback(list[idx])) return;
    }
  } else {
    const app = {
      id: Date.now().toString(36),
      first: first,
      last: last,
      phone: phone,
      fb: form.fb.trim(),
      houseFileName: houseImages.length ? houseImages.map((h) => h.name).join(', ') : '',
      houseImages: houseImages,
      amount: amount,
      createdAt: Date.now(),
    };
    list.unshift(app);
    if (!saveWithQuotaFallback(app)) return;
  }

  submitting.value = false;
  store.modals.save = false;
  close();
  showToast(t(wasEdit ? 'addSavedEdit' : 'addSaved'));
}
</script>

<template>
  <div v-if="open" class="modal" @click.self="close">
    <div class="modal-box">
      <div class="modal-head">
        <h3>{{ title }}</h3>
        <button type="button" class="modal-close" aria-label="ปิด" @click="close">✕</button>
      </div>
      <form id="add-form" novalidate @submit.prevent="onSubmit">
        <div class="add-grid">
          <div class="field" :class="{ invalid: !!errors.first }">
            <label for="a-first" v-html="t('lblFirst')"></label>
            <input type="text" id="a-first" v-model="form.first" autocomplete="off">
            <small class="error-msg">{{ errors.first }}</small>
          </div>
          <div class="field" :class="{ invalid: !!errors.last }">
            <label for="a-last" v-html="t('lblLast')"></label>
            <input type="text" id="a-last" v-model="form.last" autocomplete="off">
            <small class="error-msg">{{ errors.last }}</small>
          </div>
        </div>

        <div class="field" :class="{ invalid: !!errors.phone }">
          <label for="a-phone" v-html="t('lblPhone')"></label>
          <input type="tel" id="a-phone" v-model="form.phone" inputmode="numeric" autocomplete="off" placeholder="0812345678 / 02012345678">
          <small class="error-msg">{{ errors.phone }}</small>
        </div>

        <div class="field">
          <label for="a-fb">{{ t('lblFb') }}</label>
          <input type="text" id="a-fb" v-model="form.fb" autocomplete="off" :placeholder="t('fbPh')">
        </div>

        <div class="field" :class="{ invalid: !!errors.house }">
          <label v-html="t('lblHouse')"></label>
          <label class="upload-box" :for="`a-house`">
            <input type="file" id="a-house" accept="image/*" multiple hidden @change="onFiles">
            <span class="upload-icon">📷</span>
            <span class="upload-text" v-html="t('addUploadText')"></span>
          </label>
          <div v-if="images.length" class="upload-preview">
            <div v-for="(img, i) in images" :key="i" class="up-item">
              <img :src="img.dataUrl" alt="">
              <button type="button" class="up-remove" aria-label="ลบรูป" @click="removeImage(i)">✕</button>
            </div>
          </div>
          <small class="upload-count">{{ images.length ? t('imgCount', { n: images.length }) : '' }}</small>
          <small class="error-msg">{{ errors.house }}</small>
        </div>

        <div class="field" :class="{ invalid: !!errors.amount }">
          <label for="a-amount" v-html="t('lblAmount')"></label>
          <input type="number" id="a-amount" v-model="form.amount" min="100000" max="500000000" step="100000" inputmode="numeric" placeholder="2000000">
          <small class="error-msg">{{ errors.amount }}</small>
        </div>

        <div v-if="showSummary" class="form-summary show" v-html="t('formSummaryHtml', { principal: fmtKip(Number(form.amount)) })"></div>

        <div class="add-actions">
          <button type="button" class="btn btn-ghost2" @click="close">{{ t('addCancel') }}</button>
          <button type="submit" class="btn btn-green" :disabled="submitting">{{ submitting ? t('uploading') : saveLabel }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
