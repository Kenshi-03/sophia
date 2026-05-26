<p align="center">
  <h1 align="center">SOPHIA</h1>
  <p align="center">
    <strong>Systematic Organization for Personal Higher Information Analysis</strong>
  </p>
  <p align="center">
    Generasi IV · Persistent Personal Cognitive Operating System
  </p>
</p>

---

## Apa Itu SOPHIA

SOPHIA adalah **persistent personal cognitive operating system** — sistem jangka panjang yang mempelajari konteks pengguna dari waktu ke waktu, mengingat apa yang penting, dan membantu melalui penalaran terstruktur alih-alih kebaruan percakapan.

SOPHIA bukan chatbot. Bukan productivity dashboard. Bukan AI wrapper.

SOPHIA adalah infrastruktur untuk kognisi personal: sistem yang mempertahankan memori semantik lintas sesi, memahami hubungan temporal antar aktivitas, dan menyusun respons yang kontekstual dengan mengambil bukti — bukan menebak.

### Apa Artinya dalam Praktik

- Pikiran, keputusan, dan pola Anda bertahan selama berhari-hari, berminggu-minggu, dan berbulan-bulan.
- Konteks disusun dari memori semantik nyata, bukan disuntikkan sebagai template prompt statis.
- Respons AI didasarkan pada bukti yang diambil dengan skor kepercayaan yang dapat dijelaskan.
- Sistem meluruhkan informasi usang secara alami dan mengonsolidasikan pola yang berulang.
- Setiap keputusan retrieval dapat ditelusuri melalui lapisan diagnostik.

---

## Filosofi

SOPHIA dibangun di atas sekumpulan batasan yang disengaja:

**Tenang di atas pintar.** Sistem memprioritaskan kegunaan yang diam-diam efektif. Tidak ada saran yang tidak diminta, tidak ada prediksi perilaku agresif, tidak ada profiling psikologis semu. Jika SOPHIA tidak memiliki cukup konteks, ia mengatakannya.

**Bukti di atas asumsi.** Setiap bagian konteks dalam respons diambil dari memori persisten dengan skor kesamaan yang terukur. Tidak ada insight perilaku yang dihalusinasi, tidak ada model kepribadian yang difabrikasi.

**Ketepatan di atas volume.** SOPHIA sengaja membatasi ukuran prompt. Konteks dialokasikan dengan anggaran — memori semantik, tugas terkait, tren perilaku masing-masing mendapat alokasi proporsional. Konteks kecil yang tepat mengalahkan konteks besar yang berisik.

**Infrastruktur di atas fitur.** Sistem berinvestasi pada kualitas memori, presisi retrieval, dan ketahanan arsitektur sebelum menambahkan kapabilitas baru. Memori yang terindeks dengan baik dengan manajemen decay yang tepat lebih berharga daripada sepuluh fitur permukaan.

**Explainability di atas keajaiban.** Setiap cognitive retrieval dapat diinspeksi: skor kesamaan, penalti decay, penyesuaian diversitas MMR, threshold kepercayaan, dan penyaringan privasi — semua terlihat melalui lapisan diagnostik.

---

## Evolusi Sistem

SOPHIA telah melalui empat generasi arsitektur. Setiap generasi membangun di atas fondasi generasi sebelumnya.

### Generasi I — Fondasi & Workspace

Membangun kerangka dasar. Next.js App Router sebagai fondasi, PostgreSQL dengan Prisma ORM, Google OAuth, integrasi Google Calendar, dan antarmuka AI workspace awal dengan Gemini API. Dashboard bento-grid, sistem catatan, dan navigasi modular. Desain calm futuristic dark workspace.

### Generasi II — Security & Identity Isolation

Menetapkan batas kepercayaan. Isolasi sesi multi-user, enkripsi kredensial AI (AES-256-CBC), database scoping per-user, dan alur onboarding terpandu. Menghapus semua fallback hardcoded dan jalur data mock. Setiap query di-scope ke user yang terautentikasi.

### Generasi III — Stabilitas & Infrastruktur Async

Memperkenalkan ketahanan production-grade. Job queue BullMQ berbasis Redis untuk sinkronisasi kalender, analisis kognitif, dan operasi memori. SWR caching dengan revalidasi latar belakang. Pelacakan biaya AI dengan harga token per-model. Rate limiting IP dan kuota harian per-user. Degradasi graceful saat Redis offline — sistem tetap berjalan secara sinkron tanpa kehilangan data.

### Generasi IV — Kognisi Semantik & Memori Persisten *(saat ini)*

Lapisan kognitif. Pencarian semantik berbasis pgvector dengan pengindeksan HNSW. Embedding Gemini `text-embedding-004` (vektor 768-dimensi). Peluruhan memori eksponensial dengan reinforcement saat diakses ulang. Pipeline konsolidasi episodik-ke-semantik. Profiling perilaku dari pola penggunaan aktual. Maximal Marginal Relevance (MMR) untuk diversitas dalam retrieval. Alokasi anggaran konteks adaptif. Relationship graph engine untuk koneksi lintas entitas. Lapisan diagnostik yang sepenuhnya explainable. Adaptive self-correction untuk mendeteksi kontradiksi dalam refleksi.

---

## Arsitektur Kognitif

Lapisan kognitif SOPHIA beroperasi sebagai pipeline retrieval-and-assembly, bukan mesin penalaran generatif. Sistem tidak "berpikir" — ia mengambil, menilai, menyusun, dan menjelaskan.

### Memori Semantik

Memori di-embed sebagai vektor 768-dimensi menggunakan model Gemini `text-embedding-004`. Setiap node memori membawa:

- **Embedding vektor** yang disimpan di PostgreSQL via pgvector
- **Content hash** (SHA-256) untuk deduplikasi — konten identik menggunakan ulang vektor yang sudah ada
- **Skor importance** yang tunduk pada peluruhan temporal eksponensial
- **Level privasi** yang diterapkan saat retrieval
- **Relasi semantik** ke memori lain, tugas, dan event

Pencarian vektor menggunakan **cosine distance operator** (`<=>`) di atas **HNSW index** (`vector_cosine_ops`), memberikan retrieval sub-linear dengan recall tinggi.

### Siklus Hidup Memori

```
Input → Embedding → Penyimpanan → Peluruhan → Reinforcement → Konsolidasi → Arsip
```

- **Peluruhan (Decay)**: Importance mengikuti `base × e^(−λ × hari)`. Memori yang tidak pernah diakses ulang secara alami memudar.
- **Reinforcement**: Saat sebuah memori cocok selama retrieval, importance-nya di-boost, memperpanjang masa aktifnya.
- **Konsolidasi**: Memori episodik yang lebih dari 7 hari dirangkum menjadi node semantik tingkat tinggi oleh AI gateway. Memori sumber kemudian di-degrade untuk mengurangi noise penyimpanan.
- **Sweep**: Memori di bawah threshold importance minimum dibersihkan secara otomatis.

### Penyusunan Konteks

Saat SOPHIA menyiapkan respons, ia tidak membuang semua informasi yang tersedia ke dalam prompt. Prosesnya:

1. **Retrieval semantik** — Query di-embed dan dicocokkan terhadap indeks vektor
2. **Seleksi diversitas MMR** — Hasil redundan dikenai penalti untuk memaksimalkan cakupan informasi
3. **Alokasi anggaran** — Item yang diambil didistribusikan antar kategori:
   - 50% memori semantik
   - 30% tugas dan event terkait
   - 20% tren kognitif dan perilaku
4. **Scoring kepercayaan** — Setiap item membawa skor kesamaan dan importance yang disesuaikan decay
5. **Penyaringan privasi** — Node terbatas dikecualikan berdasarkan scope sesi

Hasilnya adalah context window yang kompak dan didukung bukti — bukan prompt dump.

### Relationship Graph

Sparse graph engine menghubungkan memori ke tugas, event, dan memori lainnya. Relasi di bawah threshold kekuatan 0.3 secara otomatis dibuang. Graph mendukung traversal query untuk penemuan entitas terkait dan digunakan selama penyusunan konteks untuk memunculkan informasi yang terhubung.

### Profiling Perilaku

Profil kognitif disintesis dari pola penggunaan aktual — durasi fokus, indikator stres, periode pemulihan. Ini dihitung sebagai background job dari data nyata, bukan disimpulkan dari nada percakapan. Sistem tidak melakukan psikoanalisis; ia mengamati dan merangkum.

### Adaptive Self-Correction

Sistem mendeteksi kontradiksi antara pola perilaku terbaru dan refleksi yang lebih lama, kemudian merevisi prioritas atau kebiasaan yang sudah usang. Koreksi dijalankan sebagai background job dan hasilnya dapat diaudit.

### Diagnostik Explainable

Setiap keputusan retrieval dapat ditelusuri:

| Sinyal | Yang Diukur |
|---|---|
| Skor kesamaan | Jarak cosine antara vektor query dan memori |
| Penalti decay | Degradasi importance berbasis waktu |
| Penyesuaian MMR | Penalti redundansi untuk diversitas |
| Threshold kepercayaan | Skor minimum untuk inklusi dalam konteks |
| Filter privasi | Penegakan scope visibilitas |
| Alokasi anggaran | Distribusi token per kategori |

Endpoint diagnostik mengekspos trace retrieval lengkap untuk inspeksi developer.

---

## Infrastruktur Produksi

### Pemrosesan Job Async

Operasi latar belakang berjalan melalui queue BullMQ berbasis Redis, di luar siklus request Next.js:

| Queue | Operasi |
|---|---|
| `calendarSync` | Sinkronisasi Google Calendar |
| `cognitiveAnalysis` | Pembuatan briefing, pembaruan profil |
| `memory` | Pembuatan embedding, re-indexing, konsolidasi, self-correction |

Job menggunakan ID deterministik (`sync:{userId}`, `briefing:{userId}:{hourStamp}`) untuk eksekusi idempoten. Job yang gagal disimpan di dead-letter queue untuk diagnostik.

### Caching & Ketahanan

- **Pola SWR**: Data stale disajikan segera sementara revalidasi latar belakang berjalan
- **Invalidasi cache**: Mutasi pada event, memori, dan tugas memicu pembersihan cache yang ditargetkan
- **Degradasi Redis**: Saat Redis tidak tersedia, sistem jatuh kembali ke eksekusi sinkron tanpa kehilangan fungsionalitas

### Manajemen Biaya AI

- Penggunaan token dilacak per-request dengan harga model-specific dari konfigurasi yang dieksternalisasi
- Agregasi biaya harian dengan threshold pengeluaran yang dapat dikonfigurasi
- Peringatan penggunaan saat biaya terakumulasi melebihi batas
- Penegakan kuota per-user via counter berbasis Redis

### Keamanan

- **Isolasi sesi**: Semua query database di-scope ke ID user yang terautentikasi
- **Enkripsi kredensial**: API key AI milik user dienkripsi dengan AES-256-CBC sebelum penyimpanan
- **Rate limiting**: Rate limiting IP di edge-runtime (100 req/menit) dan kuota AI harian per-user
- **Tanpa kebocoran kredensial**: API key di-mask di semua respons yang menghadap frontend

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Bahasa | TypeScript 5 (strict mode) |
| Styling | TailwindCSS 4 |
| Komponen UI | shadcn/ui + Radix UI |
| State | Zustand (persisted stores) |
| Database | PostgreSQL + Prisma ORM 7 |
| Pencarian Vektor | pgvector + HNSW indexing |
| Embedding | Gemini `text-embedding-004` (768-dim) |
| AI Gateway | Google Gemini API |
| Autentikasi | NextAuth.js v5 (Google OAuth) |
| Queue | BullMQ + Redis (ioredis) |
| Cache | Redis SWR layer |
| Kalender | Google Calendar API |
| Enkripsi | AES-256-CBC (node:crypto) |

---

## Struktur Proyek

```
sophia/
├── app/
│   ├── api/
│   │   ├── admin/              # Diagnostik & monitoring queue
│   │   ├── ai/                 # AI gateway, cognitive briefing, health
│   │   ├── calendar/           # Sinkronisasi kalender, endpoint harian/mingguan
│   │   ├── google/             # Google OAuth callback
│   │   ├── memory/             # CRUD memori, pencarian, embedding
│   │   └── settings/           # Manajemen pengaturan user
│   ├── dashboard/              # Halaman dashboard (overview, AI, kalender, memori, catatan, pengaturan)
│   ├── login/                  # Autentikasi
│   └── setup/                  # Alur onboarding pertama kali
│
├── components/
│   ├── ai/                     # Komponen workspace AI
│   ├── calendar/               # Komponen kalender cerdas
│   ├── dashboard/              # Widget & layout dashboard
│   ├── memory/                 # Komponen sistem memori
│   ├── notes/                  # Komponen catatan
│   ├── settings/               # Komponen panel pengaturan
│   ├── shared/                 # Komponen shared yang reusable
│   └── ui/                     # Primitif shadcn/ui
│
├── lib/
│   ├── ai/
│   │   ├── memory/             # Mesin memori semantik
│   │   │   ├── embedding.ts    # Pipeline embedding vektor
│   │   │   ├── similarity.ts   # Pencarian cosine distance
│   │   │   ├── decay-manager.ts # Peluruhan temporal & reinforcement
│   │   │   ├── retrieve-memory.ts # Penyusunan konteks & MMR
│   │   │   ├── relationship-engine.ts # Traversal sparse graph
│   │   │   └── diagnostics.ts  # Trace retrieval explainable
│   │   ├── gateway/            # Gateway model AI
│   │   ├── orchestration/      # Routing & koordinasi request
│   │   ├── cognitive/          # Modul analisis kognitif
│   │   ├── context/            # Utilitas pembangunan konteks
│   │   ├── config/             # Harga model, konfigurasi sistem
│   │   └── cost-tracker.ts     # Pelacakan penggunaan token & biaya
│   ├── auth/                   # Konfigurasi NextAuth, helper sesi
│   ├── cache/                  # Manajer cache SWR
│   ├── queue/                  # Client & worker BullMQ
│   ├── security/               # Enkripsi, rate limiting
│   ├── google/                 # Google Calendar & client OAuth
│   ├── redis.ts                # Wrapper koneksi Redis
│   └── logger.ts               # Logging JSON terstruktur
│
├── stores/                     # Zustand state stores
├── types/                      # Definisi tipe TypeScript
├── prisma/                     # Schema, migrasi, seed
├── tests/                      # Tes unit & integrasi
└── docs/                       # Dokumentasi arsitektur
```

---

## Model Database

| Model | Fungsi |
|---|---|
| `User` | Identitas user dengan relasi ke semua data yang di-scope |
| `Account` | Akun provider OAuth (Google) |
| `Session` | Manajemen sesi terautentikasi |
| `UserSettings` | Konfigurasi per-user, kredensial AI terenkripsi, status onboarding |
| `MemoryNode` | Node pikiran dan pengetahuan persisten |
| `MemoryEmbedding` | Embedding vektor 768-dim dengan deduplikasi content hash |
| `MemoryRelation` | Edge berbobot dalam relationship graph semantik |
| `CognitiveProfile` | Pola perilaku yang disintesis (fokus, stres, pemulihan) |
| `DailyCognitiveState` | Snapshot state kognitif harian |
| `Task` | Tugas dengan status, prioritas, dan pelacakan deadline |
| `Event` | Event kalender (disinkronkan dari Google Calendar, di-scope per user) |
| `AiUsage` | Catatan penggunaan token dan biaya per-request |

---

## Memulai

### Prasyarat

- Node.js 20+
- PostgreSQL dengan ekstensi pgvector
- Redis (opsional — sistem melakukan degradasi graceful tanpanya)
- Proyek Google Cloud dengan:
  - Kredensial OAuth 2.0
  - Google Calendar API diaktifkan
  - API key Gemini

### Instalasi

```bash
# Clone dan install
git clone <repository-url>
cd sophia
npm install

# Konfigurasi environment
cp .env.example .env.local
# Edit .env.local dengan kredensial Anda

# Database
npx prisma generate
npx prisma migrate dev

# Jalankan
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sophia"

# Autentikasi
AUTH_SECRET="your-auth-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI
GEMINI_API_KEY="your-gemini-api-key"

# Keamanan
ENCRYPTION_SECRET="your-encryption-secret"

# Infrastruktur (opsional)
REDIS_URL="redis://localhost:6379"
AI_DAILY_COST_LIMIT="5.00"
```

### Script

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Build produksi |
| `npm start` | Server produksi |
| `npm run lint` | ESLint |

---

## Filosofi Desain

Antarmuka SOPHIA mengikuti estetika **calm futuristic** — dark-first, panel glassmorfik, palet warna muted, dan spacing premium. Desainnya sengaja ditahan.

- **Palet**: Background deep slate (`#111316`), primer lavender lembut (`#c0c1ff`), aksen mint (`#4edea3`), tersier steel blue (`#adc6ff`)
- **Tipografi**: Inter untuk keterbacaan, Geist Mono untuk metrik sistem
- **Permukaan**: Panel glassmorfik dengan `backdrop-blur` dan pinggiran `border-white/10` yang halus
- **Interaksi**: Animasi minimal — hover state dan transisi hanya di tempat yang mengurangi gesekan kognitif

Antarmuka harus terasa seperti workspace yang tenang, bukan pusat notifikasi.

---

## Arah Masa Depan — Generasi V

Generasi selanjutnya dari evolusi SOPHIA berfokus pada **cognitive orchestration** — bergerak dari retrieval pasif menuju penalaran multi-langkah yang terstruktur sambil mempertahankan batasan yang sama seputar bukti, explainability, dan UX yang tenang.

Area yang sedang dipertimbangkan:

- **Pengenalan pola temporal** — Mengidentifikasi siklus perilaku yang berulang lintas minggu dan bulan
- **Proactive context surfacing** — Menyajikan memori yang relevan sebelum pengguna bertanya, berdasarkan kedekatan jadwal dan kesamaan semantik dengan aktivitas saat ini
- **Kontinuitas lintas sesi** — Melanjutkan konteks kognitif lintas sesi tanpa memerlukan re-orientasi eksplisit
- **Visualisasi graph memori** — Eksplorasi interaktif dari relationship graph semantik
- **Metrik kualitas konsolidasi** — Mengukur kehilangan informasi selama kompresi episodik-ke-semantik

Semua ini tetap tunduk pada filosofi yang sama: tidak ada fitur yang dirilis kecuali didasarkan pada data nyata, dapat dijelaskan dalam penalarannya, dan stabil di produksi.

---

## Tradeoff & Batasan

Keputusan yang membentuk apa SOPHIA itu — dan apa yang sengaja bukan:

| Keputusan | Alasan |
|---|---|
| AI non-agentic | Agent tidak mengambil tindakan otonom. Pengguna tetap memegang kendali. |
| Konteks dengan batasan anggaran | Prompt kecil yang tepat di atas prompt besar yang berisik. Mengurangi biaya dan halusinasi. |
| Peluruhan eksponensial di atas pembersihan manual | Memori usang memudar secara alami. Pengguna tidak mengelola kebersihan memori. |
| Fallback sinkron | Kegagalan Redis tidak merusak sistem. Fitur terdegradasi, bukan crash. |
| Tanpa simulasi kepribadian | SOPHIA tidak berpura-pura memiliki emosi atau opini. Ia mengambil dan melaporkan. |
| Kredensial user terenkripsi | API key milik user dienkripsi saat diam. Sistem tidak pernah mengeksposnya. |
| HNSW di atas pencarian eksak | Approximate nearest neighbor untuk kecepatan di skala. Tradeoff recall yang dapat diterima. |
| MMR di atas top-k | Diversitas dalam retrieval mencegah konteks redundan. Sedikit lebih banyak komputasi, cakupan yang jauh lebih baik. |

---

## Lisensi

Proyek privat. Seluruh hak dilindungi.
