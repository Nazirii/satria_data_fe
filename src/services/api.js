// Satu-satunya pintu ke data & backend. Ganti isi fungsi di sini kalau kontrak backend berubah.
import { reactive } from 'vue'
import { mockItems, mockInfer } from './mock.js'

// Kosong = backend di alamat yang sama (FE disajikan oleh FastAPI). Saat `npm run dev`, isi
// VITE_API_BASE=http://localhost:8000 di .env.local.
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

/** Status sambungan backend. status: 'cek' | 'asli' | 'simulasi'. */
export const backend = reactive({ status: 'cek', info: null, reason: '' })
let checking = null

/** Cek /health sekali saat app dibuka. Gagal atau ok:false → mode simulasi. */
export function connectBackend() {
  if (checking) return checking
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2500)
  checking = fetch(`${API_BASE}/health`, { signal: ctrl.signal })
    .then(async (r) => {
      const type = r.headers.get('content-type') || ''
      if (!r.ok || !type.includes('json')) throw new Error('backend tidak ditemukan')
      const info = await r.json()
      if (!info.ok) throw new Error(info.error || 'model belum siap')
      Object.assign(backend, { status: 'asli', info, reason: '' })
    })
    .catch((e) => Object.assign(backend, { status: 'simulasi', info: null, reason: e.name === 'AbortError' ? 'backend tidak menjawab' : e.message }))
    .finally(() => clearTimeout(timer))
  return checking
}

const isLive = () => backend.status === 'asli'

let summaryPromise = null

/** Ringkasan memori klaster: public/data/clusters.json (dibuat oleh sipilah-be/scripts/export_fe.py). */
export function loadSummary() {
  if (!summaryPromise) {
    summaryPromise = fetch('data/clusters.json').then((r) => {
      if (!r.ok) throw new Error(`data/clusters.json tidak terbaca (HTTP ${r.status})`)
      return r.json()
    })
  }
  return summaryPromise
}

/** Foto contoh untuk halaman Foto: public/data/examples.json (dibuat oleh tune_threshold.py --examples). */
export async function loadExamples() {
  try {
    const r = await fetch('data/examples.json')
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) return await r.json()
  } catch { /* pakai contoh bawaan */ }
  return null
}

/**
 * Daftar foto anggota satu klaster: public/data/clusters/<ID>.json → { items: [...] }.
 * Kalau file belum diekspor, galeri memakai data contoh (foto dari naskah + placeholder).
 */
export async function loadItems(cluster) {
  try {
    const r = await fetch(`data/clusters/${cluster.id}.json`)
    const type = r.headers.get('content-type') || ''
    if (r.ok && type.includes('json')) {
      const data = await r.json()
      return { items: data.items || [], source: 'ekspor' }
    }
  } catch { /* jatuh ke data contoh */ }
  return { items: mockItems(cluster), source: 'contoh' }
}

/**
 * Inferensi satu gambar (foto unggahan atau frame kamera).
 * POST {API_BASE}/infer?source=photo|live, multipart field "image".
 * Balikan: { objects: [{ bbox:[x,y,w,h] (0–1), status:'dikenali'|'belum', cluster:'K06'|null, score,
 *            margin, reason:'low_score'|'ambiguous'|null, top:[{cluster, sim}] }], latency_ms, duplicate }
 */
export async function inferImage(blob, { summary, hint, source = 'photo' } = {}) {
  if (!isLive()) return { ...mockInfer(summary, hint), simulated: true }
  const body = new FormData()
  body.append('image', blob, 'frame.jpg')
  const r = await fetch(`${API_BASE}/infer?source=${source}`, { method: 'POST', body })
  if (!r.ok) {
    let msg = `HTTP ${r.status}`
    try { msg = (await r.json()).detail || msg } catch { /* biarkan */ }
    throw new Error(`Backend menolak gambar (${msg})`)
  }
  return { ...(await r.json()), simulated: false }
}

/** Kirim tanda "salah kelompok" dari operator. image = thumbnail data URL (opsional). */
export async function sendFeedback(payload) {
  if (!isLive()) return { ok: true, simulated: true }
  try {
    const r = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return { ok: r.ok, simulated: false }
  } catch {
    return { ok: false, simulated: false }
  }
}
