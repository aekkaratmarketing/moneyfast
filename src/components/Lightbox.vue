<script setup>
import { store } from '../store';

function close() { store.lightbox = null; }
</script>

<template>
  <div v-if="store.lightbox" class="lightbox" @click.self="close">
    <button type="button" class="lb-close" aria-label="ปิด" @click="close">✕</button>
    <img :src="store.lightbox" alt="">
  </div>
</template>
