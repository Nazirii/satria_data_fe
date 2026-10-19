<script setup>
import { computed } from 'vue'
import { fmt } from '../composables/useData.js'
// Batang silhouette 0–0,75 dengan garis ambang gate 0,10.
const props = defineProps({ value: { type: Number, default: null }, threshold: { type: Number, default: 0.1 }, width: { type: Number, default: 56 }, estimated: Boolean })
const MAX = 0.75
const pct = computed(() => Math.max(0, Math.min(1, (props.value ?? 0) / MAX)) * 100)
const below = computed(() => typeof props.value === 'number' && props.value < props.threshold)
</script>

<template>
  <span v-if="typeof value === 'number'" class="sil" :title="`Silhouette ${fmt.dec(value)}${estimated ? ' (perkiraan dari grafik naskah)' : ''}`">
    <span class="track" :style="{ width: width + 'px' }">
      <span class="fill" :class="{ below }" :style="{ width: pct + '%' }" />
      <span class="tick" :style="{ left: (threshold / MAX) * 100 + '%' }" />
    </span>
    <span class="val mono" :class="{ below }">{{ estimated ? '≈' : '' }}{{ fmt.dec(value, 2) }}</span>
  </span>
  <span v-else class="val mono faint">—</span>
</template>

<style scoped>
.sil { display: inline-flex; align-items: center; gap: 7px; }
.track { position: relative; height: 6px; border-radius: 3px; background: var(--bg-muted); overflow: visible; }
.fill { position: absolute; inset: 0 auto 0 0; border-radius: 3px; background: var(--accent); }
.fill.below { background: var(--warn); }
.tick { position: absolute; top: -3px; width: 1.5px; height: 12px; background: var(--fg); opacity: .55; }
.val { font-size: 12px; font-weight: 600; color: var(--fg-2); }
.val.below { color: var(--warn); }
</style>
