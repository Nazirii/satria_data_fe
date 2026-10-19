// Pemicu kehadiran untuk mode kamera: cara kerjanya seperti sensor di jalur sortir.
// Zona tengah dibandingkan dengan latar kosong. Ada benda → tunggu diam → jepret 1 kali →
// tunggu zona kosong lagi. Jadi 1 barang = 1 inferensi, tanpa perlu detektor/tracking.
import { ref, onBeforeUnmount } from 'vue'

export const PRESENCE = {
  w: 96, h: 64,          // resolusi kecil untuk perbandingan
  tickMs: 120,
  diff: 28,              // beda piksel (0–255) yang dihitung "berubah"
  on: 0.06,              // porsi piksel berubah → ada benda
  off: 0.025,            // di bawah ini → zona kosong
  onTicks: 3,
  offTicks: 5,
  still: 3.5,            // gerak rata-rata di bawah ini → benda diam
  stillTicks: 2,
  armTimeout: 1400,      // kalau benda tidak kunjung diam, jepret juga
  calibTicks: 8,         // jumlah frame untuk merekam latar
  adapt: 0.03,           // latar menyesuaikan cahaya pelan-pelan saat kosong
}

/** Ukur porsi piksel yang beda dari latar (fg) dan gerak antar-frame (motion). */
export function measure(gray, bg, prev, cfg = PRESENCE) {
  let changed = 0
  let motion = 0
  for (let i = 0; i < gray.length; i++) {
    if (Math.abs(gray[i] - bg[i]) > cfg.diff) changed++
    if (prev) motion += Math.abs(gray[i] - prev[i])
  }
  return { fg: changed / gray.length, motion: prev ? motion / gray.length : 0 }
}

/**
 * Mesin keadaan murni (bisa dites tanpa browser).
 * state: kalibrasi → kosong → ada → mengenali → menunggu-angkat → kosong ...
 * step() mengembalikan 'capture' saat waktunya menjepret.
 */
export function createPresence(cfg = PRESENCE) {
  const s = { state: 'kalibrasi', count: 0, still: 0, armedAt: 0 }
  return {
    get state() { return s.state },
    calibrated() { Object.assign(s, { state: 'kosong', count: 0, still: 0 }) },
    recalibrate() { Object.assign(s, { state: 'kalibrasi', count: 0, still: 0 }) },
    step({ fg, motion }, now) {
      if (s.state === 'kosong') {
        s.count = fg >= cfg.on ? s.count + 1 : 0
        if (s.count >= cfg.onTicks) Object.assign(s, { state: 'ada', count: 0, still: 0, armedAt: now })
      } else if (s.state === 'ada') {
        if (fg < cfg.off) { Object.assign(s, { state: 'kosong', count: 0 }); return null }
        s.still = motion < cfg.still ? s.still + 1 : 0
        if (s.still >= cfg.stillTicks || now - s.armedAt >= cfg.armTimeout) {
          s.state = 'mengenali'
          return 'capture'
        }
      } else if (s.state === 'menunggu') {
        s.count = fg < cfg.off ? s.count + 1 : 0
        if (s.count >= cfg.offTicks) Object.assign(s, { state: 'kosong', count: 0 })
      }
      return null
    },
    /** Panggil setelah hasil inferensi diterima (atau gagal). */
    done() { Object.assign(s, { state: 'menunggu', count: 0 }) },
  }
}

/**
 * Pasang pemicu ke elemen <video>. zone = {x, y, w, h} relatif 0–1 terhadap frame video.
 * onCapture(blob, zone) dipanggil sekali per barang, harus mengembalikan Promise.
 */
export function usePresence(videoRef, zone, onCapture, cfg = PRESENCE) {
  const machine = createPresence(cfg)
  const state = ref(machine.state)
  const metrics = ref({ fg: 0, motion: 0 })
  const canvas = document.createElement('canvas')
  canvas.width = cfg.w
  canvas.height = cfg.h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let bg = null
  let prev = null
  let calib = []
  let timer = 0

  function grab() {
    const v = videoRef.value
    if (!v || !v.videoWidth) return null
    const sx = zone.x * v.videoWidth
    const sy = zone.y * v.videoHeight
    ctx.drawImage(v, sx, sy, zone.w * v.videoWidth, zone.h * v.videoHeight, 0, 0, cfg.w, cfg.h)
    const d = ctx.getImageData(0, 0, cfg.w, cfg.h).data
    const g = new Float32Array(cfg.w * cfg.h)
    for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    return g
  }

  async function capture() {
    const v = videoRef.value
    const c = document.createElement('canvas')
    const zw = zone.w * v.videoWidth
    const zh = zone.h * v.videoHeight
    const scale = Math.min(1, 960 / Math.max(zw, zh))
    c.width = Math.round(zw * scale)
    c.height = Math.round(zh * scale)
    c.getContext('2d').drawImage(v, zone.x * v.videoWidth, zone.y * v.videoHeight, zw, zh, 0, 0, c.width, c.height)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9))
    try { await onCapture(blob, c) } finally { machine.done(); state.value = machine.state }
  }

  function tick() {
    const g = grab()
    if (!g) return
    if (machine.state === 'kalibrasi') {
      calib.push(g)
      if (calib.length >= cfg.calibTicks) {
        bg = new Float32Array(g.length)
        for (const f of calib) for (let i = 0; i < g.length; i++) bg[i] += f[i] / calib.length
        calib = []
        machine.calibrated()
      }
    } else {
      const m = measure(g, bg, prev, cfg)
      metrics.value = m
      if (machine.state === 'kosong' && m.fg < cfg.off) {
        for (let i = 0; i < g.length; i++) bg[i] += cfg.adapt * (g[i] - bg[i])
      }
      if (machine.step(m, performance.now()) === 'capture') capture()
    }
    prev = g
    state.value = machine.state
  }

  function start() { stop(); timer = window.setInterval(tick, cfg.tickMs) }
  function stop() { window.clearInterval(timer); timer = 0 }
  /** Rekam ulang latar. Kosongkan zona dulu. */
  function resetBackground() {
    calib = []; prev = null; bg = null
    machine.recalibrate()
    state.value = machine.state
  }
  onBeforeUnmount(stop)

  return { state, metrics, start, stop, resetBackground }
}
