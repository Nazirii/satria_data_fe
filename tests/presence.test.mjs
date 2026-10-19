import test from 'node:test'
import assert from 'node:assert/strict'
import { createPresence, measure, PRESENCE } from '../src/composables/presence.js'

// 3 barang: kosong → masuk (gerak) → diam → diangkat
function scenario() {
  const seq = []
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 6; i++) seq.push({ fg: 0.005, motion: 0.5 })
    for (let i = 0; i < 4; i++) seq.push({ fg: 0.3, motion: 12 })
    for (let i = 0; i < 6; i++) seq.push({ fg: 0.3, motion: 1 })
    for (let i = 0; i < 8; i++) seq.push({ fg: 0.004, motion: 1 })
  }
  return seq
}

test('satu jepretan per barang', () => {
  const m = createPresence(); m.calibrated()
  let t = 0, shots = 0
  for (const x of scenario()) {
    t += PRESENCE.tickMs
    if (m.step(x, t) === 'capture') { shots++; m.done() }
  }
  assert.equal(shots, 3)
  assert.equal(m.state, 'kosong')
})

test('benda tidak diam tetap dijepret setelah batas waktu', () => {
  const m = createPresence(); m.calibrated()
  let t = 0, shots = 0
  for (let i = 0; i < 40; i++) { t += PRESENCE.tickMs; if (m.step({ fg: 0.4, motion: 20 }, t) === 'capture') { shots++; m.done() } }
  assert.equal(shots, 1)  // tetap 1 karena zona tidak pernah kosong
})

test('kedipan singkat tidak memicu', () => {
  const m = createPresence(); m.calibrated()
  let t = 0, shots = 0
  const seq = [0.3, 0.3, 0.01, 0.3, 0.01, 0.01, 0.3, 0.3, 0.01]
  for (const fg of seq) { t += PRESENCE.tickMs; if (m.step({ fg, motion: 1 }, t) === 'capture') shots++ }
  assert.equal(shots, 0)
})

test('measure', () => {
  const bg = new Float32Array(100).fill(100)
  const g = new Float32Array(100).fill(100); for (let i = 0; i < 25; i++) g[i] = 200
  const r = measure(g, bg, bg)
  assert.equal(r.fg, 0.25)
  assert.equal(r.motion, 25)
})
