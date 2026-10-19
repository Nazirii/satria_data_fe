<script setup>
import { computed } from 'vue'
import { STATUS, HAZARD } from '../composables/useData.js'
const props = defineProps({
  status: { type: String, default: '' },
  hazard: { type: String, default: '' },
  label: { type: String, default: '' },
  size: { type: String, default: 'md' },
})
const def = computed(() => (props.hazard ? HAZARD[props.hazard] : STATUS[props.status]) || { label: props.status, tone: 'idle' })
</script>

<template>
  <span class="pill" :class="[`tone-${def.tone}`, `size-${size}`]">
    <span class="sq" aria-hidden="true" />{{ label || def.label }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex; align-items: center; gap: 6px;
  height: 24px; padding: 0 9px 0 8px; border-radius: var(--r-sm);
  font-size: 12.5px; font-weight: 600; white-space: nowrap; letter-spacing: -0.005em;
}
.size-sm { height: 20px; padding: 0 7px 0 6px; font-size: 11.5px; gap: 5px; }
.sq { width: 7px; height: 7px; border-radius: 2px; background: currentColor; flex: none; }
.tone-ok { background: var(--ok-soft); color: var(--ok); }
.tone-warn { background: var(--warn-soft); color: var(--warn); }
.tone-idle { background: var(--idle-soft); color: var(--idle); }
.tone-new { background: var(--new-soft); color: var(--new); }
.tone-danger { background: var(--danger-soft); color: var(--danger); }
</style>
