<script setup>
// Tanda pixel 4×4 (aksen IFEST, dipakai seperlunya).
const cells = [
  0, 0, 1, 1,
  0, 1, 1, 2,
  1, 2, 1, 0,
  2, 0, 0, 0,
]
defineProps({ size: { type: Number, default: 26 } })
</script>

<template>
  <span class="mark" :style="{ width: size + 'px', height: size + 'px' }" aria-hidden="true">
    <i v-for="(c, i) in cells" :key="i" :class="`c${c}`" />
  </span>
</template>

<style scoped>
.mark { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); flex: none; }
i { display: block; }
.c0 { background: transparent; }
.c1 { background: var(--accent); }
.c2 { background: var(--accent-strong); }
</style>
