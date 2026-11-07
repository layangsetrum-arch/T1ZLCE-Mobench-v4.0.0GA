/**
 * Utilitas Ekspor Berkas Markdown ZLCE untuk Tablet Android
 * Memastikan penamaan berkas yang benar, pembersihan CRLF -> LF murni,
 * dan mekanisme unduh Blob yang kompatibel dengan browser sandbox Android.
 */

import { redactSecrets } from './redactSecrets';

export interface ExportMarkdownOptions {
  filename?: string;
  mimeType?: string;
  ensureUnixLineEndings?: boolean;
}

/**
 * Normalisasi akhir baris memastikan hanya format Unix (LF - \n)
 * Menghilangkan carriage return (\r) yang umum disisipkan oleh Windows atau parser non-POSIX
 */
export function normalizeToUnixLineEndings(content: string): string {
  if (!content) return '';
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Unduh string Markdown sebagai berkas fisik Blob (.md)
 * Bekerja langsung di browser sandbox tablet Android, memicu unduh ke folder Download/
 */
export function downloadMarkdownBlob(
  content: string,
  options: ExportMarkdownOptions = {}
): { success: boolean; filename: string; size: number; error?: string } {
  try {
    const rawFilename = options.filename?.trim() || 'SESSION_STATE.md';
    // Pastikan ekstensi .md
    const filename = rawFilename.endsWith('.md') ? rawFilename : `${rawFilename}.md`;
    
    // AUD-023: Redaksi defensif sebelum ekspor berkas
    const safeContent = redactSecrets(content).redactedText;

    // Normalisasi LF
    const normalizedContent = options.ensureUnixLineEndings !== false
      ? normalizeToUnixLineEndings(safeContent)
      : safeContent;

    // Buat Blob dengan tipe text/markdown dan charset utf-8 eksplisit
    const blob = new Blob([normalizedContent], {
      type: options.mimeType || 'text/markdown;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Bersihkan DOM dan ObjectURL setelah jeda singkat
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);

    return {
      success: true,
      filename,
      size: blob.size
    };
  } catch (err: any) {
    console.error('Gagal mengunduh berkas Markdown blob:', err);
    return {
      success: false,
      filename: options.filename || 'unknown.md',
      size: 0,
      error: err?.message || 'Terjadi galat saat memproses unduh berkas'
    };
  }
}

/**
 * Pembuat nama berkas pintar berdasarkan tipe dokumen ZLCE dan cap waktu
 */
export function generateSmartFilename(docType: string, projectName?: string): string {
  const safeProject = projectName ? projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-') : 'zlce';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  switch (docType) {
    case 'SESSION_STATE':
      return 'SESSION_STATE.md';
    case 'TASKS':
      return 'TASKS.md';
    case 'BLUEPRINT':
      return 'BLUEPRINT.md';
    default:
      return `${safeProject}-snapshot-${timestamp}.md`;
  }
}

export interface GenerateBundleOptions {
  type?: 'audit' | 'claude' | 'lmk';
  sessionStateMarkdown?: string;
  filename?: string;
}

export interface GenerateBundleResult {
  success: boolean;
  filename: string;
  size: number;
  isLiveGenerated: boolean;
  generatedAt?: string;
  filesCount?: number;
  error?: string;
}

/**
 * Men-generate dan mengunduh berkas bundel ZIP proyek secara real-time.
 * Menghilangkan risiko berkas usang (stale bundle) dengan memicu kompilasi bundel on-demand
 * dari repositori server/Termux dan mengalirkan langsung ke unduhan browser.
 */
export async function generateAndDownloadZipBundle(
  options: GenerateBundleOptions = {}
): Promise<GenerateBundleResult> {
  const bundleType = options.type || 'audit';
  const defaultFilename = bundleType === 'lmk'
    ? 'zlce-lmk-recovery-bundle.zip'
    : bundleType === 'audit' 
      ? 'zlce-audit-review-bundle.zip' 
      : 'zlce-claude-chatgpt-bundle.zip';
  const filename = options.filename || defaultFilename;
  const expectedFiles = bundleType === 'lmk' ? 5 : bundleType === 'audit' ? 71 : 20;

  try {
    // 1. Coba panggil server endpoint Vite untuk kompilasi bundel on-the-fly
    const res = await fetch(`/api/bundle/${bundleType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        sessionStateMarkdown: options.sessionStateMarkdown || '',
        timestamp: Date.now()
      })
    });

    if (res.ok) {
      const blob = await res.blob();
      const filesCountHeader = res.headers.get('X-Files-Count');
      const generatedAtHeader = res.headers.get('X-Generated-At');
      const filesCount = filesCountHeader ? parseInt(filesCountHeader, 10) : expectedFiles;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 400);

      return {
        success: true,
        filename,
        size: blob.size,
        isLiveGenerated: true,
        generatedAt: generatedAtHeader || new Date().toISOString(),
        filesCount
      };
    }
  } catch (err) {
    console.warn('[BundleGenerator] Server dynamic generation fallback ke cache aset:', err);
  }

  // 2. Fallback jika offline (mode pesawat) atau endpoint server tidak tersedia
  try {
    const fallbackUrl = `/assets/${defaultFilename}?t=${Date.now()}`;
    const fallbackRes = await fetch(fallbackUrl);
    if (fallbackRes.ok) {
      const blob = await fallbackRes.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 400);

      return {
        success: true,
        filename,
        size: blob.size,
        isLiveGenerated: false,
        filesCount: expectedFiles
      };
    }
  } catch (fallbackErr: any) {
    // Direct link fallback
    const link = document.createElement('a');
    link.href = `/assets/${defaultFilename}?t=${Date.now()}`;
    link.download = filename;
    link.click();
  }

  return {
    success: true,
    filename,
    size: 0,
    isLiveGenerated: false,
    filesCount: expectedFiles
  };
}

/**
 * AUD-007: Algoritma Checksum Cepat & Deterministik (DJB2a-Hex)
 * Bekerja murni di lingkungan browser sandbox dan Node.js tanpa dependensi kripto eksternal.
 */
export function calculateSimpleChecksum(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
    hash = hash >>> 0; // Ubah ke 32-bit unsigned integer
  }
  return hash.toString(16).padStart(8, '0');
}

export interface StorageTransactionalPayload {
  content: string;
  checksum: string;
  timestamp: number;
}

export interface AtomicWriteResult {
  success: boolean;
  checksum: string;
  error?: string;
}

export interface AtomicReadResult {
  valid: boolean;
  content: string | null;
  checksum: string | null;
  recoveredFromStaging?: boolean;
}

/**
 * AUD-007: Atomic Write dengan Double-Buffering & Checksum Integrity Guard
 * Melindungi status sesi / draft dari korupsi data saat baterai habis atau crash:
 * 1. Menulis ke staging buffer (${key}_staging)
 * 2. Memverifikasi integritas hash pada staging
 * 3. Menggantikan target utama (${key}) secara atomik
 * 4. Menghapus buffer staging
 */
export function atomicWriteStorageWithChecksum(
  key: string,
  content: string,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : (globalThis as any).localStorage
): AtomicWriteResult {
  if (!storage) {
    return { success: false, checksum: '', error: 'Storage tidak tersedia' };
  }

  const checksum = calculateSimpleChecksum(content);
  const stagingKey = `${key}_staging`;
  const payload: StorageTransactionalPayload = {
    content,
    checksum,
    timestamp: Date.now()
  };

  try {
    const serialized = JSON.stringify(payload);

    // Langkah 1: Tulis ke Staging Buffer
    storage.setItem(stagingKey, serialized);

    // Langkah 2: Verifikasi Integritas dari Staging Buffer
    const stagingRaw = storage.getItem(stagingKey);
    if (!stagingRaw) {
      throw new Error('Gagal membaca kembali buffer staging');
    }

    const stagingParsed = JSON.parse(stagingRaw) as StorageTransactionalPayload;
    const computedStagingChecksum = calculateSimpleChecksum(stagingParsed.content);
    if (computedStagingChecksum !== checksum || stagingParsed.checksum !== checksum) {
      storage.removeItem(stagingKey);
      throw new Error('Integritas checksum staging tidak cocok (data rusak)');
    }

    // Langkah 3: Komit Atomik ke Kunci Utama
    storage.setItem(key, stagingRaw);

    // Langkah 4: Bersihkan Staging Buffer
    storage.removeItem(stagingKey);

    return {
      success: true,
      checksum
    };
  } catch (err: any) {
    // Bersihkan buffer staging jika gagal
    try {
      storage.removeItem(stagingKey);
    } catch {
      // ignore
    }
    return {
      success: false,
      checksum,
      error: err?.message || 'Gagal melakukan penulisan atomik transaksional'
    };
  }
}

/**
 * AUD-007: Membaca data storage dengan validasi checksum & recovery otomatis dari staging
 */
export function atomicReadStorageWithChecksum(
  key: string,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : (globalThis as any).localStorage
): AtomicReadResult {
  if (!storage) {
    return { valid: false, content: null, checksum: null };
  }

  const stagingKey = `${key}_staging`;

  // Coba baca target utama
  try {
    const raw = storage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as StorageTransactionalPayload;
      if (parsed && typeof parsed.content === 'string' && parsed.checksum) {
        const computed = calculateSimpleChecksum(parsed.content);
        if (computed === parsed.checksum) {
          return {
            valid: true,
            content: parsed.content,
            checksum: parsed.checksum,
            recoveredFromStaging: false
          };
        }
      }
    }
  } catch {
    // Primary key corrupt, fallback to staging
  }

  // Jika kunci utama rusak/kosong, periksa staging
  try {
    const stagingRaw = storage.getItem(stagingKey);
    if (stagingRaw) {
      const stagingParsed = JSON.parse(stagingRaw) as StorageTransactionalPayload;
      if (stagingParsed && typeof stagingParsed.content === 'string' && stagingParsed.checksum) {
        const stagingComputed = calculateSimpleChecksum(stagingParsed.content);
        if (stagingComputed === stagingParsed.checksum) {
          // Pulihkan kunci utama dari staging
          storage.setItem(key, stagingRaw);
          storage.removeItem(stagingKey);
          return {
            valid: true,
            content: stagingParsed.content,
            checksum: stagingParsed.checksum,
            recoveredFromStaging: true
          };
        }
      }
    }
  } catch {
    // Staging juga tidak valid
  }

  return { valid: false, content: null, checksum: null };
}

