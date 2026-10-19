# SiPilah · frontend operator

Frontend prototipe untuk naskah *Sistem Cerdas Penemuan dan Pertumbuhan Klaster Visual E-Waste* (Satria Data BDC 2026, SD2026040000434).
Dibangun dengan **Vue 3 + Vite**, tanpa library UI. Ukuran JS awal ±45 KB (gzip).

## Menjalankan

```bash
npm install
npm run dev        # buka http://localhost:5173
npm run build      # hasil statis di dist/ (bisa disajikan FastAPI/nginx atau dibuka lewat `npm run preview`)
```

Butuh Node.js 20.19+ atau 22.12+.

## Halaman

| Rute | Isi |
|---|---|
| `#/` | Beranda: pilih mode kerja (Live kamera / Foto barang) |
| `#/live` | Live kamera: simulasi konveyor; tiap barang **dikenali** (langsung ke wadahnya) atau **belum dikenali** (ke Wadah Periksa). Tombol **Kamera** memakai webcam perangkat |
| `#/foto` | Foto barang: satu foto bisa berisi beberapa barang, hasil per barang + wadahnya |
| `#/klaster` | Kartu klaster: 22 klaster, filter perlu ditinjau / klaster baru / belum terkelompok, cari |
| `#/klaster/K11` | Detail klaster dengan tab **Foto** (galeri + lightbox), **Penanganan**, **Kualitas** (syarat quality gate) |

Istilah di aplikasi:

| Istilah | Arti |
|---|---|
| Dikenali / Belum dikenali | Status satu barang yang lewat kamera atau difoto |
| Wadah Periksa | Wadah fisik untuk barang yang belum dikenali; supervisor mengeceknya |
| Perlu ditinjau | Status **kelompok** (K15, K20) yang gagal satu syarat kualitas. Barangnya tetap dipilah; kelompoknya yang diaudit |
| Klaster baru | Kelompok yang terbentuk sendiri pada uji pertumbuhan (N01–N03) |
| Belum terkelompok | Foto dataset yang tidak masuk kelompok mana pun saat clustering (noise HDBSCAN) |

## Data

Saat ini app membaca **data contoh dari naskah**:

- `public/data/clusters.json`: nama 22 klaster, keluarga, status gate, silhouette, ukuran, profil, dan kartu penanganan.
  Ukuran dan silhouette yang tidak tertulis eksplisit di naskah dibaca dari Gambar 2 dan 5 (ditandai `≈` di UI).
- `public/images/sample/`: 37 foto contoh yang dipotong dari Gambar 4, 6, dan 7 naskah.
- Foto anggota lain tampil sebagai penanda tempat, dengan skor kemiripan sintetis.

### Mengganti dengan hasil model temanmu (SuperGallery)

Data FE dibuat oleh backend dari isi zip SuperGallery (tidak butuh model/torch):

```bash
cd ../sipilah-be
python scripts/export_fe.py                     # tulis public/data/*, thumbnail, cluster_labels.csv, contact sheet
# isi nama/family/bin/hazard/steps di cluster_labels.csv, lalu jalankan sekali lagi
python scripts/tune_threshold.py --check --examples 6   # opsional: foto contoh untuk halaman Foto
```

Setelah itu `npm run build`. Galeri memakai file ekspor bila ada; kalau tidak, kembali ke data contoh.

## Menyambung backend

Backend ada di `../sipilah-be` (FastAPI). Cara paling mudah: `npm run build`, lalu jalankan backend.
Backend menyajikan folder `dist/` di **http://localhost:8000**, jadi FE dan API satu alamat.

Saat `npm run dev` (port 5173), buat `.env.local` berisi `VITE_API_BASE=http://localhost:8000`.

Saat dibuka, FE memanggil `GET /health`. Kalau backend menjawab `ok: true`, Live dan Foto memakai model asli
("Model tersambung" di navigasi). Kalau tidak, semuanya berjalan dalam mode simulasi. Semua panggilan ada di `src/services/api.js`.

| Endpoint | Masukan | Balikan |
|---|---|---|
| `GET /health` | – | `{ ok, encoders, gallery, thresholds, ... }` |
| `POST /infer?source=photo\|live` | multipart, field `image` | `{ objects: [{ bbox, status: "dikenali" \| "belum", cluster, score, margin, reason, top: [{cluster, sim}] }], latency_ms, duplicate }` |
| `POST /feedback` | JSON `{ item_id, cluster, score, source, image? }` | `{ ok: true }` |

Mode kamera tidak mengirim frame terus-menerus. Pemicu kehadiran (`src/composables/presence.js`) membandingkan
kotak tengah dengan latar kosong: ada benda → tunggu diam → kirim 1 potongan kotak → tunggu kotak kosong lagi.
Tambahkan `?debug=1` di alamat halaman Live untuk melihat angka pemicu saat menyetel di lokasi. Tes: `npm test`.

## Struktur

```
src/
  services/api.js        pintu ke data & backend
  services/mock.js       data contoh + inferensi tiruan
  composables/useData.js status data bersama, format angka Indonesia
  composables/useConveyorSim.js  simulasi konveyor
  composables/presence.js  pemicu kamera (1 barang = 1 inferensi)
  components/            AppNav, ClusterCard, PhotoTile, Lightbox, StatusPill, SilMeter, Icon
  views/                 Home, Live, Photo, Clusters, ClusterDetail
tests/presence.test.mjs  tes pemicu kamera
```

Catatan: nama wadah, langkah penanganan, dan tingkat bahaya adalah contoh SOP yang bersifat indikatif. Sesuaikan dengan SOP fasilitas dan isi korpus retrieval tim.
