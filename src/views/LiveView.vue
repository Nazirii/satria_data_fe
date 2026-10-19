<script setup>
import { computed, ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import StatusPill from '../components/StatusPill.vue'
import PhotoTile from '../components/PhotoTile.vue'
import Lightbox from '../components/Lightbox.vue'
import { useData } from '../composables/useData.js'
import { useConveyorSim, ZONE } from '../composables/useConveyorSim.js'
import { usePresence } from '../composables/presence.js'
import { backend, inferImage, sendFeedback } from '../services/api.js'

const route = useRoute()
const debug = computed(() => 'debug' in route.query)
const { summary, byId, bins } = useData()
const source = ref('sim') // 'sim' | 'camera'
const feed = ref([])
const binCount = reactive({})
let uid = 0

const clock = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')
const binFor = (status, clusterId) => (status === 'dikenali' ? byId(clusterId)?.bin : 'karantina') || 'karantina'

/** Satu baris riwayat. r = { status, cluster, score?, top?, reason? } */
function addFeed(r, img) {
  const c = r.cluster ? byId(r.cluster) : null
  const bin = binFor(r.status, r.cluster)
  binCount[bin] = (binCount[bin] || 0) + 1
  const n = ++uid
  feed.value = [{
    uid: n, id: `L-${n}`, n, time: clock(), img, src: img, status: r.status,
    clusterId: r.cluster, name: c?.name, hazard: c?.hazard, bin,
    sim: r.score, top: r.top, reason: r.reason, margin: r.margin,
  }, ...feed.value].slice(0, 40)
}

// Simulasi konveyor: skor tiruan, top-5 dibuat di popup.
const sim = useConveyorSim(() => summary.value, (o) => {
  const known = o.result.status === 'dikenali'
  const score = known ? 0.72 + Math.random() * 0.15 : 0.45 + Math.random() * 0.2
  addFeed({ ...o.result, score: Number(score.toFixed(3)), reason: known ? null : 'low_score' }, o.img)
})
onMounted(() => sim.start())

const latest = computed(() => feed.value[0])
const open = ref(-1)
const snap = ref([]) // salinan riwayat saat popup dibuka, supaya isinya tidak bergeser
function openAt(i) { snap.value = feed.value.slice(); open.value = i }
const flagged = reactive(new Set())
function toggleFlag(id) {
  if (flagged.has(id)) { flagged.delete(id); return }
  flagged.add(id)
  const it = feed.value.find((f) => f.id === id) || snap.value.find((f) => f.id === id)
  if (it) {
    sendFeedback({
      item_id: id, cluster: it.clusterId, score: it.sim, source: source.value === 'camera' ? 'live' : 'sim',
      image: typeof it.img === 'string' && it.img.startsWith('data:') ? it.img : null,
    })
  }
}
const history = computed(() => feed.value.slice(1))
const binsRow = computed(() => ['b3', 'gawai', 'layar', 'ti', 'kecil', 'besar', 'pcb', 'karantina'].map((id) => ({ id, n: binCount[id] || 0, ...bins.value[id] })))
const isLive = computed(() => source.value === 'camera' || sim.running.value)

function objLabel(o) {
  if (o.result.status !== 'dikenali') return 'Belum dikenali'
  const c = byId(o.result.cluster)
  return `${bins.value[c?.bin]?.short || ''} · ${c?.name || ''}`
}
function objColor(o) {
  return o.result.status === 'dikenali' ? bins.value[byId(o.result.cluster)?.bin]?.color : null
}

/* ---------- kamera perangkat ---------- */
// Zona pemicu, relatif terhadap frame kamera. Hanya isi zona ini yang dikirim ke backend.
const CAM_ZONE = { x: 0.2, y: 0.12, w: 0.6, h: 0.76 }
const video = ref(null)
const stage = ref(null)
const camError = ref('')
const camBox = ref(null)   // kotak hasil terakhir, koordinat frame kamera
const camRect = ref({})
let stream = null
let ro = null

const presence = usePresence(video, CAM_ZONE, async (blob, canvas) => {
  try {
    const res = await inferImage(blob, { summary: summary.value, source: 'live' })
    if (res.duplicate) return
    const o = res.objects?.[0]
    if (!o) return
    const [bx, by, bw, bh] = o.bbox
    camBox.value = { ...o, frame: [CAM_ZONE.x + bx * CAM_ZONE.w, CAM_ZONE.y + by * CAM_ZONE.h, bw * CAM_ZONE.w, bh * CAM_ZONE.h] }
    addFeed(o, thumbOf(canvas, o.bbox))
  } catch (e) {
    camError.value = e.message
  }
})
watch(() => presence.state.value, (st) => { if (st === 'kosong') camBox.value = null })

function thumbOf(canvas, [x, y, w, h]) {
  const t = document.createElement('canvas')
  const sw = Math.max(1, w * canvas.width)
  const sh = Math.max(1, h * canvas.height)
  const k = Math.min(1, 640 / Math.max(sw, sh))
  t.width = Math.round(sw * k); t.height = Math.round(sh * k)
  t.getContext('2d').drawImage(canvas, x * canvas.width, y * canvas.height, sw, sh, 0, 0, t.width, t.height)
  return t.toDataURL('image/jpeg', 0.82)
}

const HINT = {
  kalibrasi: 'Menyiapkan latar. Kosongkan kotak sebentar.',
  kosong: 'Letakkan barang di dalam kotak.',
  ada: 'Tahan sebentar…',
  mengenali: 'Mengenali…',
  menunggu: 'Angkat barang untuk barang berikutnya.',
}
const hint = computed(() => HINT[presence.state.value] || '')

function fit() {
  const v = video.value
  const el = stage.value
  if (!v?.videoWidth || !el) return
  const W = el.clientWidth, H = el.clientHeight
  const k = Math.min(W / v.videoWidth, H / v.videoHeight)
  const w = v.videoWidth * k, h = v.videoHeight * k
  camRect.value = { left: `${(W - w) / 2}px`, top: `${(H - h) / 2}px`, width: `${w}px`, height: `${h}px` }
}
const pct = ([x, y, w, h]) => ({ left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: h * 100 + '%' })
const zoneBox = [CAM_ZONE.x, CAM_ZONE.y, CAM_ZONE.w, CAM_ZONE.h]

// Pilihan kamera. Urutan awal dari VITE_CAMERA_INDEX di .env.local (0, 1, 2, ... seperti indeks OpenCV),
// lalu pilihan terakhir dari menu disimpan di browser.
const cams = ref([])
const camId = ref('')
const CAM_KEY = 'sipilah.camera'
const savedCam = () => { try { return localStorage.getItem(CAM_KEY) || '' } catch { return '' } }

function openStream(deviceId) {
  const size = { width: { ideal: 1280 }, height: { ideal: 720 } }
  const video = deviceId ? { deviceId: { exact: deviceId }, ...size } : { facingMode: 'environment', ...size }
  return navigator.mediaDevices.getUserMedia({ video, audio: false })
}

async function useCamera(deviceId) {
  camError.value = ''
  try {
    if (typeof deviceId !== 'string') deviceId = camId.value || savedCam()
    try { stream = await openStream(deviceId) } catch { stream = await openStream('') }
    // Nama & urutan kamera baru terbaca setelah izin diberikan.
    cams.value = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
    const current = stream.getVideoTracks()[0]?.getSettings().deviceId
    if (!deviceId) {
      const idx = Number(import.meta.env.VITE_CAMERA_INDEX || 0)
      const want = cams.value[idx]?.deviceId
      if (want && want !== current) {
        stream.getTracks().forEach((t) => t.stop())
        stream = await openStream(want)
      }
    }
    camId.value = stream.getVideoTracks()[0]?.getSettings().deviceId || ''
    source.value = 'camera'
    sim.running.value = false
    feed.value = []  // riwayat simulasi tidak dicampur dengan hasil kamera
    for (const k of Object.keys(binCount)) delete binCount[k]
    await nextTick()
    video.value.srcObject = stream
    if (!ro) { ro = new ResizeObserver(fit); ro.observe(stage.value) }
    presence.resetBackground()
    presence.start()
  } catch {
    camError.value = 'Kamera tidak bisa dibuka. Periksa izin kamera di browser.'
    source.value = 'sim'
  }
}
// Kamera dicolok/dicabut saat halaman terbuka → perbarui daftar.
async function refreshCams() {
  if (source.value !== 'camera') return
  cams.value = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
}
navigator.mediaDevices?.addEventListener?.('devicechange', refreshCams)
onBeforeUnmount(() => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshCams))

async function switchCamera(id) {
  try { localStorage.setItem(CAM_KEY, id) } catch { /* abaikan */ }
  stopCamera()
  await useCamera(id)
}
function useSim() {
  stopCamera()
  source.value = 'sim'
  sim.running.value = true
}
function stopCamera() {
  presence.stop()
  ro?.disconnect(); ro = null
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  camBox.value = null
}
onBeforeUnmount(stopCamera)
</script>

<template>
  <div class="page">
    <header class="head">
      <h1 class="h1">Live kamera</h1>
      <div class="controls">
        <span class="live-chip" :class="{ off: !isLive }"><i />{{ isLive ? 'Live' : 'Dijeda' }}</span>
        <div class="seg" role="group" aria-label="Sumber video">
          <button :aria-pressed="source === 'sim'" @click="useSim">Simulasi</button>
          <button :aria-pressed="source === 'camera'" @click="useCamera()">Kamera</button>
        </div>
        <select
          v-if="source === 'camera'" class="cam-select" aria-label="Pilih kamera"
          :value="camId" @change="switchCamera($event.target.value)"
        >
          <option v-for="(c, i) in cams" :key="c.deviceId" :value="c.deviceId">{{ i }} · {{ c.label || `Kamera ${i}` }}</option>
          <option v-if="cams.length < 2" disabled value="">Kamera lain tidak terdeteksi</option>
        </select>
        <button v-if="source === 'sim'" class="btn btn-secondary btn-sm" @click="sim.running.value = !sim.running.value">
          <Icon :name="sim.running.value ? 'pause' : 'play'" :size="15" />{{ sim.running.value ? 'Jeda' : 'Lanjut' }}
        </button>
      </div>
    </header>
    <p v-if="camError" class="demo-note"><Icon name="info" :size="16" />{{ camError }}</p>

    <div class="body">
      <section class="stage-col">
        <div ref="stage" class="stage">
          <template v-if="source === 'sim'">
            <div class="belt" />
            <div class="zone" :style="{ left: ZONE.from + '%', width: ZONE.to - ZONE.from + '%' }" />
            <div
              v-for="o in sim.objects.value" :key="o.uid" class="obj"
              :class="o.revealed ? `st-${o.result.status}` : ''"
              :style="{ left: o.x + '%', top: o.y + '%', width: o.w + 'px' }"
            >
              <PhotoTile :src="o.img" class="obj-img" />
              <span v-if="o.revealed" class="obj-l">
                <span v-if="objColor(o)" class="sw" :style="{ background: objColor(o) }" />{{ objLabel(o) }}
              </span>
            </div>
          </template>
          <template v-else>
            <div class="cam-box" :style="camRect">
              <video ref="video" class="cam" autoplay playsinline muted @loadedmetadata="fit" />
              <div class="cam-zone" :class="`z-${presence.state.value}`" :style="pct(zoneBox)" />
              <div v-if="camBox" class="obj box-only" :class="`st-${camBox.status}`" :style="pct(camBox.frame)">
                <span class="obj-l">{{ camBox.cluster ? byId(camBox.cluster)?.name : 'Belum dikenali' }}</span>
              </div>
            </div>
            <p class="cam-hint"><span>{{ hint }}</span><span v-if="backend.status !== 'asli'" class="faint">Hasil simulasi</span></p>
            <button class="btn btn-secondary btn-sm cam-reset" @click="presence.resetBackground()">Atur ulang latar</button>
            <p v-if="debug" class="cam-debug mono">
              {{ presence.state.value }} · beda {{ (presence.metrics.value.fg * 100).toFixed(1) }}% · gerak {{ presence.metrics.value.motion.toFixed(1) }}
            </p>
          </template>
        </div>

        <div class="bins" aria-label="Jumlah barang per wadah">
          <div v-for="b in binsRow" :key="b.id" class="bin-c" :title="b.name">
            <span class="sw" :style="{ background: b.color }" />
            <span class="bn">{{ b.short }}</span>
            <span class="mono bv">{{ b.n }}</span>
          </div>
        </div>
      </section>

      <aside class="panel" aria-live="polite">
        <p class="label">Barang terakhir</p>
        <button v-if="latest" class="latest" :class="{ unknown: latest.status !== 'dikenali' }" @click="openAt(0)">
          <PhotoTile :src="latest.img" class="l-img" />
          <div class="l-main">
            <p class="l-name">{{ latest.status === 'dikenali' ? latest.name : 'Belum dikenali' }}</p>
            <p class="l-bin">
              <span class="sw big" :style="{ background: bins[latest.bin]?.color }" />{{ bins[latest.bin]?.name }}
            </p>
            <StatusPill v-if="latest.hazard === 'tinggi'" hazard="tinggi" size="sm" />
          </div>
        </button>
        <p v-else class="muted">Menunggu barang pertama…</p>

        <p v-if="history.length" class="label">Sebelumnya</p>
        <ul class="hist">
          <li v-for="(f, i) in history" :key="f.uid" :class="{ unknown: f.status !== 'dikenali' }" role="button" tabindex="0"
            @click="openAt(i + 1)" @keydown.enter="openAt(i + 1)">
            <PhotoTile :src="f.img" class="th" />
            <span class="h-name">{{ f.status === 'dikenali' ? f.name : 'Belum dikenali' }}</span>
            <span class="h-bin"><span class="sw" :style="{ background: bins[f.bin]?.color }" />{{ bins[f.bin]?.short }}</span>
            <span class="mono h-time">{{ f.time }}</span>
          </li>
        </ul>
      </aside>
    </div>

    <Lightbox
      v-if="open >= 0 && snap[open]" v-model:index="open" :items="snap" live
      :flagged="flagged" @close="open = -1" @flag="toggleFlag"
    />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; max-width: 1400px; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.live-chip { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 600; padding: 0 4px; }
.live-chip i { width: 8px; height: 8px; border-radius: 999px; background: var(--accent); }
.live-chip.off i { background: var(--fg-3); }

.body { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
.stage-col { display: grid; gap: 10px; min-width: 0; }
.stage {
  position: relative; aspect-ratio: 16 / 10; max-height: calc(100dvh - 200px); min-height: 320px;
  border-radius: var(--r-lg); background: var(--video); overflow: hidden; color: var(--video-fg);
}
.belt {
  position: absolute; left: 0; right: 0; top: 16%; bottom: 14%;
  background: repeating-linear-gradient(90deg, var(--video-line) 0 1px, transparent 1px 44px);
  border-block: 1px solid var(--video-line);
}
.zone { position: absolute; top: 16%; bottom: 14%; border-inline: 1.5px dashed color-mix(in srgb, var(--video-fg) 35%, transparent); }

.obj { position: absolute; translate: -50% -50%; border-radius: 6px; outline: 2px solid transparent; outline-offset: 5px; }
.obj-img { --ar: 4 / 3; border-radius: 6px; box-shadow: 0 1px 3px rgba(11, 13, 12, .18); }
.obj-l {
  position: absolute; left: -7px; bottom: calc(100% + 10px);
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 4px;
  font-size: 12px; font-weight: 600; white-space: nowrap;
  background: var(--bg); color: var(--fg); box-shadow: 0 0 0 1px var(--line-strong);
}
.st-dikenali { outline-color: var(--video-fg); }
.st-belum { outline-color: var(--warn); outline-width: 3px; }
.st-belum .obj-l { background: var(--warn); color: var(--on-accent); box-shadow: none; }
.box-only { translate: none; border-radius: 4px; outline-offset: 0; }
.cam-box { position: absolute; }
.cam-select { height: 34px; max-width: 240px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line-strong); background: var(--bg); color: var(--fg); font: inherit; font-size: 14px; }
.cam { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
.cam-zone { position: absolute; border: 2px dashed rgba(255, 255, 255, .9); border-radius: 8px; box-shadow: 0 0 0 1px rgba(11, 13, 12, .35); transition: border-color .15s; }
.cam-zone.z-ada, .cam-zone.z-mengenali { border-style: solid; border-color: var(--accent); }
.cam-hint {
  position: absolute; left: 16px; bottom: 16px; display: flex; gap: 10px; align-items: center;
  padding: 9px 12px; border-radius: 8px; background: var(--bg); color: var(--fg); box-shadow: var(--shadow); font-size: 15px; font-weight: 600;
}
.cam-hint .faint { font-weight: 500; font-size: 13px; }
.cam-reset { position: absolute; right: 16px; bottom: 16px; }
.cam-debug { position: absolute; left: 16px; top: 12px; padding: 4px 8px; border-radius: 6px; background: rgba(0, 0, 0, .6); color: #fff; font-size: 12px; }

.sw { width: 10px; height: 10px; border-radius: 2px; flex: none; display: inline-block; }
.sw.big { width: 14px; height: 14px; border-radius: 3px; }
.bins { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 6px; }
.bin-c { display: flex; align-items: center; gap: 7px; padding: 8px 10px; border-radius: 8px; background: var(--bg-sunken); min-width: 0; }
.bn { font-size: 12.5px; font-weight: 600; flex: 1; }
.bv { font-size: 12.5px; color: var(--fg-2); }

.panel {
  display: flex; flex-direction: column; gap: 10px; min-width: 0;
  border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--bg);
  padding: 16px; max-height: calc(100dvh - 120px); overflow: hidden;
}
.label { font-size: 13px; font-weight: 600; color: var(--fg-3); }
.latest { width: 100%; border: 0; text-align: left; cursor: pointer; display: grid; grid-template-columns: 96px 1fr; gap: 14px; align-items: center; padding: 12px; border-radius: 12px; background: var(--bg-sunken); }
.latest.unknown { background: var(--warn-soft); }
.l-img { border-radius: 8px; }
.l-main { display: grid; gap: 6px; justify-items: start; min-width: 0; }
.l-name { font-size: 20px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.15; }
.l-bin { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
.unknown .l-name { color: var(--warn); }
.hist { list-style: none; margin: 0 -16px -16px; padding: 0 0 8px; overflow-y: auto; }
.hist li:hover, .latest:hover { filter: brightness(.97); }
.hist li { cursor: pointer; display: grid; grid-template-columns: 36px minmax(0, 1fr) auto auto; gap: 10px; align-items: center; padding: 7px 16px; }
.hist li.unknown .h-name { color: var(--warn); font-weight: 600; }
.th { width: 36px; border-radius: 6px; }
.h-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.h-bin { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--fg-2); }
.h-time { font-size: 11.5px; color: var(--fg-3); }

@media (max-width: 1100px) {
  .body { grid-template-columns: 1fr; }
  .panel { max-height: 420px; }
  .bins { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .stage { aspect-ratio: 4 / 3; min-height: 240px; }
  .obj { scale: .8; }
  .h-time { display: none; }
}
</style>
