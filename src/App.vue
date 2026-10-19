<script setup>
import AppNav from './components/AppNav.vue'
import { useData } from './composables/useData.js'
const { summary, error } = useData()
</script>

<template>
  <div class="shell">
    <AppNav />
    <main class="main">
      <div v-if="error" class="state">
        <p class="h2">Data klaster tidak terbaca</p>
        <p class="muted">{{ error }}. Pastikan file <span class="mono">public/data/clusters.json</span> ada, lalu muat ulang.</p>
      </div>
      <div v-else-if="!summary" class="state"><p class="muted">Memuat data klaster…</p></div>
      <RouterView v-else />
    </main>
  </div>
</template>

<style scoped>
.shell { display: flex; min-height: 100vh; min-height: 100dvh; }
.main {
  flex: 1; min-width: 0;
  padding-block: 28px 48px;
  padding-left: max(32px, env(safe-area-inset-left, 0px));
  padding-right: max(32px, env(safe-area-inset-right, 0px));
}
.state { display: grid; gap: 8px; padding-top: 12vh; max-width: 520px; }
@media (max-width: 860px) {
  .main {
    padding-block: 20px calc(96px + env(safe-area-inset-bottom, 0px));
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
}
</style>
