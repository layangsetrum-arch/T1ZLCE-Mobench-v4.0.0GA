import { useState, useCallback } from 'react';

export interface ImportedFileInfo {
  name: string;
  size: number;
  sizeFormatted: string;
  lastModified: number;
  content: string;
  importedAt: Date;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function useFileImport(onSuccess?: (info: ImportedFileInfo) => void) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastImported, setLastImported] = useState<ImportedFileInfo | null>(null);

  const importFromFile = useCallback(async (file: File): Promise<ImportedFileInfo | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Validasi ekstensi
      const validExtensions = ['.md', '.markdown', '.txt'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(fileExt) && !file.type.includes('text')) {
        throw new Error(`Ekstensi berkas "${file.name}" tidak didukung. Harap pilih berkas Markdown (.md, .markdown, atau .txt).`);
      }

      // 2. Validasi batas ukuran (maks. 5MB untuk lingkungan memori tablet 3GB)
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new Error(`Ukuran berkas (${formatFileSize(file.size)}) melebihi batas aman 5 MB untuk tablet.`);
      }

      // 3. Baca konten menggunakan Text API
      const content = await file.text();

      const info: ImportedFileInfo = {
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        lastModified: file.lastModified,
        content,
        importedAt: new Date()
      };

      setLastImported(info);
      onSuccess?.(info);
      return info;
    } catch (err: any) {
      const msg = err.message || 'Gagal membaca berkas dari penyimpanan perangkat.';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<ImportedFileInfo | null> => {
    const files = e.target.files;
    if (!files || files.length === 0) return null;
    const file = files[0];
    const result = await importFromFile(file);
    // Reset value agar dapat memilih berkas yang sama ulang jika diinginkan
    e.target.value = '';
    return result;
  }, [importFromFile]);

  const clearError = useCallback(() => setError(null), []);

  return {
    isLoading,
    error,
    lastImported,
    importFromFile,
    handleFileInputChange,
    clearError
  };
}
