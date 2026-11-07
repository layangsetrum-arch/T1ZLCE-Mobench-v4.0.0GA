import { useState, useEffect, useRef, useCallback } from 'react';
import { redactSecrets } from '../utils/redactSecrets';

/**
 * Metadata cache draft untuk pemantauan dan audit state editor
 */
export interface AutoDraftMeta {
  savedAt: number;
  savedAtFormatted: string;
  charCount: number;
  lineCount: number;
  docType?: string;
  source: 'debounce-400ms' | 'manual-save' | 'lifecycle-flush' | 'storage-sync';
  revision?: number;
  detectedSecretsCount?: number;
  detectedSecrets?: string[];
}

export interface UseAutoDraftCacheOptions {
  /**
   * Kunci penyimpanan LocalStorage untuk teks Markdown.
   * Default: 'zlce_workspace_draft_content'
   */
  storageKey?: string;
  /**
   * Kunci penyimpanan LocalStorage untuk metadata draft.
   * Default: 'zlce_workspace_draft_meta'
   */
  metaKey?: string;
  /**
   * Identitas/alias anggota tim untuk partisi namespace draft di tablet bersama (AUD-005 / TASK-051 / TASK-064).
   * Jika tidak diisi, hook otomatis membaca 'zlce_active_member_id' dari LocalStorage.
   */
  memberId?: string;
  /**
   * Durasi debounce ketikan dalam milidetik.
   * Standar TASK-012 ZLCE: 400ms.
   */
  debounceMs?: number;
  /**
   * Pulihkan draft terakhir secara transparan saat komponen dimuat.
   * Default: true.
   */
  autoRestore?: boolean;
  /**
   * Tipe dokumen terdeteksi opsional untuk pencatatan metadata.
   */
  docType?: string;
  /**
   * Callback yang dipicu saat draft berhasil disimpan otomatis.
   */
  onAutoSave?: (content: string, meta: AutoDraftMeta) => void;
  /**
   * Callback yang dipicu saat draft lama dipulihkan saat startup.
   */
  onRestore?: (content: string, meta: AutoDraftMeta | null) => void;
}

export interface UseAutoDraftCacheReturn {
  /** Konten teks saat ini yang sedang diedit */
  draftContent: string;
  /** Pengubah teks yang secara otomatis memicu debounce 400ms */
  setDraftContent: (newContent: string | ((prev: string) => string)) => void;
  /** Status sedang menunggu debounce atau proses penyimpanan */
  isSaving: boolean;
  /** Status apakah teks di memori sudah tersimpan persis di LocalStorage */
  isDraftSaved: boolean;
  /** Waktu penyimpanan sukses terakhir */
  lastSavedAt: Date | null;
  /** Apakah ada draft yang tersimpan di LocalStorage */
  hasStoredDraft: boolean;
  /** Metadata detail dari draft yang tersimpan */
  storedDraftMeta: AutoDraftMeta | null;
  /** Menandakan apakah konten awal saat ini berasal dari pemulihan draft otomatis */
  isRestoredFromDraft: boolean;
  /** Simpan instan tanpa menunggu debounce 400ms */
  saveNow: () => void;
  /** Buang draft dari LocalStorage dan kembalikan ke teks acuan */
  discardDraft: (fallbackContent?: string) => void;
  /** Paksa pemulihan draft dari LocalStorage secara eksplisit */
  restoreStoredDraft: () => string | null;
  /** Hapus seluruh penyimpanan draft di LocalStorage */
  clearDraftStorage: () => void;
  /** AUD2-002: Nomor revisi terakhir yang telah persis tersimpan di storage */
  lastPersistedRevision: number;
  /** AUD2-002: Nomor revisi ketikan aktif saat ini */
  lastEditedRevision: number;
  /** AUD2-002: Indikator non-destruktif apakah teks mengandung token/rahasia */
  hasDetectedSecrets: boolean;
  /** AUD2-002: Ringkasan jenis rahasia terdeteksi untuk peringatan UI */
  detectedSecrets: string[];
}

const DEFAULT_STORAGE_KEY = 'zlce_workspace_draft_content';
const DEFAULT_META_KEY = 'zlce_workspace_draft_meta';
const DEFAULT_DEBOUNCE_MS = 400; // Standar kanonik ZLCE TASK-012

/**
 * Utilitas pembentuk storage key terisolasi per anggota tim di tablet bersama (AUD-005 & AUD-018)
 */
export function getScopedStorageKey(baseKey: string, explicitMemberId?: string): string {
  if (explicitMemberId && explicitMemberId.trim().length > 0) {
    return `${baseKey}_${explicitMemberId.trim().toLowerCase()}`;
  }
  if (typeof window !== 'undefined') {
    try {
      const activeId = localStorage.getItem('zlce_active_member_id');
      if (activeId && activeId.trim().length > 0) {
        return `${baseKey}_${activeId.trim().toLowerCase()}`;
      }
    } catch {
      // Abaikan
    }
  }
  return baseKey;
}

/**
 * Custom Hook: useAutoDraftCache
 * Mengelola cache draft editor Markdown di LocalStorage dengan debounce 400ms.
 * Memastikan proteksi data loss terhadap:
 * 1. Penutupan tab tidak sengaja
 * 2. Pembersihan memori oleh Android Low Memory Killer (LMK) saat berpindah ke Termux / peramban AI
 * 3. Partisi multi-user ketat: draft terisolasi per anggota tim aktif tanpa kebocoran namespace (AUD-018 / TASK-064)
 * 4. Pemulihan transparan saat aplikasi dibuka kembali
 */
export function useAutoDraftCache(
  initialContent: string = '',
  options: UseAutoDraftCacheOptions = {}
): UseAutoDraftCacheReturn {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    metaKey = DEFAULT_META_KEY,
    memberId,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    autoRestore = true,
    docType,
    onAutoSave,
    onRestore
  } = options;

  // Resolusi kunci storage terisolasi berdasarkan anggota tim aktif saat render
  const resolvedStorageKey = getScopedStorageKey(storageKey, memberId);
  const resolvedMetaKey = getScopedStorageKey(metaKey, memberId);

  // AUD-018: Catat key tempat draft kotor ditulis agar flush selalu masuk ke namespace pemilik draft
  const dirtyKeyRef = useRef<{ content: string; meta: string }>({
    content: resolvedStorageKey,
    meta: resolvedMetaKey
  });

  // AUD-018: Fungsi pembaca draft terisolasi tanpa fallback berbahaya ke global key
  const readScopedDraft = useCallback((): { text: string | null; meta: AutoDraftMeta | null } => {
    if (typeof window === 'undefined') return { text: null, meta: null };
    try {
      const contentKey = getScopedStorageKey(storageKey, memberId);
      const metaStoreKey = getScopedStorageKey(metaKey, memberId);
      const text = localStorage.getItem(contentKey);
      const rawMeta = localStorage.getItem(metaStoreKey);
      return { text, meta: rawMeta ? (JSON.parse(rawMeta) as AutoDraftMeta) : null };
    } catch (e) {
      console.warn('[useAutoDraftCache] Gagal membaca draft terisolasi:', e);
      return { text: null, meta: null };
    }
  }, [storageKey, metaKey, memberId]);

  // Status awal apakah draft berhasil dipulihkan secara transparan
  const initialCheckRef = useRef<{ restored: boolean; content: string }>({
    restored: false,
    content: initialContent
  });

  // Tentukan konten awal murni dari namespace anggota bersangkutan
  const [draftContent, setDraftContentState] = useState<string>(() => {
    if (typeof window === 'undefined') return initialContent;

    if (autoRestore) {
      try {
        const contentKey = getScopedStorageKey(storageKey, memberId);
        const savedDraft = localStorage.getItem(contentKey);
        // Pulihkan jika ada draft tersimpan yang valid dan tidak kosong
        if (savedDraft !== null && savedDraft.trim().length > 0) {
          initialCheckRef.current = {
            restored: true,
            content: savedDraft
          };
          return savedDraft;
        }
      } catch (e) {
        console.warn('[useAutoDraftCache] Gagal membaca draft saat inisialisasi:', e);
      }
    }

    initialCheckRef.current = {
      restored: false,
      content: initialContent
    };
    return initialContent;
  });

  const [isRestoredFromDraft, setIsRestoredFromDraft] = useState<boolean>(
    initialCheckRef.current.restored
  );

  const [storedDraftMeta, setStoredDraftMeta] = useState<AutoDraftMeta | null>(() => {
    return readScopedDraft().meta;
  });

  const [hasStoredDraft, setHasStoredDraft] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const contentKey = getScopedStorageKey(storageKey, memberId);
      const saved = localStorage.getItem(contentKey);
      return Boolean(saved && saved.trim().length > 0);
    } catch {
      return false;
    }
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    const meta = readScopedDraft().meta;
    return meta ? new Date(meta.savedAt) : null;
  });

  // AUD2-002: Pelacakan revisi monotonic & deteksi rahasia non-destruktif
  const [lastPersistedRevision, setLastPersistedRevision] = useState<number>(0);
  const [lastEditedRevision, setLastEditedRevision] = useState<number>(0);
  const [hasDetectedSecrets, setHasDetectedSecrets] = useState<boolean>(false);
  const [detectedSecrets, setDetectedSecrets] = useState<string[]>([]);

  const editRevisionRef = useRef<number>(0);
  const persistedRevisionRef = useRef<number>(0);

  // Refs untuk pelacakan nilai terbaru tanpa re-bind callback
  const contentRef = useRef<string>(draftContent);
  contentRef.current = draftContent;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef<boolean>(false);
  const initialContentRef = useRef<string>(initialContent);

  // Memicu callback onRestore jika terjadi pemulihan awal
  useEffect(() => {
    if (initialCheckRef.current.restored) {
      onRestore?.(initialCheckRef.current.content, storedDraftMeta);
    }
  }, []);

  // Fungsi internal untuk menulis ke LocalStorage
  const persistDraft = useCallback(
    (
      textToSave: string,
      source: AutoDraftMeta['source'] = 'debounce-400ms'
    ): AutoDraftMeta | null => {
      if (typeof window === 'undefined') return null;

      try {
        const now = Date.now();
        const lines = textToSave ? textToSave.split('\n').length : 0;

        // AUD2-002: Deteksi rahasia tanpa mutasi destruktif pada teks kerja aktif
        const redactResult = redactSecrets(textToSave);
        const foundSecrets = redactResult.redactedCount > 0;
        const secretList = foundSecrets ? redactResult.summary : [];
        setHasDetectedSecrets(foundSecrets);
        setDetectedSecrets(secretList);

        const currentRev = editRevisionRef.current;
        const meta: AutoDraftMeta = {
          savedAt: now,
          savedAtFormatted: new Date(now).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          charCount: textToSave.length,
          lineCount: lines,
          docType: docType,
          source,
          revision: currentRev,
          detectedSecretsCount: redactResult.redactedCount,
          detectedSecrets: secretList
        };

        // AUD-018: Selalu simpan ke namespace anggota pemilik draft kotor
        const targetContentKey = dirtyKeyRef.current.content;
        const targetMetaKey = dirtyKeyRef.current.meta;

        // AUD2-002: Simpan teks murni pengguna ke LocalStorage (non-destructive)
        // Menjamin restore(persist(x)) === x untuk integritas Zero-Loss
        localStorage.setItem(targetContentKey, textToSave);
        localStorage.setItem(targetMetaKey, JSON.stringify(meta));

        persistedRevisionRef.current = currentRev;
        setLastPersistedRevision(currentRev);

        setIsSaving(false);
        setIsDraftSaved(true);
        setLastSavedAt(new Date(now));
        setHasStoredDraft(Boolean(textToSave && textToSave.trim().length > 0));
        setStoredDraftMeta(meta);
        isDirtyRef.current = false;

        onAutoSave?.(textToSave, meta);

        // Notifikasi ke jendela / tab lain
        window.dispatchEvent(
          new CustomEvent('zlce-draft-saved', {
            detail: { storageKey: targetContentKey, meta }
          })
        );

        return meta;
      } catch (err) {
        console.error('[useAutoDraftCache] Gagal menyimpan draft ke LocalStorage:', err);
        setIsSaving(false);
        return null;
      }
    },
    [docType, onAutoSave]
  );

  // AUD-018: Handler update konten dengan side effect di luar state updater
  const setDraftContent = useCallback(
    (newContentOrFn: string | ((prev: string) => string)) => {
      const prev = contentRef.current;
      const nextContent =
        typeof newContentOrFn === 'function' ? newContentOrFn(prev) : newContentOrFn;

      if (nextContent === prev) return;

      // Pindahkan seluruh side effect di LUAR functional state updater React
      contentRef.current = nextContent;
      isDirtyRef.current = true;
      dirtyKeyRef.current = {
        content: getScopedStorageKey(storageKey, memberId),
        meta: getScopedStorageKey(metaKey, memberId)
      };

      // AUD2-002: Lacak pertambahan revisi ketikan
      editRevisionRef.current += 1;
      setLastEditedRevision(editRevisionRef.current);

      setDraftContentState(nextContent);
      setIsDraftSaved(false);
      setIsSaving(true);

      // Bersihkan timer debounce sebelumnya
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Mulai timer debounce 400ms kanonik
      timerRef.current = setTimeout(() => {
        persistDraft(contentRef.current, 'debounce-400ms');
        timerRef.current = null;
      }, debounceMs);
    },
    [storageKey, metaKey, memberId, debounceMs, persistDraft]
  );

  // Simpan segera tanpa menunggu timer debounce
  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    persistDraft(contentRef.current, 'manual-save');
  }, [persistDraft]);

  // Buang draft dari LocalStorage
  const discardDraft = useCallback(
    (fallbackContent?: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const contentKey = getScopedStorageKey(storageKey, memberId);
      const metaStoreKey = getScopedStorageKey(metaKey, memberId);

      try {
        localStorage.removeItem(contentKey);
        localStorage.removeItem(metaStoreKey);
      } catch {
        // Abaikan
      }

      const targetText = fallbackContent !== undefined ? fallbackContent : initialContentRef.current;
      contentRef.current = targetText;
      setDraftContentState(targetText);
      setIsRestoredFromDraft(false);
      setHasStoredDraft(false);
      setStoredDraftMeta(null);
      setIsDraftSaved(true);
      setIsSaving(false);
      isDirtyRef.current = false;

      // AUD2-002: Reset revisi dan status deteksi rahasia
      editRevisionRef.current += 1;
      persistedRevisionRef.current = editRevisionRef.current;
      setLastEditedRevision(editRevisionRef.current);
      setLastPersistedRevision(editRevisionRef.current);
      setHasDetectedSecrets(false);
      setDetectedSecrets([]);
    },
    [storageKey, metaKey, memberId]
  );

  // Hapus seluruh penyimpanan draft
  const clearDraftStorage = useCallback(() => {
    discardDraft();
  }, [discardDraft]);

  // AUD-018 & AUD2-002: Paksa pemulihan draft terisolasi dari storage anggota aktif (non-destructive)
  const restoreStoredDraft = useCallback((): string | null => {
    const { text, meta } = readScopedDraft();
    if (text === null || text.trim().length === 0) {
      contentRef.current = initialContentRef.current;
      setDraftContentState(initialContentRef.current);
      setIsRestoredFromDraft(false);
      setHasStoredDraft(false);
      setStoredDraftMeta(null);
      setIsDraftSaved(true);
      isDirtyRef.current = false;
      setHasDetectedSecrets(false);
      setDetectedSecrets([]);
      return null;
    }
    contentRef.current = text;
    setDraftContentState(text);
    setIsRestoredFromDraft(true);
    setHasStoredDraft(true);
    setIsDraftSaved(true);
    setStoredDraftMeta(meta);
    setLastSavedAt(meta ? new Date(meta.savedAt) : null);
    isDirtyRef.current = false;

    // AUD2-002: Deteksi rahasia pada teks yang dipulihkan tanpa merusak isi teks
    const redactResult = redactSecrets(text);
    setHasDetectedSecrets(redactResult.redactedCount > 0);
    setDetectedSecrets(redactResult.redactedCount > 0 ? redactResult.summary : []);

    onRestore?.(text, meta);
    return text;
  }, [readScopedDraft, onRestore]);

  // PROTEKSI SPESIFIK ANDROID LMK & LIFECYCLE:
  // Segera flush draft saat browser beralih ke background atau proses akan dimatikan
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const flushDirtyDraft = () => {
      if (isDirtyRef.current) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        persistDraft(contentRef.current, 'lifecycle-flush');
      }
    };

    const handleVisibilityChange = () => {
      // Saat PWA diminimalkan atau pengguna beralih ke Termux
      if (document.visibilityState === 'hidden') {
        flushDirtyDraft();
      }
    };

    const handlePageHide = () => {
      flushDirtyDraft();
    };

    const handleBeforeUnload = () => {
      flushDirtyDraft();
    };

    // Sinkronisasi lintas-tab & pergantian anggota (Storage Event)
    const handleStorageEvent = (e: StorageEvent) => {
      const activeContentKey = getScopedStorageKey(storageKey, memberId);
      if (e.key === activeContentKey && e.newValue !== null) {
        // Jika tab lain menyimpan draft baru
        if (e.newValue !== contentRef.current && !isDirtyRef.current) {
          contentRef.current = e.newValue;
          setDraftContentState(e.newValue);
          const meta = readScopedDraft().meta;
          setStoredDraftMeta(meta);
          setHasStoredDraft(true);
          setIsDraftSaved(true);
        }
      } else if (e.key === activeContentKey && e.newValue === null) {
        // Jika tab lain membuang draft
        setHasStoredDraft(false);
        setStoredDraftMeta(null);
      } else if (e.key === 'zlce_active_member_id') {
        // Anggota berganti di tablet bersama (AUD-018): flush draft anggota lama, muat draft anggota baru
        flushDirtyDraft();
        restoreStoredDraft();
      }
    };

    // Custom event pergantian anggota dari UI lokal
    const handleMemberSwitch = () => {
      flushDirtyDraft();
      restoreStoredDraft();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('zlce-active-member-changed', handleMemberSwitch);

    return () => {
      // Cleanup: flush jika ada ketikan tersisa sebelum unmount
      flushDirtyDraft();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('zlce-active-member-changed', handleMemberSwitch);
    };
  }, [persistDraft, restoreStoredDraft, storageKey, memberId, readScopedDraft]);

  return {
    draftContent,
    setDraftContent,
    isSaving,
    isDraftSaved,
    lastSavedAt,
    hasStoredDraft,
    storedDraftMeta,
    isRestoredFromDraft,
    saveNow,
    discardDraft,
    restoreStoredDraft,
    clearDraftStorage,
    lastPersistedRevision,
    lastEditedRevision,
    hasDetectedSecrets,
    detectedSecrets
  };
}
