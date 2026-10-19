<script setup>
import { ref, watch } from 'vue'
import Icon from './Icon.vue'
const props = defineProps({
  src: { type: String, default: null },
  label: { type: String, default: '' },
  color: { type: String, default: '#8d938e' },
  fit: { type: String, default: 'cover' },
  iconSize: { type: Number, default: 20 },
})
const broken = ref(false)
watch(() => props.src, () => { broken.value = false })
</script>

<template>
  <div class="tile" :style="{ '--fam': color }">
    <img
      v-if="src && !broken" :src="src" :alt="label" loading="lazy" decoding="async"
      :style="{ objectFit: fit }" @error="broken = true"
    />
    <div v-else class="ph" :title="label ? `${label}: foto belum diekspor` : 'Foto belum diekspor'">
      <Icon name="box" :size="iconSize" :stroke="1.5" />
      <span v-if="label" class="ph-id mono">{{ label }}</span>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.tile { position: relative; overflow: hidden; background: var(--bg-sunken); aspect-ratio: var(--ar, 1 / 1); max-width: 100%; }
img { position: absolute; inset: 0; width: 100%; height: 100%; background: var(--photo-bg); }
.ph {
  position: absolute; inset: 0; display: grid; place-items: center;
  background: color-mix(in srgb, var(--fam) 7%, var(--bg-sunken));
  color: color-mix(in srgb, var(--fam) 45%, var(--fg-3));
}
.ph-id {
  position: absolute; left: 6px; bottom: 5px;
  font-size: 9.5px; letter-spacing: .02em; color: var(--fg-3);
}
</style>
