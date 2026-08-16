<script setup>
import { computed } from 'vue';
import { store } from '../store';

const visible = computed(() => !!store.toast);
</script>

<template>
  <div class="toast" :class="{ show: visible, err: store.toastErr }">{{ store.toast }}</div>
</template>
