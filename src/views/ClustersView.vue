<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ClusterCard from '../components/ClusterCard.vue'
import Icon from '../components/Icon.vue'
import { useData, fmt } from '../composables/useData.js'

const route = useRoute()
const router = useRouter()
const { summary } = useData()
const s = computed(() => summary.value)

const FILTERS = [
  { id: 'semua', label: 'Semua' },
  { id: 'tinjau', label: 'Perlu ditinjau' },
  { id: 'baru', label: 'Klaster baru' },
  { id: 'karantina', label: 'Belum terkelompok' },
]
const HELP = {
  tinjau: 'Kelompok ini gagal satu syarat kualitas. Barangnya tetap dipilah, tapi kelompoknya perlu diaudit.',
  baru: 'Terbentuk sendiri dari foto yang belum dikenali, pada uji pertumbuhan.',
  karantina: 'Foto dataset yang tidak cukup mirip dengan kelompok mana pun.',
}
const valid = (f) => FILTERS.some((x) => x.id === f)
const filter = ref(valid(route.query.f) ? route.query.f : 'semua')
const q = ref('')
watch(filter, (f) => router.replace({ query: f === 'semua' ? {} : { f } }))
watch(() => route.query.f, (f) => { filter.value = valid(f) ? f : 'semua' })

const counts = computed(() => ({
  semua: s.value.clusters.length,
  tinjau: s.value.clusters.filter((c) => c.status === 'tinjau').length,
  baru: s.value.born?.length || 0,
  karantina: s.value.noise?.size || 0,
}))

// "Klaster baru" hanya muncul kalau datanya ada.
const shownFilters = computed(() => FILTERS.filter((f) => f.id !== 'baru' || counts.value.baru > 0))

const list = computed(() => {
  let base
  if (filter.value === 'baru') base = s.value.born || []
  else if (filter.value === 'karantina') base = s.value.noise ? [s.value.noise] : []
  else base = s.value.clusters.filter((c) => filter.value === 'semua' || c.status === filter.value)
  const term = q.value.trim().toLowerCase()
  if (term) base = base.filter((c) => `${c.id} ${c.name}`.toLowerCase().includes(term))
  return [...base].sort((a, b) => b.size - a.size)
})

const comp = computed(() => {
  const m = s.value.meta
  const total = m.images.unique
  return [
    { id: 'lolos', label: 'Lolos uji', pct: (m.coverage.trusted / total) * 100, cls: 'ok' },
    { id: 'tinjau', label: 'Perlu ditinjau', pct: (m.coverage.review / total) * 100, cls: 'warn' },
    { id: 'karantina', label: 'Belum terkelompok', pct: (m.coverage.noise / total) * 100, cls: 'idle' },
  ]
})
</script>

<template>
  <div class="page">
    <header class="head">
      <h1 class="h1">Klaster</h1>
      <p class="muted">{{ s.clusters.length }} jenis barang yang ditemukan sistem dari {{ fmt.int(s.meta.images.unique) }} foto tanpa label.</p>
    </header>

    <section class="comp" aria-label="Pembagian foto">
      <div class="bar">
        <span v-for="c in comp" :key="c.id" :class="c.cls" :style="{ width: c.pct + '%' }" />
      </div>
      <ul class="legend">
        <li v-for="c in comp" :key="c.id"><span class="dot" :class="c.cls" />{{ c.label }} <b class="num">{{ fmt.pct(c.pct, 0) }}</b></li>
      </ul>
    </section>

    <div class="toolbar">
      <div class="seg" role="group" aria-label="Saring">
        <button v-for="f in shownFilters" :key="f.id" :aria-pressed="filter === f.id" @click="filter = f.id">
          {{ f.label }}<span class="count">{{ fmt.int(counts[f.id]) }}</span>
        </button>
      </div>
      <label class="search">
        <Icon name="search" :size="16" />
        <input id="cari-klaster" v-model="q" class="input" type="search" placeholder="Cari barang" aria-label="Cari klaster" />
      </label>
    </div>
    <p v-if="HELP[filter]" class="help muted">{{ HELP[filter] }}</p>

    <div v-if="list.length" class="grid">
      <ClusterCard v-for="c in list" :key="c.id" :cluster="c" />
    </div>
    <p v-else class="muted empty">Tidak ada yang cocok dengan "{{ q }}".</p>

    <p v-if="s.meta.demo" class="foot faint">{{ s.meta.demoNote }}</p>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; max-width: 1360px; }
.head { display: grid; gap: 6px; }
.comp { display: grid; gap: 8px; max-width: 760px; }
.bar { display: flex; gap: 2px; height: 10px; border-radius: 3px; overflow: hidden; }
.bar .ok, .dot.ok { background: var(--accent); }
.bar .warn, .dot.warn { background: var(--warn); }
.bar .idle, .dot.idle { background: var(--line-strong); }
.legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 20px; font-size: 13.5px; color: var(--fg-2); }
.legend li { display: inline-flex; align-items: center; gap: 7px; }
.legend b { color: var(--fg); font-weight: 600; }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-top: 6px; }
.search { position: relative; display: flex; align-items: center; min-width: 0; }
.search .icon { position: absolute; left: 11px; color: var(--fg-3); pointer-events: none; }
.search .input { padding-left: 32px; width: 220px; max-width: 100%; }
.help { font-size: 14px; margin-top: -6px; }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr)); }
.empty { padding: 40px 0; }
.foot { font-size: 12.5px; padding-top: 8px; }
@media (max-width: 560px) {
  .search, .search .input { width: 100%; }
}
</style>
