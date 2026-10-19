import { ref, reactive, onBeforeUnmount } from 'vue'

// Simulasi konveyor untuk demo tanpa kamera/backend.
// Barang (foto contoh dari naskah) bergerak kiri → kanan; saat masuk zona deteksi, hasilnya diumumkan.
export const ZONE = { from: 42, to: 58 } // persen lebar panggung

export function useConveyorSim(getSummary, onDetect) {
  const objects = ref([])
  const running = ref(true)
  let seq = 1040
  let raf = 0
  let last = 0
  let spawnIn = 1200
  const SPEED = 7.5 // persen lebar per detik
  const lanes = [24, 44, 64]
  let lane = 0

  function pool() {
    const s = getSummary()
    if (!s) return { known: [], noise: [] }
    const known = []
    for (const c of s.clusters) for (const sm of c.samples || []) known.push({ img: sm.src, cluster: c })
    const noise = (s.noise?.samples || []).map((sm) => ({ img: sm.src }))
    return { known, noise }
  }

  // Hanya dua hasil per barang: dikenali (masuk wadah klasternya) atau belum dikenali (Wadah Periksa).
  function decide(p, force) {
    const unknown = force ? force === 'belum' : Math.random() < 0.12
    if (unknown && p.noise.length) {
      const e = p.noise[Math.floor(Math.random() * p.noise.length)]
      return { img: e.img, status: 'belum', cluster: null }
    }
    const e = p.known[Math.floor(Math.random() * p.known.length)]
    return { img: e.img, status: 'dikenali', cluster: e.cluster.id }
  }

  function spawn(force, x = -12) {
    const p = pool()
    if (!p.known.length) return null
    const res = decide(p, force)
    lane = (lane + 1 + Math.floor(Math.random() * 2)) % lanes.length
    objects.value.push(reactive({
      uid: ++seq,
      n: seq,
      x,
      y: lanes[lane] + (Math.random() * 6 - 3),
      w: 84 + Math.round(Math.random() * 22),
      img: res.img,
      result: res,
      revealed: false,
    }))
    return objects.value[objects.value.length - 1]
  }

  // Isi awal supaya layar langsung menunjukkan konveyor yang sedang berjalan.
  function seed() {
    const plan = [[96, 'dikenali'], [84, 'dikenali'], [72, 'belum'], [60, 'dikenali'], [47, 'dikenali'], [30], [14], [-4]]
    for (const [x, force] of plan) {
      const o = spawn(force, x)
      if (o && x >= ZONE.from) { o.revealed = true; onDetect?.(o) }
    }
  }

  function tick(t) {
    if (!last) last = t
    const dt = Math.min(64, t - last)
    last = t
    if (running.value) {
      spawnIn -= dt
      if (spawnIn <= 0) { spawn(); spawnIn = 1700 + Math.random() * 900 }
      for (const o of objects.value) {
        o.x += (SPEED * dt) / 1000
        if (!o.revealed && o.x >= ZONE.from) { o.revealed = true; onDetect?.(o) }
      }
      objects.value = objects.value.filter((o) => o.x < 112)
    }
    raf = requestAnimationFrame(tick)
  }

  function start() {
    if (!objects.value.length) seed()
    if (!raf) raf = requestAnimationFrame(tick)
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0 }
  onBeforeUnmount(stop)

  return { objects, running, start, stop }
}
