# PANDUAN EKSEKUSI HANDOVER MULTI-AI (UNIVERSAL RELAY GENERATOR)
## ZLCE Mobile Workbench v4.0.0 — Zero-Loss Context Engineering

Dokumen ini menjelaskan arsitektur dan tata cara serah terima estafet (**Universal Multi-AI Relay Handover**) untuk memindahkan pengerjaan **task berapapun** (TASK-001 s/d TASK-043+) ke peramban AI luar (**Anthropic Claude, ChatGPT, Cursor, GitHub Copilot, Google Gemini, atau DeepSeek**) tanpa kehilangan satu bit konteks pun (*Zero-Loss Context Engineering*).

---

## 1. MENGAPA GENERATOR ESTAFET BEKERJA UNTUK SEMUA TASK?

Sesuai **Blueprint 14 (Multi-AI Team Model)**, kolaborasi tim estafet ditegakkan oleh 5 Invarian Matematika & Logika:
1. **Invarian I1 (All in Files):** Sumber kebenaran tunggal adalah berkas Markdown (`SESSION_STATE.md`, `TASKS.md`, `BLUEPRINT.md`) dan kode repositori.
2. **Invarian I2 (Cold-Start Resume):** Model AI baru dapat memulai giliran kerja dari nol tanpa memerlukan riwayat memori obrolan sebelumnya.
3. **Invarian I3 (ZLCE Core Invariance):** Aturan 4 Gerbang Kualitas, WAL, dan larangan placeholder berlaku universal.
4. **Invarian I4 (Strict Provenance Tracking):** Setiap perubahan wajib mencantumkan atribut `[Aktor, AI/Model, Akun Alias, Timestamp, Task ID]`.
5. **Invarian I5 (Zero Lost Updates):** Branch per Task (`task/TASK-xxx`) mencegah konflik tim.

Karena seluruh spesifikasi 43 task tersimpan di `TASKS.md`, sistem **Generator Estafet ZLCE Studio** secara dinamis merakit:
- Judul, fase, dependensi, dan acceptance criteria persis untuk task yang dipilih.
- Target berkas sumber yang harus dibuat atau dimodifikasi.
- Aturan anti-placeholder mutlak (`NO // ... rest of code`).
- Target sentuh ergonomis tablet minimal 44x44px (`min-h-[44px]`).
- Stop token khusus model (Claude, ChatGPT, Cursor, Copilot, Gemini, DeepSeek).

---

## 2. CARA MENGGUNAKAN GENERATOR ESTAFET DI APLIKASI

1. **Buka Tab "Panduan & Skenario" atau "Paket Konteks":**
   - Di sub-tampilan **Generator Estafet AI** (ikon Petir/Zap), sistem otomatis memilih task yang sedang berstatus `READY` (misalnya `TASK-017`).
2. **Pilih Task Mana Saja:**
   - Gunakan dropdown pemilih task untuk memilih task berapapun dari backlog (TASK-001 s/d TASK-043).
   - Filter berdasarkan fase (Fase 3, Fase 4, Fase 5, dll.) atau gunakan kotak pencarian.
3. **Pilih Target Model AI:**
   - Tersedia tombol cepat untuk **Claude 3.5 Sonnet**, **ChatGPT (GPT-4o)**, **Cursor AI**, **GitHub Copilot**, **Gemini**, atau **DeepSeek**.
4. **Pilih Tablet Driver (8 Anggota Estafet):**
   - Eko, Oned, Cxperia, Sulistiyani, Layang, Acimau, Kepek, atau Gete.
5. **Salin Prompt / Unduh Berkas:**
   - Klik **"Salin Seluruh Prompt [TASK-ID]"** untuk 1-ketukan salin.
   - Atau klik **"Unduh .md"** untuk menyimpan berkas `ESTAFET_[TASK-ID]_[AI].md`.

---

## 3. PROSEDUR 5 LANGKAH EKSEKUSI DI AI LUAR

1. **Langkah 1: Unduh Bundle Berkas ZLCE (.zip)**
   - Unduh `zlce-claude-chatgpt-bundle.zip` (berisi 20 berkas status & kontrol acuan).
2. **Langkah 2: Buka Peramban AI di Tablet**
   - Buka `claude.ai`, `chatgpt.com`, `cursor.com`, atau `github.com/copilot` dalam jendela obrolan baru bersih (*cold-start*).
3. **Langkah 3: Lampirkan Berkas Konteks**
   - Unggah berkas ZIP atau lampirkan `SESSION_STATE.md` dan `TASKS.md`.
4. **Langkah 4: Tempelkan Prompt Mandat dari Generator Estafet**
   - Tempelkan teks prompt yang telah digenerate dari Generator Estafet ZLCE Studio.
5. **Langkah 5: Verifikasi di Termux & Capture Hasil**
   - Salin keluaran solusi kode ke aplikasi ZLCE Studio pada menu **Result Capture**.
   - Result Capture akan otomatis menginjeksi banner provenance (Invarian I4) dan mengalirkan status ke draft `SESSION_STATE.md` (WAL & Log Audit).
   - Jalankan verifikasi di Termux:
     ```bash
     npm run build && python3 scripts/zlce-check.py . && python3 scripts/run-tests.py
     ```

---

## 4. CONTOH PROMPT HASIL GENERATOR ESTAFET (TASK-017 SEBAGAI CONTOH)

```markdown
Kamu adalah Senior Frontend & TypeScript Engineer yang bertindak sebagai AI Coding Engine untuk proyek ZLCE Mobile Workbench v4.0.0 (Zero-Loss Context Engineering Studio).

### KONTEKS PROYEK & ATURAN METODOLOGI:
1. Stack: React 19 + TypeScript + Vite + Tailwind CSS (v4).
2. Metodologi: Zero-Loss Context Engineering (ZLCE).
   - Invarian I1 (All in Files): Sumber kebenaran tunggal adalah file Markdown dan kode repositori.
   - Invarian I2 (Cold-Start Resume): Eksekusi mandiri tanpa asumsi ingatan chat sebelumnya.
   - Invarian I4 (Strict Provenance Tracking): Menghasilkan kode teratribusi [Aktor, Model, Task].
   - Schema-before-Data: Tipe TypeScript murni dan antarmuka harus didefinisikan sebelum implementasi logika.
3. ATURAN KODE MUTLAK:
   - Tulis kode LENGKAP tanpa placeholder, tanpa tanda elipsis ("// ... rest of code"), tanpa fungsi mockup kosong.
   - Sesuai dengan batasan layar tablet Android 8.7" (Samsung Tab A7 Lite): target sentuh minimal 44px (min-h-[44px]).
   - Dilarang mengarang waktu audit sintetis (gunakan format sumber atau "jam: ?").

### MANDAT TUGAS: IMPLEMENTASI TASK-017
* Nama Task: Handover Manager Lintas AI & Deteksi Konflik Keputusan
* Fase: FASE 3
* Dependensi: TASK-016
* Status: READY
* Target Berkas:
  1. src/components/mobile/HandoverManager.tsx
  2. src/utils/handoverConflictDetector.ts
* Stop Token: <<<END_CLAUDE_ZLCE_RESPONSE>>>
```
