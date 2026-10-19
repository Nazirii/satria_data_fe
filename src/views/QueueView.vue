<script setup>
import { computed } from 'vue'
import ClusterCard from '../components/ClusterCard.vue'
import PhotoTile from '../components/PhotoTile.vue'
import Icon from '../components/Icon.vue'
import { useData, fmt } from '../composables/useData.js'

const { summary } = useData()
const s = computed(() => summary.value)
const review = computed(() => s.value.clusters.filter((c) => c.status === 'tinjau'))
</script>

<template>
  <div class="page">
    <header class="titles">
      <p class="eyebrow is-accent">Untuk supervisor</p>
      <h1 class="h1">Antrean tinjauan</h1>
      <p class="muted">Semua yang sengaja tidak diputuskan sistem berakhir di sini: kategori yang gagal uji, klaster baru, dan foto yang belum terkelompok.</p>
    </header>

    <section class="sec">
      <div class="sec-h">
        <h2 class="h2">Gagal uji kualitas</h2>
        <span class="mono faint">{{ review.length }} KLASTER · {{ fmt.int(s.meta.coverage.review) }} FOTO</span>
      </div>
      <p class="muted small">Terbentuk sebagai kelompok, tetapi gagal satu syarat kualitas. Belum dipakai untuk pemilahan otomatis.</p>
      <div class="grid"><ClusterCard v-for="c in review" :key="c.id" :cluster="c" /></div>
    </section>

    <section class="sec">
      <div class="sec-h">
        <h2 class="h2">Klaster baru</h2>
        <span class="mono faint">{{ s.born.length }} KLASTER · UJI LEAVE-CLUSTER-OUT</span>
      </div>
      <p class="muted small">
        Kelompok yang terbentuk dari foto belum dikenali dan lolos syarat (support ≥ 8, compactness ≥ 0,70, novelty ≥ 0,35, muncul di ≥ 2 batch).
        Di lapangan, supervisor menamai dan memilih wadah sebelum kategori aktif.
      </p>
      <div class="grid"><ClusterCard v-for="c in s.born" :key="c.id" :cluster="c" /></div>
    </section>

    <section class="sec">
      <div class="sec-h">
        <h2 class="h2">Belum terkelompok</h2>
        <span class="mono faint">{{ fmt.int(s.noise.size) }} FOTO</span>
      </div>
      <RouterLink to="/klaster/noise" class="noise">
        <div class="nstrip">
          <div v-for="(sm, i) in s.noise.samples" :key="i" class="ncell">
            <PhotoTile :src="sm.src" />
            <span class="nr">{{ sm.reason }}</span>
          </div>
        </div>
        <span class="go">Buka galeri <Icon name="arrowRight" :size="16" /></span>
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 30px; max-width: 1240px; }
.titles { display: grid; gap: 6px; max-width: 700px; }
.sec { display: grid; gap: 10px; }
.sec-h { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.sec-h .mono { font-size: 11.5px; letter-spacing: .06em; }
.small { font-size: 14px; max-width: 760px; }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); margin-top: 4px; }
.noise { display: grid; gap: 12px; padding: 14px; border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--bg); }
.noise:hover { border-color: var(--line-strong); box-shadow: var(--shadow); }
.nstrip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.ncell { display: grid; gap: 6px; }
.ncell :deep(.tile) { border-radius: var(--r-md); --ar: 4 / 3; }
.nr { font-size: 12.5px; color: var(--fg-2); }
.go { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: var(--accent-strong); font-size: 14px; }
@media (max-width: 640px) { .nstrip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
