<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import Icon from '../components/Icon.vue'
import StatusPill from '../components/StatusPill.vue'
import PhotoTile from '../components/PhotoTile.vue'
import Lightbox from '../components/Lightbox.vue'
import { useData } from '../composables/useData.js'
import { inferImage, loadExamples, sendFeedback } from '../services/api.js'

const { summary, byId, bins } = useData()
const dragging = ref(false)
const busy = ref(false)
const error = ref('')
const current = ref(null) // { url, objects, simulated }
const active = ref(0)
const urls = []

// Foto contoh: dari examples.json (foto uji yang tidak ada di galeri) kalau sudah diekspor.
const examples = ref([
  { key: 'k20-2', src: 'images/sample/k20-2.jpg', label: 'Meja komputer' },
  { key: 'k04-1', src: 'images/sample/k04-1.jpg', label: 'Baterai laptop' },
  { key: 'k15-1', src: 'images/sample/k15-1.jpg', label: 'Tumpukan PCB' },
])
onMounted(async () => { const ex = await loadExamples(); if (ex?.length) examples.value = ex })

async function run(blob, url, hint) {
  busy.value = true; error.value = ''
  try {
    const res = await inferImage(blob, { summary: summary.value, hint })
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')
    current.value = { url, objects: res.objects || [], simulated: res.simulated, time }
    active.value = 0
  } catch (e) {
    error.value = `${e.message}. Coba lagi.`
  } finally { busy.value = false }
}
function onFiles(files) {
  const f = files?.[0]
  if (!f) return
  if (!f.type.startsWith('image/')) { error.value = 'Berkas itu bukan gambar. Pilih foto JPG, PNG, atau HEIC.'; return }
  const url = URL.createObjectURL(f); urls.push(url)
  run(f, url, f.name + f.size)
}
async function useExample(ex) {
  run(await fetch(ex.src).then((r) => r.blob()), ex.src, ex.key)
}
onBeforeUnmount(() => urls.forEach((u) => URL.revokeObjectURL(u)))

// Popup yang sama dengan Live: skor + 5 kelompok paling mirip.
const open = ref(-1)
const flagged = reactive(new Set())
const popupItems = computed(() => (current.value?.objects || []).map((o, i) => ({
  id: `F-${i + 1}`, n: i + 1, time: current.value.time, img: current.value.url, src: current.value.url,
  status: o.status, clusterId: o.status === 'dikenali' ? o.cluster : null, sim: o.score, top: o.top, reason: o.reason, margin: o.margin,
})))
function toggleFlag(id) {
  if (flagged.has(id)) { flagged.delete(id); return }
  flagged.add(id)
  const it = popupItems.value.find((x) => x.id === id)
  if (it) sendFeedback({ item_id: id, cluster: it.clusterId, score: it.sim, source: 'photo' })
}

const info = (o) => {
  const c = o.status === 'dikenali' ? byId(o.cluster) : null
  const bin = bins.value[c ? c.bin : 'karantina']
  return { c, bin }
}
</script>

<template>
  <div class="page">
    <template v-if="!current">
      <h1 class="h1">Foto barang</h1>
      <label
        class="drop" :class="{ over: dragging, busy }"
        @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="dragging = false; onFiles($event.dataTransfer?.files)"
      >
        <input id="unggah-foto" type="file" accept="image/*" capture="environment" class="sr" @change="onFiles($event.target.files)" />
        <span class="up"><Icon name="camera" :size="28" /></span>
        <span class="drop-t">{{ busy ? 'Mengenali barang…' : 'Ambil atau pilih foto' }}</span>
        <span class="muted">Satu barang per foto.</span>
      </label>
      <p v-if="error" class="demo-note err"><Icon name="alert" :size="16" />{{ error }}</p>
      <div class="examples">
        <span class="muted small">Coba foto contoh</span>
        <button v-for="ex in examples" :key="ex.key" class="ex" @click="useExample(ex)">
          <PhotoTile :src="ex.src" class="ex-img" />{{ ex.label }}
        </button>
      </div>
    </template>

    <template v-else>
      <header class="head">
        <h1 class="h1">{{ current.objects.length }} barang</h1>
        <button class="btn btn-primary" @click="current = null"><Icon name="camera" :size="18" />Foto berikutnya</button>
      </header>

      <div class="result">
        <div class="photo">
          <div class="frame">
            <img :src="current.url" alt="Foto yang dikenali" />
            <button
              v-for="(o, i) in current.objects" :key="i" class="bb" :class="[`st-${o.status}`, { on: active === i }]"
              :style="{ left: o.bbox[0] * 100 + '%', top: o.bbox[1] * 100 + '%', width: o.bbox[2] * 100 + '%', height: o.bbox[3] * 100 + '%' }"
              :aria-label="`Barang ${i + 1}`" @click="active = i"
            ><span class="bb-n">{{ i + 1 }}</span></button>
          </div>
          <p v-if="current.simulated" class="faint small">Hasil simulasi. Sambungkan backend untuk hasil sebenarnya.</p>
        </div>

        <ol class="objs">
          <li v-for="(o, i) in current.objects" :key="i" class="obj" :class="[`st-${o.status}`, { on: active === i }]" @click="active = i">
            <span class="n">{{ i + 1 }}</span>
            <div class="o-main">
              <p class="o-name">{{ info(o).c ? info(o).c.name : 'Belum dikenali' }}</p>
              <p class="o-bin"><span class="sw" :style="{ background: info(o).bin?.color }" />{{ info(o).bin?.name }}</p>
              <StatusPill v-if="info(o).c?.hazard === 'tinggi'" hazard="tinggi" size="sm" />
              <details v-if="info(o).c?.steps?.length" class="how" @click.stop>
                <summary>Cara menangani</summary>
                <ul><li v-for="(st, k) in info(o).c.steps" :key="k">{{ st }}</li></ul>
              </details>
              <p v-else-if="!info(o).c" class="muted small">Supervisor akan mengecek barang ini.</p>
              <button class="link-btn" @click.stop="open = i">Lihat skor kemiripan</button>
            </div>
          </li>
        </ol>
      </div>
      <Lightbox
        v-if="open >= 0 && popupItems[open]" v-model:index="open" :items="popupItems" live
        :flagged="flagged" @close="open = -1" @flag="toggleFlag"
      />
    </template>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; max-width: 1180px; }
.small { font-size: 13.5px; }
.sr { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.err { color: var(--danger); background: var(--danger-soft); }

.drop {
  display: grid; justify-items: center; align-content: center; gap: 8px; text-align: center;
  min-height: 340px; padding: 28px 16px; border-radius: var(--r-lg); cursor: pointer;
  background: var(--bg-sunken); border: 1.5px dashed var(--line-strong); transition: border-color .15s, background .15s;
}
.drop:hover, .drop.over { border-color: var(--accent); background: var(--accent-soft); }
.drop:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 3px; }
.drop.busy { opacity: .7; pointer-events: none; }
.up { width: 64px; height: 64px; border-radius: 16px; display: grid; place-items: center; background: var(--accent); color: var(--on-accent); margin-bottom: 6px; }
.drop-t { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; }
.examples { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ex { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px 0 4px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); font-size: 13.5px; font-weight: 500; }
.ex:hover { border-color: var(--line-strong); }
.ex-img { width: 32px; border-radius: 6px; }

.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.result { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(300px, 1fr); gap: 20px; align-items: start; }
.photo { display: grid; gap: 8px; }
.frame { position: relative; border-radius: var(--r-lg); overflow: hidden; background: var(--photo-bg); border: 1px solid var(--line); }
.frame img { width: 100%; height: auto; }
.bb { position: absolute; padding: 0; border: 2px solid var(--video-fg); border-radius: 6px; background: transparent; box-shadow: 0 0 0 1px rgba(255, 255, 255, .7); }
.bb.st-belum { border-color: var(--warn); }
.bb.on { border-width: 3px; }
.bb-n { position: absolute; left: -2px; top: -2px; min-width: 24px; height: 24px; display: grid; place-items: center; border-radius: 5px 0 6px 0; font-size: 13px; font-weight: 700; background: var(--video-fg); color: var(--bg); }
.bb.st-belum .bb-n { background: var(--warn); }

.objs { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.obj { display: flex; gap: 12px; padding: 14px; border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--bg); cursor: pointer; }
.obj.on { border-color: var(--fg); }
.obj.st-belum { background: var(--warn-soft); border-color: transparent; }
.obj.st-belum.on { border-color: var(--warn); }
.n { width: 26px; height: 26px; flex: none; border-radius: 7px; display: grid; place-items: center; font-weight: 700; font-size: 13px; background: var(--bg-sunken); }
.st-belum .n { background: var(--warn); color: var(--on-accent); }
.o-main { display: grid; gap: 6px; justify-items: start; min-width: 0; flex: 1; }
.o-name { font-size: 18px; font-weight: 700; letter-spacing: -0.025em; }
.st-belum .o-name { color: var(--warn); }
.o-bin { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
.sw { width: 12px; height: 12px; border-radius: 3px; flex: none; }
.how { font-size: 14px; color: var(--fg-2); }
.how summary { cursor: pointer; font-weight: 600; color: var(--accent-strong); }
.link-btn { border: 0; background: none; padding: 0; font: inherit; font-size: 14px; font-weight: 600; color: var(--accent-strong); cursor: pointer; }
.link-btn:hover { text-decoration: underline; }
.how ul { margin: 6px 0 0; padding-left: 18px; display: grid; gap: 4px; }

@media (max-width: 900px) { .result { grid-template-columns: 1fr; } }
</style>
