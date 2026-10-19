<script setup>
import { computed, ref, watch, reactive } from 'vue'
import PhotoTile from '../components/PhotoTile.vue'
import StatusPill from '../components/StatusPill.vue'
import SilMeter from '../components/SilMeter.vue'
import Lightbox from '../components/Lightbox.vue'
import Icon from '../components/Icon.vue'
import { useData, fmt } from '../composables/useData.js'
import { loadItems, sendFeedback } from '../services/api.js'

const props = defineProps({ id: { type: String, required: true } })
const { byId, families, bins, summary } = useData()

const cluster = computed(() => byId(props.id))
const fam = computed(() => families.value[cluster.value?.family] || { name: '', color: '#8d938e' })
const bin = computed(() => bins.value[cluster.value?.bin])
const t = computed(() => summary.value.meta.thresholds)
const isNoise = computed(() => cluster.value?.id === 'noise')

const TABS = [
  { id: 'foto', label: 'Foto' },
  { id: 'penanganan', label: 'Penanganan' },
  { id: 'kualitas', label: 'Kualitas' },
]
const tab = ref('foto')

const items = ref([])
const source = ref('')
const loading = ref(true)
const PAGE = 60
const shown = ref(PAGE)
const order = ref('dekat')
const big = ref(false)
const open = ref(-1)
const flagged = reactive(new Set())

watch(cluster, async (c) => {
  items.value = []; shown.value = PAGE; open.value = -1; loading.value = true; tab.value = 'foto'
  if (!c) return
  const r = await loadItems(c)
  items.value = r.items; source.value = r.source; loading.value = false
}, { immediate: true })

const ordered = computed(() => {
  if (isNoise.value) return items.value
  return [...items.value].sort((x, y) => (order.value === 'dekat' ? y.sim - x.sim : x.sim - y.sim))
})
const visible = computed(() => ordered.value.slice(0, shown.value))

const gate = computed(() => {
  const c = cluster.value
  if (!c?.gate) return []
  return [
    { label: `Jumlah foto ≥ ${t.value.support}`, ok: c.gate.support, val: fmt.int(c.size) },
    { label: `Silhouette ≥ ${fmt.dec(t.value.silhouette, 2)}`, ok: c.gate.silhouette, val: fmt.dec(c.silhouette) },
    { label: `Compactness ≥ ${fmt.dec(t.value.compactness, 2)}`, ok: c.gate.compactness, val: typeof c.compactness === 'number' ? fmt.dec(c.compactness) : 'lolos' },
    { label: `Margin ≥ ${fmt.dec(t.value.margin, 2)}`, ok: c.gate.margin, val: typeof c.margin === 'number' ? fmt.dec(c.margin) : 'lolos' },
  ]
})
function toggleFlag(id) {
  if (flagged.has(id)) { flagged.delete(id); return }
  flagged.add(id)
  const it = items.value.find((x) => x.id === id)
  sendFeedback({ item_id: id, cluster: cluster.value?.id, score: it?.sim, source: 'gallery', note: it?.file })
}
</script>

<template>
  <div v-if="!cluster" class="missing">
    <p class="h2">Klaster tidak ditemukan</p>
    <RouterLink to="/klaster" class="btn btn-secondary">Kembali ke klaster</RouterLink>
  </div>

  <div v-else class="page">
    <RouterLink to="/klaster" class="back"><Icon name="arrowLeft" :size="16" />Klaster</RouterLink>

    <header class="head">
      <StatusPill v-if="cluster.status !== 'lolos'" :status="cluster.status" />
      <h1 class="h1"><span v-if="!isNoise" class="code mono">{{ cluster.id }}</span>{{ cluster.name }}</h1>
      <p class="muted">{{ fmt.int(cluster.size) }} foto<template v-if="!isNoise"> · {{ fam.name }}</template></p>
    </header>

    <div class="tabs" role="tablist" aria-label="Bagian klaster">
      <button
        v-for="tb in TABS" :id="`tab-${tb.id}`" :key="tb.id" role="tab" :aria-selected="tab === tb.id"
        :aria-controls="`panel-${tb.id}`" @click="tab = tb.id"
      >{{ tb.label }}</button>
    </div>

    <!-- FOTO -->
    <section v-show="tab === 'foto'" id="panel-foto" role="tabpanel" aria-labelledby="tab-foto" class="panel">
      <div class="gbar">
        <div v-if="!isNoise" class="seg" role="group" aria-label="Urutan">
          <button :aria-pressed="order === 'dekat'" @click="order = 'dekat'">Paling mirip</button>
          <button :aria-pressed="order === 'pinggir'" @click="order = 'pinggir'">Paling tidak mirip</button>
        </div>
        <span v-else />
        <div class="seg" role="group" aria-label="Ukuran petak">
          <button :aria-pressed="!big" aria-label="Petak kecil" @click="big = false"><Icon name="gridS" :size="16" /></button>
          <button :aria-pressed="big" aria-label="Petak besar" @click="big = true"><Icon name="gridL" :size="16" /></button>
        </div>
      </div>

      <p v-if="loading" class="muted">Memuat foto…</p>
      <div v-else class="gallery" :class="{ big }">
        <button
          v-for="(it, i) in visible" :key="it.id" class="gtile" :class="{ edge: it.edge, flagged: flagged.has(it.id) }"
          :aria-label="`Buka ${it.id}`" @click="open = i"
        >
          <PhotoTile :src="it.src" :color="fam.color" :icon-size="big ? 24 : 18" />
          <span v-if="flagged.has(it.id)" class="flag-dot"><Icon name="flag" :size="12" /></span>
        </button>
      </div>
      <div v-if="shown < items.length" class="more">
        <button class="btn btn-secondary" @click="shown += PAGE">Tampilkan lagi</button>
        <span class="faint small">{{ fmt.int(shown) }} dari {{ fmt.int(items.length) }}</span>
      </div>
      <p v-if="!isNoise" class="faint small legend"><span class="lg-edge" />Garis kuning: 15% foto yang paling tidak mirip dengan kelompoknya.</p>
      <p v-if="source === 'contoh'" class="faint small">Contoh: hanya foto dari naskah yang tampil, sisanya kotak kosong.</p>
    </section>

    <!-- PENANGANAN -->
    <section v-show="tab === 'penanganan'" id="panel-penanganan" role="tabpanel" aria-labelledby="tab-penanganan" class="panel narrow">
      <div class="row">
        <span class="k">Masukkan ke</span>
        <span class="bin-big"><span class="sw" :style="{ background: bin?.color }" />{{ bin?.name }}</span>
      </div>
      <div v-if="cluster.hazard === 'tinggi'" class="row">
        <span class="k">Perhatian</span>
        <StatusPill hazard="tinggi" />
      </div>
      <div v-if="cluster.steps?.length" class="row">
        <span class="k">Langkah</span>
        <ol class="steps"><li v-for="(st, i) in cluster.steps" :key="i">{{ st }}</li></ol>
      </div>
      <div v-if="cluster.sources?.length" class="row">
        <span class="k">Sumber rujukan</span>
        <p class="srcs mono">{{ cluster.sources.join(' · ') }}</p>
      </div>
    </section>

    <!-- KUALITAS -->
    <section v-show="tab === 'kualitas'" id="panel-kualitas" role="tabpanel" aria-labelledby="tab-kualitas" class="panel narrow">
      <p v-if="cluster.note" class="note">{{ cluster.note }}</p>
      <template v-if="cluster.status === 'baru'">
        <div class="row"><span class="k">Purity</span><span class="v num">{{ fmt.pct(cluster.purity * 100, 0) }}</span></div>
        <div class="row"><span class="k">Recall</span><span class="v num">{{ fmt.pct(cluster.recall * 100, 1) }}</span></div>
        <div class="row"><span class="k">Asal</span><RouterLink :to="`/klaster/${cluster.origin}`" class="v link">{{ cluster.origin }} · {{ byId(cluster.origin)?.name }}</RouterLink></div>
      </template>
      <template v-else-if="!isNoise">
        <div class="row">
          <span class="k">Silhouette</span>
          <SilMeter :value="cluster.silhouette" :estimated="cluster.silhouetteEstimated" :width="120" />
        </div>
        <div class="row">
          <span class="k">Syarat kualitas</span>
          <ul class="checks">
            <li v-for="g in gate" :key="g.label" :class="{ fail: !g.ok }">
              <Icon :name="g.ok ? 'checkCircle' : 'xCircle'" :size="16" />{{ g.label }}<span class="mono gv">{{ g.val }}</span>
            </li>
          </ul>
        </div>
      </template>
      <p v-else class="muted">Foto yang tidak dimasukkan ke kelompok mana pun saat clustering (label −1 pada HDBSCAN).</p>
    </section>

    <Lightbox
      v-if="open >= 0" v-model:index="open" :items="ordered" :cluster="cluster" :color="fam.color"
      :flagged="flagged" @close="open = -1" @flag="toggleFlag"
    />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; max-width: 1360px; }
.missing { display: grid; gap: 12px; justify-items: start; padding-top: 10vh; }
.back { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--accent-strong); width: fit-content; }
.head { display: grid; gap: 6px; justify-items: start; }
.code { font-size: .5em; font-weight: 600; color: var(--fg-3); margin-right: 10px; vertical-align: .35em; letter-spacing: 0; }
.small { font-size: 13px; }

.tabs { display: flex; gap: 22px; border-bottom: 1px solid var(--line); }
.tabs button {
  border: 0; background: none; padding: 10px 0; margin-bottom: -1px;
  font-size: 15px; font-weight: 500; color: var(--fg-2); border-bottom: 2px solid transparent;
}
.tabs button[aria-selected="true"] { color: var(--fg); font-weight: 650; border-bottom-color: var(--fg); }
.panel { display: flex; flex-direction: column; gap: 12px; }
.panel.narrow { max-width: 620px; gap: 0; }

.gbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.gbar .seg button { display: inline-flex; align-items: center; }
.gallery { display: grid; gap: 4px; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
.gallery.big { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.gtile { position: relative; padding: 0; border: 0; background: none; border-radius: 4px; overflow: hidden; display: block; }
.gallery.big .gtile { border-radius: 8px; }
.gtile :deep(.tile) { width: 100%; transition: transform .25s; }
.gtile:hover :deep(.tile) { transform: scale(1.035); }
.gtile.edge::after { content: ''; position: absolute; inset: 0; border: 2px dashed var(--warn); border-radius: inherit; pointer-events: none; }
.gtile.flagged::after { content: ''; position: absolute; inset: 0; border: 2px solid var(--fg); border-radius: inherit; pointer-events: none; }
.flag-dot { position: absolute; top: 5px; right: 5px; width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; background: var(--fg); color: var(--bg); }
.more { display: flex; gap: 12px; align-items: center; justify-content: center; }
.legend { display: flex; align-items: center; gap: 8px; }
.lg-edge { width: 14px; height: 14px; border: 2px dashed var(--warn); border-radius: 3px; flex: none; }

.row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--line); align-items: start; justify-items: start; }
.k { font-size: 14px; color: var(--fg-3); padding-top: 2px; }
.v { font-size: 16px; font-weight: 600; }
.link { color: var(--accent-strong); }
.bin-big { display: inline-flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
.sw { width: 16px; height: 16px; border-radius: 4px; flex: none; }
.steps { margin: 0; padding-left: 20px; display: grid; gap: 6px; font-size: 15.5px; }
.srcs { font-size: 13px; color: var(--fg-2); }
.note { font-size: 14.5px; color: var(--fg-2); padding: 12px 14px; border-radius: var(--r-md); background: var(--bg-sunken); margin-bottom: 4px; }
.checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 14.5px; }
.checks li { display: flex; align-items: center; gap: 8px; color: var(--fg-2); }
.checks .icon { color: var(--fg-3); }
.checks li.fail { color: var(--warn); font-weight: 600; }
.checks li.fail .icon { color: var(--warn); }
.gv { margin-left: auto; font-size: 12.5px; color: var(--fg); }

@media (max-width: 560px) {
  .gallery { grid-template-columns: repeat(3, 1fr); gap: 2px; }
  .gallery.big { grid-template-columns: repeat(2, 1fr); }
  .row { grid-template-columns: 1fr; gap: 6px; }
}
</style>
