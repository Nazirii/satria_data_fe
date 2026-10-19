import { ref, computed } from 'vue'
import { loadSummary } from '../services/api.js'

// Satu salinan data untuk seluruh app.
const summary = ref(null)
const error = ref('')
let started = false

export function useData() {
  if (!started) {
    started = true
    loadSummary()
      .then((d) => { summary.value = d })
      .catch((e) => { error.value = e.message })
  }

  const families = computed(() => Object.fromEntries((summary.value?.families || []).map((f) => [f.id, f])))
  const bins = computed(() => Object.fromEntries((summary.value?.bins || []).map((b) => [b.id, b])))

  /** Semua entri yang punya galeri: 22 klaster, 3 klaster baru, dan foto belum terkelompok. */
  const all = computed(() => {
    const s = summary.value
    if (!s) return []
    return [...s.clusters, ...(s.born || []), ...(s.noise ? [s.noise] : [])]
  })

  function byId(id) {
    return all.value.find((c) => c.id === id) || null
  }

  return { summary, error, families, bins, all, byId }
}

export const fmt = {
  int: (n) => (typeof n === 'number' ? n.toLocaleString('id-ID') : '—'),
  dec: (n, d = 3) => (typeof n === 'number' ? n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'),
  pct: (n, d = 1) => (typeof n === 'number' ? `${n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d })}%` : '—'),
}

export const STATUS = {
  lolos: { label: 'Lolos uji', tone: 'ok' },
  tinjau: { label: 'Perlu ditinjau', tone: 'warn' },
  baru: { label: 'Klaster baru', tone: 'new' },
  karantina: { label: 'Belum terkelompok', tone: 'idle' },
  dikenali: { label: 'Dikenali', tone: 'ok' },
  belum: { label: 'Belum dikenali', tone: 'idle' },
}

export const HAZARD = {
  tinggi: { label: 'Bahaya tinggi', tone: 'danger' },
  sedang: { label: 'Bahaya sedang', tone: 'warn' },
  rendah: { label: 'Bahaya rendah', tone: 'idle' },
}
