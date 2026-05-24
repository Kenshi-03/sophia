<p align="center">
  <h1 align="center">SOPHIA v0.0</h1>
  <p align="center">
    <strong>Systematic Organization for Personal Higher Information Analysis</strong>
  </p>
  <p align="center">
    Personal Cognitive Operating System · Productivity-first AI Workspace
  </p>
</p>

---

## Tentang SOPHIA

SOPHIA adalah **Personal Cognitive Operating System** — sebuah workspace futuristik yang tenang dan fokus, dirancang untuk membantu pengguna mengorganisasi pikiran, jadwal, dan produktivitas secara cerdas menggunakan AI.

SOPHIA bukan dashboard admin generik atau template SaaS biasa. SOPHIA adalah sistem produktivitas personal berbasis konteks, dengan arsitektur modular dan estetika **calm futuristic dark workspace**.

### Filosofi Desain

- **Productivity-first** — Setiap elemen UI dirancang untuk mengurangi friction dan meningkatkan fokus
- **Calm Futuristic** — Dark mode first, glassmorphism panels, muted borders, premium spacing
- **Modular & Scalable** — Arsitektur komponen yang bisa tumbuh tanpa overengineering
- **AI-Native** — Integrasi Gemini AI sebagai cognitive companion, bukan gimmick

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Styling** | TailwindCSS 4 |
| **UI Components** | shadcn/ui + Radix UI |
| **State Management** | Zustand (persisted stores) |
| **Database** | PostgreSQL + Prisma ORM 7 |
| **Authentication** | NextAuth.js v5 (Google OAuth) |
| **AI Engine** | Google Gemini AI (`@google/generative-ai`) |
| **Calendar** | Google Calendar API (`googleapis`) |
| **Icons** | Lucide React |

---

## Fitur Utama

### 🏠 Dashboard
Pusat overview produktivitas dengan bento-grid layout:
- **Welcome Header** — Sapaan kontekstual berdasarkan waktu
- **Cognitive Load Indicator** — Visualisasi beban kognitif real-time
- **Current Focus Card** — Tugas yang sedang dikerjakan
- **Active Agents Widget** — Status AI agents yang aktif
- **Integrated Schedule Widget** — Jadwal hari ini dari Google Calendar
- **Recent Thoughts Widget** — Memory nodes terbaru

### 📅 Calendar Intelligence
Intelligent productivity calendar terintegrasi Google Calendar:
- **Calendar Timeline** — Visualisasi timeline harian yang detail
- **Weekly View** — Overview mingguan dengan event cards
- **Mini Calendar** — Navigasi kalender kompak
- **Sync Status Panel** — Status real-time sinkronisasi Google Calendar
- **Event Details Modal** — Detail event dengan konteks produktivitas
- **Free Slot Detection** — Identifikasi waktu kosong untuk focus blocks

### 🧠 Memory System
Sistem penyimpanan pikiran dan pengetahuan personal:
- **Memory Cards** — Visualisasi memory nodes
- **Memory Timeline** — Kronologi pikiran dan catatan
- **Semantic Search** — Pencarian bermakna menggunakan AI

### 📝 Notes
Sistem pencatatan terintegrasi:
- **Note Editor** — Editor catatan minimalis
- **Note Cards** — Tampilan catatan dengan kategori
- **Quick Note** — Input cepat untuk menangkap ide

### 🤖 AI Workspace
Multi-agent AI system dengan spesialisasi:
- **AI Chat Box** — Conversational AI interface
- **Agent Selector** — Pilih AI agent berdasarkan konteks tugas
- **AI Command Input** — Input perintah cepat ke AI
- **Recommendation Cards** — Saran produktivitas dari AI
- **AI Orchestration** — Context manager, router, dan response generator

### ⚙️ Settings & Configuration
Control center konfigurasi SOPHIA:
- **General Settings** — Nama, model AI, threshold cognitive load, DND
- **Google Sync Settings** — Konfigurasi sinkronisasi Google Calendar
- **Theme Settings** — Aksen warna tema gelap kustom (Sophia Lavender, Cyber Mint, Steel Blue)
- **System Status** — Diagnostik latensi database, AI API, dan status server

---

## Arsitektur Proyek

```
sophia/
├── app/
│   ├── api/                    # API Routes
│   │   ├── ai/                 # AI endpoints (chat, planner, recommendation)
│   │   ├── calendar/           # Calendar endpoints (sync, today, weekly)
│   │   ├── google/             # Google OAuth callback
│   │   └── memory/             # Memory endpoints (recent, save, search)
│   ├── dashboard/              # Dashboard pages
│   │   ├── ai/                 # AI workspace page
│   │   ├── analytics/          # Analytics page
│   │   ├── calendar/           # Calendar intelligence page
│   │   ├── memory/             # Memory system page
│   │   ├── notes/              # Notes page
│   │   ├── settings/           # Settings & configuration page
│   │   ├── layout.tsx          # Dashboard shell layout
│   │   └── page.tsx            # Main dashboard overview
│   ├── login/                  # Authentication page
│   ├── globals.css             # Global styles & design tokens
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing / redirect
│
├── components/
│   ├── ai/                     # AI workspace components
│   ├── calendar/               # Calendar intelligence components
│   ├── dashboard/              # Dashboard widgets & layout
│   ├── memory/                 # Memory system components
│   ├── notes/                  # Notes components
│   ├── settings/               # Settings panel components
│   ├── shared/                 # Reusable shared components
│   └── ui/                     # shadcn/ui primitives
│
├── lib/
│   ├── ai/                     # AI engine (Gemini, orchestration, prompts)
│   ├── auth/                   # Authentication (NextAuth config, session)
│   ├── constants/              # App constants
│   ├── db/                     # Database (Prisma client)
│   ├── google/                 # Google integration (Calendar, OAuth)
│   └── utils/                  # Utility functions
│
├── stores/                     # Zustand state stores
│   ├── use-ai-store.ts         # AI workspace state
│   ├── use-calendar-store.ts   # Calendar state
│   ├── use-dashboard-store.ts  # Dashboard state
│   ├── use-memory-store.ts     # Memory system state
│   ├── use-settings-store.ts   # Persisted settings state
│   └── use-theme-store.ts      # Theme state
│
├── types/                      # TypeScript type definitions
│   ├── ai.ts
│   ├── api.ts
│   ├── calendar.ts
│   ├── dashboard.ts
│   ├── memory.ts
│   ├── productivity.ts
│   └── user.ts
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Database seeder
│   └── migrations/             # Database migrations
│
├── docs/                       # Project documentation
│   ├── concept.md              # Concept & vision
│   ├── design.md               # Design system specification
│   ├── rules.md                # Development rules
│   ├── stack.md                # Tech stack decisions
│   └── AGENTS.md               # AI agent specifications
│
├── tests/                      # Test files
└── public/                     # Static assets
```

---

## Database Schema

SOPHIA menggunakan PostgreSQL dengan Prisma ORM. Model utama:

| Model | Deskripsi |
|---|---|
| `User` | Profil pengguna dengan relasi ke semua data |
| `Account` | OAuth account (Google) |
| `Session` | Session management |
| `MemoryNode` | Node pikiran/pengetahuan personal |
| `Task` | Tugas dengan status dan deadline |
| `Event` | Kalender events (sync dari Google Calendar) |

---

## Memulai

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** database
- **Google Cloud Console** project dengan:
  - OAuth 2.0 credentials
  - Google Calendar API enabled
  - Generative AI API key (Gemini)

### 1. Clone & Install

```bash
git clone <repository-url>
cd sophia
npm install
```

### 2. Environment Variables

Buat file `.env.local` di root project:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sophia"

# NextAuth
AUTH_SECRET="your-auth-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Gemini AI
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### 5. Build for Production

```bash
npm run build
npm start
```

---

## State Management

SOPHIA menggunakan **Zustand** dengan persistence layer untuk menyimpan preferensi pengguna di Local Storage:

| Store | Key | Deskripsi |
|---|---|---|
| `use-settings-store` | `sophia-settings-v1` | Konfigurasi AI, threshold, tema |
| `use-dashboard-store` | — | State dashboard (server-driven) |
| `use-calendar-store` | — | State kalender dan events |
| `use-ai-store` | — | State AI workspace |
| `use-memory-store` | — | State memory system |
| `use-theme-store` | — | State tema dan aksen warna |

---

## Design Tokens

SOPHIA menggunakan sistem desain konsisten dengan token berikut:

- **Border Radius**: `rounded-2xl` untuk cards utama
- **Glassmorphism**: `bg-white/5 backdrop-blur-xl border border-white/10`
- **Color Palette**: Muted, low-saturation colors pada dark background
- **Spacing**: Premium breathable spacing (`gap-6`, `p-6`)
- **Typography**: Inter font family
- **Accent Colors**: Sophia Lavender (`#c0c1ff`), Cyber Mint (`#4edea3`), Steel Blue (`#adc6ff`)

---

## Scripts

| Command | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan development server (Turbopack) |
| `npm run build` | Build production bundle |
| `npm start` | Menjalankan production server |
| `npm run lint` | Menjalankan ESLint |

---

## Lisensi

Private project. All rights reserved.
