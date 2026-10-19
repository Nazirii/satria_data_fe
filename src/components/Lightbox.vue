<script setup>
import { computed, onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import PhotoTile from './PhotoTile.vue'
import Icon from './Icon.vue'
import { useData, fmt } from '../composables/useData.js'
import { mockTop } from '../services/mock.js'

const props = defineProps({
  items: { type: Array, required: true },
  index: { type: Number, required: true },
  cluster: { type: Object, default: null },   // galeri: kelompok yang sedang dibuka
  color: { type: String, default: '#8d938e' },
  flagged: { type: Object, required: true },
  live: Boolean,                               // live kamera: tiap barang punya kelompoknya sendiri (it.clusterId)
})
const emit = defineEmits(['close', 'update:index', 'flag'])
const { summary, byId, families } = useData()
const it = computed(() => props.items[props.index])
const cl = computed(() => (props.live ? byId(it.value.clusterId) || summary.value.noise : props.cluster))
const isNoise = computed(() => cl.value.id === 'noise')
const tint = computed(() => (props.live ? families.value[cl.value.family]?.color : props.color) || '#8d938e')
const dialog = ref(null)

// Skor 0–100 = kemiripan foto dengan foto paling mirip di sebuah kelompok, dikali 100.
const score = (v) => (typeof v === 'number' ? Math.round(v * 100) : null)
const top = computed(() => {
  const list = it.value.top || mockTop(it.value, cl.value, summary.value.clusters)
  return list.slice(0, 5).map((t) => ({
    ...t,
    name: byId(t.cluster)?.name || t.cluster,
    own: t.cluster === cl.value.id,
  }))
})
const total = computed(() => props.items.length)
// Alasan "belum dikenali" dalam bahasa awam.
const why = computed(() => {
  const t = top.value
  if (it.value.reason === 'ambiguous' && t.length > 1) {
    return `Mirip dengan dua kelompok sekaligus (${t[0].name} dan ${t[1].name}), jadi masuk Wadah Periksa.`
  }
  return 'Tidak cukup mirip dengan kelompok mana pun, jadi masuk Wadah Periksa.'
})

function go(d) {
  const n = props.items.length
  emit('update:index', (props.index + d + n) % n)
}
function onKey(e) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
}
onMounted(async () => {
  document.addEventListener('keydown', onKey)
  document.documentElement.style.overflow = 'hidden'
  await nextTick()
  dialog.value?.focus()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <div class="scrim" @click.self="emit('close')">
    <div ref="dialog" class="dialog" role="dialog" aria-modal="true" :aria-label="live ? `Barang #${it.n}` : `Foto ${index + 1} dari ${total}`" tabindex="-1">
      <div class="stage">
        <PhotoTile :src="it.src" :color="tint" fit="contain" :icon-size="44" class="big" />
        <button class="nav prev" aria-label="Foto sebelumnya" @click="go(-1)"><Icon name="chevronLeft" :size="22" /></button>
        <button class="nav next" aria-label="Foto berikutnya" @click="go(1)"><Icon name="chevronRight" :size="22" /></button>
      </div>

      <aside class="info">
        <div class="top">
          <div>
            <p v-if="live" class="pos">Barang #{{ it.n }}</p>
            <p v-else class="pos">Foto {{ fmt.int(index + 1) }} dari {{ fmt.int(total) }}</p>
            <p class="file mono">{{ live ? `Terdeteksi ${it.time}` : it.file }}</p>
          </div>
          <button class="close" aria-label="Tutup" @click="emit('close')"><Icon name="x" :size="20" /></button>
        </div>

        <section v-if="!isNoise" class="block">
          <p class="k">Skor kemiripan dengan {{ cl.name }}</p>
          <p class="big-num num">{{ score(it.sim) }}<span class="of">/100</span></p>
          <p v-if="live" class="hint">Masuk ke {{ summary.bins.find((b) => b.id === cl.bin)?.name }}.</p>
          <p v-else class="hint">Urutan ke-{{ fmt.int(it.rank) }} dari {{ fmt.int(total) }} foto di kelompok ini.</p>
          <p v-if="it.edge" class="flag-note">Termasuk 15% foto yang paling tidak mirip di kelompok ini.</p>
        </section>
        <section v-else class="block">
          <p class="k">{{ live ? 'Belum dikenali' : 'Tidak masuk kelompok mana pun' }}</p>
          <p class="hint">{{ live ? why : 'Saat pengelompokan, foto ini tidak punya cukup banyak foto lain yang mirip di sekitarnya.' }}</p>
        </section>

        <section class="block">
          <p class="k">5 kelompok paling mirip</p>
          <ol class="topk">
            <li v-for="(t, i) in top" :key="t.cluster" :class="{ own: t.own }">
              <span class="rank num">{{ i + 1 }}</span>
              <span class="tk-main">
                <span class="tk-name">{{ t.name }}<span v-if="t.own" class="own-tag">Kelompok foto ini</span></span>
                <span class="tk-bar"><i :style="{ width: score(t.sim) + '%' }" /></span>
              </span>
              <span class="tk-val num">{{ score(t.sim) }}</span>
            </li>
          </ol>
          <p class="hint">Skor 0–100 dari kemiripan dengan foto yang paling mirip di kelompok itu.</p>
        </section>

        <p v-if="!it.src && !live" class="hint">Foto belum diekspor dari notebook.</p>
        <button class="btn btn-secondary flag" :class="{ on: flagged.has(it.id) }" @click="emit('flag', it.id)">
          <Icon name="flag" :size="16" />{{ flagged.has(it.id) ? 'Ditandai salah kelompok' : 'Tandai salah kelompok' }}
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: fixed; inset: 0; z-index: 60; background: var(--scrim);
  display: grid; place-items: center;
  padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
}
.dialog {
  width: min(1080px, 100%); max-height: 100%;
  display: grid; grid-template-columns: minmax(0, 1fr) 340px;
  background: var(--bg); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow);
}
.dialog:focus { outline: none; }
.stage { position: relative; background: var(--bg-sunken); min-height: 0; }
.big { --ar: 1 / 1; width: 100%; max-height: calc(100dvh - 64px); --photo-bg: transparent; }
.nav {
  position: absolute; top: 50%; translate: 0 -50%;
  width: 40px; height: 40px; border-radius: 999px; border: 1px solid var(--line);
  background: var(--bg); display: grid; place-items: center; color: var(--fg);
}
.prev { left: 12px; }
.next { right: 12px; }

.info { display: flex; flex-direction: column; gap: 4px; padding: 16px 18px 18px; border-left: 1px solid var(--line); overflow-y: auto; }
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding-bottom: 8px; }
.pos { font-size: 15px; font-weight: 650; }
.file { font-size: 12px; color: var(--fg-3); }
.close { width: 34px; height: 34px; border-radius: 8px; border: 0; background: transparent; display: grid; place-items: center; color: var(--fg-2); flex: none; }
.close:hover { background: var(--bg-sunken); }

.block { display: grid; gap: 6px; padding: 14px 0; border-top: 1px solid var(--line); }
.k { font-size: 13.5px; font-weight: 600; color: var(--fg-2); }
.big-num { font-size: 36px; font-weight: 700; letter-spacing: -0.04em; line-height: 1; }
.of { font-size: 15px; font-weight: 500; color: var(--fg-3); letter-spacing: 0; margin-left: 2px; }
.hint { font-size: 13px; color: var(--fg-3); line-height: 1.45; }
.flag-note { font-size: 13px; font-weight: 600; color: var(--warn); }

.topk { list-style: none; margin: 2px 0 0; padding: 0; display: grid; gap: 4px; }
.topk li { display: grid; grid-template-columns: 18px minmax(0, 1fr) 30px; gap: 10px; align-items: center; padding: 7px 8px; border-radius: 8px; }
.topk li.own { background: var(--bg-sunken); }
.rank { font-size: 12.5px; color: var(--fg-3); text-align: right; }
.tk-main { display: grid; gap: 5px; min-width: 0; }
.tk-name { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.own .tk-name { font-weight: 650; }
.own-tag { font-size: 11px; font-weight: 600; color: var(--fg-2); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--line-strong); flex: none; }
.tk-bar { height: 5px; border-radius: 3px; background: var(--bg-muted); overflow: hidden; }
.tk-bar i { display: block; height: 100%; border-radius: 3px; background: var(--line-strong); }
.own .tk-bar i { background: var(--fg); }
.tk-val { font-size: 14px; font-weight: 600; text-align: right; }

.flag { margin-top: 10px; }
.flag.on { border-color: var(--fg); color: var(--fg); background: var(--bg-sunken); }
@media (max-width: 760px) {
  .dialog { grid-template-columns: 1fr; overflow-y: auto; }
  .info { border-left: 0; border-top: 1px solid var(--line); overflow: visible; }
  .big { max-height: 50dvh; }
}
</style>
