<script setup>
import { computed } from 'vue'
import Icon from '../components/Icon.vue'
import { useData } from '../composables/useData.js'

const { summary } = useData()
const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
const total = computed(() => summary.value.clusters.length)
</script>

<template>
  <div class="page">
    <div class="pixels" aria-hidden="true"><i v-for="n in 12" :key="n" :class="`p${n}`" /></div>

    <header class="hero">
      <p class="eyebrow">Meja pilah 2 · {{ today }}</p>
      <h1 class="title">Pilih mode kerja</h1>
    </header>

    <nav class="modes" aria-label="Mode kerja">
      <RouterLink to="/live" class="mode primary">
        <div class="preview live" aria-hidden="true">
          <div class="belt" />
          <div class="zone" />
          <div class="obj o1" />
          <div class="obj o2" />
        </div>
        <div class="mode-body">
          <h2 class="mode-title">Live kamera</h2>
          <p class="muted">Barang dipilah otomatis saat lewat kamera.</p>
        </div>
        <span class="go" aria-hidden="true"><Icon name="arrowRight" :size="22" /></span>
      </RouterLink>

      <RouterLink to="/foto" class="mode">
        <div class="preview drop" aria-hidden="true">
          <span class="up"><Icon name="camera" :size="24" /></span>
        </div>
        <div class="mode-body">
          <h2 class="mode-title">Foto barang</h2>
          <p class="muted">Untuk barang yang terlewat atau ingin dicek ulang.</p>
        </div>
        <span class="go" aria-hidden="true"><Icon name="arrowRight" :size="22" /></span>
      </RouterLink>
    </nav>

    <RouterLink to="/klaster" class="footer-link">
      Sistem mengenal {{ total }} jenis barang
      <span class="accent">Lihat klaster <Icon name="arrowRight" :size="16" /></span>
    </RouterLink>
  </div>
</template>

<style scoped>
.page { position: relative; display: flex; flex-direction: column; gap: 28px; max-width: 1040px; padding-top: 24px; }
.page::before {
  content: ''; position: absolute; inset: -28px -32px auto; height: 360px; z-index: -1;
  background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: linear-gradient(to bottom, #000 40%, transparent);
}
.pixels {
  position: absolute; top: -28px; right: -32px; width: 144px; height: 96px;
  display: grid; grid-template-columns: repeat(6, 24px); grid-template-rows: repeat(4, 24px); direction: rtl;
}
.pixels i { display: block; }
.p1, .p3, .p5, .p7, .p9, .p10 { background: var(--accent); }
.p2, .p4, .p6, .p8, .p12 { background: var(--accent-strong); }
.p10 { grid-row: 3; grid-column: 1; }
.p11 { grid-row: 3; grid-column: 2; background: var(--accent-strong); opacity: .6; }
.p12 { grid-row: 4; grid-column: 1; }

.hero { display: grid; gap: 8px; }
.title { font-size: clamp(34px, 5vw, 52px); font-weight: 700; line-height: 1.02; letter-spacing: -0.05em; }

.modes { display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px; }
.mode {
  position: relative; display: flex; flex-direction: column;
  border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--bg); overflow: hidden;
  transition: border-color .15s, box-shadow .15s;
}
.mode:hover { border-color: var(--line-strong); box-shadow: var(--shadow); }
.mode.primary { border-color: var(--accent); }
.preview { position: relative; height: 200px; margin: 14px 14px 0; border-radius: var(--r-md); overflow: hidden; }
.live { background: var(--video); }
.belt { position: absolute; inset: 52px 0; background: repeating-linear-gradient(90deg, var(--video-line) 0 1px, transparent 1px 40px); border-block: 1px solid var(--video-line); }
.zone { position: absolute; top: 52px; bottom: 52px; left: 46%; width: 18%; border: 1px dashed color-mix(in srgb, var(--accent) 70%, transparent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
.obj { position: absolute; border-radius: 6px; background: var(--video-obj); }
.o1 { left: 49%; top: 72px; width: 58px; height: 52px; outline: 2px solid var(--video-fg); outline-offset: 5px; background: var(--bg); box-shadow: 0 1px 3px rgba(11, 13, 12, .18); }
.o2 { left: 16%; top: 78px; width: 46px; height: 40px; background: var(--bg); box-shadow: 0 1px 3px rgba(11, 13, 12, .18); }
.drop { background: var(--bg-sunken); display: grid; place-items: center; }
.up { width: 60px; height: 60px; border-radius: 14px; display: grid; place-items: center; background: var(--bg); border: 1px solid var(--line); color: var(--fg); }
.mode-body { display: grid; gap: 4px; padding: 18px 68px 20px 20px; }
.mode-title { font-size: 24px; font-weight: 700; letter-spacing: -0.035em; }
.go {
  position: absolute; right: 18px; bottom: 22px; width: 40px; height: 40px; border-radius: 999px;
  display: grid; place-items: center; background: var(--bg-sunken); color: var(--fg);
}
.primary .go { background: var(--accent); color: var(--on-accent); }

.footer-link { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 16px 0; border-top: 1px solid var(--line); color: var(--fg-2); font-size: 15px; }
.footer-link .accent { display: inline-flex; align-items: center; gap: 6px; color: var(--accent-strong); font-weight: 600; }

@media (max-width: 860px) {
  .modes { grid-template-columns: 1fr; }
  .preview { height: 150px; }
  .page::before { inset: -20px -16px auto; }
  .pixels { top: -20px; right: -16px; transform: scale(.7); transform-origin: top right; }
}
</style>
