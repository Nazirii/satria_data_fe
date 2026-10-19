// Data contoh untuk demo tanpa backend. Semua angka acak di sini deterministik per klaster.

export function rng(seedText) {
  let h = 2166136261
  for (const ch of String(seedText)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Anggota klaster: foto contoh dari naskah dulu, sisanya placeholder dengan skor kemiripan sintetis. */
export function mockItems(cluster) {
  const rand = rng(cluster.id)
  const n = cluster.size
  const samples = cluster.samples || []
  const isNoise = cluster.id === 'noise'
  const sil = typeof cluster.silhouette === 'number' ? Math.max(0, cluster.silhouette) : 0.5
  const hi = 0.8 + 0.08 * Math.min(1, sil / 0.7)
  const lo = cluster.status === 'tinjau' ? 0.4 : 0.55
  const fileBase = 1000 + Math.floor(rand() * 7000)
  const known = samples.filter((s) => typeof s.sim === 'number').map((s) => s.sim)
  const top = known.length ? Math.max(...known) : hi

  const items = []
  for (let i = 0; i < n; i++) {
    const s = samples[i]
    let sim
    if (s && typeof s.sim === 'number') sim = s.sim
    else if (isNoise) sim = 0.42 + rand() * 0.42
    else {
      const t = Math.pow(i / Math.max(1, n - 1), 0.85)
      sim = top - (top - lo) * t - rand() * 0.012
    }
    items.push({
      id: `${cluster.id}-${String(i + 1).padStart(4, '0')}`,
      file: `bdc_${fileBase + i * 7}.jpg`,
      src: s ? s.src : null,
      sim: s && s.sim === null && isNoise ? null : Number(sim.toFixed(3)),
      nearest: s?.nearest,
      margin: s?.margin,
    })
  }
  if (!isNoise) items.sort((a, b) => b.sim - a.sim)
  const edgeFrom = Math.floor(n * 0.85)
  items.forEach((it, i) => { it.rank = i + 1; it.edge = !isNoise && i >= edgeFrom })
  return items
}

/**
 * 5 kelompok paling mirip untuk satu foto (data contoh).
 * Data asli: kolom top5 dari notebook (kemiripan foto ke rata-rata tiap kelompok).
 */
export function mockTop(item, cluster, clusters, k = 5) {
  const rand = rng(item.id)
  const isNoise = cluster.id === 'noise'
  const pool = clusters.filter((c) => c.id !== cluster.id && c.id !== cluster.origin)
  // kelompok sekeluarga lebih mungkin mirip
  const ranked = pool
    .map((c) => ({ c, w: (c.family === cluster.family ? 1 : 0) + rand() * 0.9 }))
    .sort((a, b) => b.w - a.w)
    .map((x) => x.c)
  const out = []
  if (isNoise) {
    const near = item.nearest && clusters.find((c) => c.id === item.nearest)
    const first = near || ranked.shift()
    if (near && ranked.includes(near)) ranked.splice(ranked.indexOf(near), 1)
    let v = typeof item.sim === 'number' ? item.sim : 0.5 + rand() * 0.25
    out.push({ cluster: first.id, sim: v })
    let gap = typeof item.margin === 'number' ? item.margin : 0.01 + rand() * 0.03
    for (const c of ranked.slice(0, k - 1)) { v -= gap; out.push({ cluster: c.id, sim: v }); gap = 0.01 + rand() * 0.04 }
  } else {
    out.push({ cluster: cluster.id, sim: item.sim })
    const review = cluster.status === 'tinjau'
    let v = item.sim - (review ? -0.03 + rand() * 0.06 : item.edge ? 0.01 + rand() * 0.04 : 0.08 + rand() * 0.1)
    for (const c of ranked.slice(0, k - 1)) { out.push({ cluster: c.id, sim: v }); v -= 0.015 + rand() * 0.05 }
  }
  return out.map((o) => ({ ...o, sim: Number(Math.max(0, o.sim).toFixed(3)) })).sort((a, b) => b.sim - a.sim)
}

/* ---------- inferensi tiruan ---------- */

const SCENES = {
  // foto contoh "meja komputer": beberapa barang dalam satu foto
  'k20-2': [
    { bbox: [0.2, 0.0, 0.58, 0.57], status: 'dikenali', cluster: 'K19', score: 0.83 },
    { bbox: [0.28, 0.56, 0.45, 0.3], status: 'dikenali', cluster: 'K21', score: 0.86 },
    { bbox: [0.85, 0.63, 0.12, 0.24], status: 'dikenali', cluster: 'K14', score: 0.71 },
    { bbox: [0.02, 0.57, 0.22, 0.36], status: 'belum', cluster: null, score: 0.44 },
  ],
  'k04-1': [{ bbox: [0.1, 0.14, 0.8, 0.72], status: 'dikenali', cluster: 'K04', score: 0.82 }],
  'k15-1': [{ bbox: [0.04, 0.04, 0.92, 0.92], status: 'dikenali', cluster: 'K15', score: 0.66 }],
}

export function mockInfer(summary, hint) {
  if (hint && SCENES[hint]) return { objects: SCENES[hint].map((o) => ({ ...o })), latency_ms: 140 }
  const rand = rng(hint || String(Date.now()))
  const all = summary?.clusters || []
  const pick = all[Math.floor(rand() * all.length)] || { id: 'K11' }
  const known = rand() < 0.8
  return {
    objects: [{ bbox: [0.12, 0.1, 0.76, 0.8], status: known ? 'dikenali' : 'belum', cluster: known ? pick.id : null, score: known ? 0.8 : 0.42 }],
    latency_ms: 140,
  }
}
