<script setup>
import { computed } from 'vue'
import { useData } from '../composables/useData.js'
const props = defineProps({ bin: { type: String, required: true }, short: Boolean, size: { type: Number, default: 10 } })
const { bins } = useData()
const b = computed(() => bins.value[props.bin] || { name: props.bin, short: props.bin, color: '#8d938e' })
</script>

<template>
  <span class="bin">
    <span class="sw" :style="{ background: b.color, width: size + 'px', height: size + 'px' }" aria-hidden="true" />
    <span :class="{ mono: short }">{{ short ? b.short : b.name }}</span>
  </span>
</template>

<style scoped>
.bin { display: inline-flex; align-items: center; gap: 7px; min-width: 0; }
.sw { border-radius: 3px; flex: none; }
.mono { font-size: 11px; font-weight: 600; letter-spacing: .06em; color: var(--fg-2); }
</style>
