# BLUEPRINT 03: ARSITEKTUR PROGRESSIVE WEB APP (PWA)
## Manifest, Service Worker, Strategi Caching & Ergonomi Tablet Android

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 2)**  
Rujukan Dokumen: `docs/mobile/AUDIT_BASELINE.md` & `02_COMPONENT_ARCHITECTURE.md`

---

## 1. STRUKTUR MANIFEST WEB APP (`manifest.webmanifest`)

PWA dikonfigurasi sebagai aplikasi standalone yang dapat diinstal langsung ke homescreen tablet Samsung Galaxy Tab A7 Lite tanpa bilah navigasi peramban:

```json
{
  "name": "ZLCE Mobile Workbench",
  "short_name": "ZLCE Mobile",
  "description": "Zero-Loss Context Engineering Studio & Relay Workbench untuk Tablet Android",
  "id": "/?source=pwa",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#020617",
  "theme_color": "#0f172a",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Context Builder",
      "short_name": "Context",
      "url": "/?tab=context",
      "icons": [{ "src": "/icons/icon-192x192.png", "sizes": "192x192" }]
    },
    {
      "name": "Command Hub",
      "short_name": "Commands",
      "url": "/?tab=command-hub",
      "icons": [{ "src": "/icons/icon-192x192.png", "sizes": "192x192" }]
    },
    {
      "name": "Linter Status",
      "short_name": "Linter",
      "url": "/?tab=session",
      "icons": [{ "src": "/icons/icon-192x192.png", "sizes": "192x192" }]
    }
  ]
}
```

---

## 2. ARSITEKTUR SERVICE WORKER & SIKLUS HIDUP (LIFECYCLE)

Service Worker (`public/sw.js`) didaftarkan pada entry-point aplikasi (`src/main.tsx`):

```
[ PWA Boot ] ───> Register sw.js
                      │
                      ▼
       ┌──────────────────────────────┐
       │   INSTALL EVENT              │
       │   - Precache App Shell       │
       │     (HTML, CSS, JS Bundles)  │
       │   - Precache Template MD     │
       └──────────────┬───────────────┘
                      │
                      ▼
       ┌──────────────────────────────┐
       │   ACTIVATE EVENT             │
       │   - Clean Old Caches         │
       │   - Claim Active Clients     │
       └──────────────┬───────────────┘
                      │
                      ▼
       ┌──────────────────────────────┐
       │   FETCH EVENT                │
       │   - Cache-First (Assets)     │
       │   - Stale-While-Revalidate   │
       └──────────────────────────────┘
```

---

## 3. STRATEGI CACHING MULTI-LAYER

| Tipe Sumber Daya | Strategi Caching | Penjelasan Teknis |
| :--- | :--- | :--- |
| **App Shell (HTML, CSS, JS)** | **Cache-First (Fallback Network)** | Seluruh bundle aplikasi Vite disimpan di Cache Storage. Saat offline, aplikasi langsung terbuka instan (< 1 detik). |
| **Aset Gambar & Ikon** | **Cache-First (Expiration 30 Hari)** | Ikon statis dan logo ZLCE di-cache jangka panjang. |
| **Katalog Template & Data Statis** | **Stale-While-Revalidate** | Menampilkan template instan dari cache lokal, lalu memperbarui di background jika koneksi tersedia. |
| **State Dokumen & Draft Sesi** | **LocalStorage + IndexedDB** | **Tidak disimpan di Service Worker Cache.** State sesi bersifat transaksional per anggota dan dikelola via hook `useSessionPersistence`. |

---

## 4. ERGONOMI ANTARMUKA TABLET 8.7 INCI (SM-T225)

1. **Target Sentuh Jempol & Jari (48px Rule):**
   - Seluruh elemen yang dapat diklik (tombol status, copy icon, dropdown profil anggota, tab switcher) memiliki tinggi dan lebar minimal **44px hingga 48px**.
   - Spacing visual diperluas dengan padding ekstra untuk mencegah salah ketuk (*fat-finger prevention*).
2. **Virtual Keyboard Handling (Visual Viewport API):**
   - Pada layar 8.7" (resolusi 1340 x 800), keyboard virtual Android memakan sekitar 350 piksel vertikal.
   - PWA menyematkan hook `useVisualViewport`:
     ```typescript
     // Menyesuaikan tinggi kontainer saat software keyboard terbuka
     useEffect(() => {
       const handler = () => {
         const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
         document.documentElement.style.setProperty('--viewport-height', `${height}px`);
       };
       window.visualViewport?.addEventListener('resize', handler);
       return () => window.visualViewport?.removeEventListener('resize', handler);
     }, []);
     ```
   - Bilah tindakan (tombol salin, simpan, navigasi) ditempatkan secara *sticky* di atas batas keyboard virtual.
3. **Indikator Status Offline Real-Time:**
   - Ikon sinyal pada bilah atas menampilkan status:
     - 🟢 *Local / Offline Ready* (Aplikasi siap digunakan offline 100%).
     - 🔵 *Online Sync Ready* (Jaringan terdeteksi untuk git push/pull).
