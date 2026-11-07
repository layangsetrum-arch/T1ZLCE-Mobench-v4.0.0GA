/**
 * ZLCE Mobile Workbench Service Worker Registration & PWA Hooks
 * Modul pendaftaran Service Worker, deteksi status jaringan, in-app install prompt,
 * dan registrasi deterministik aset bundel produksi ke Service Worker.
 * Rujukan: docs/mobile/blueprint/03_PWA_ARCHITECTURE.md, AUD2-005
 */

import { useState, useEffect, useCallback } from 'react';

export interface ServiceWorkerOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

let activeRegistration: ServiceWorkerRegistration | null = null;

/**
 * Mengumpulkan script dan stylesheet dari DOM dokumen dan mengirimkannya ke SW
 */
export function registerCurrentBuildAssets(registration?: ServiceWorkerRegistration | null): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const targetWorker = registration?.active || navigator.serviceWorker.controller;
  if (!targetWorker) return;

  try {
    const assets: string[] = [];
    // Skrip JS
    document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((s) => {
      if (s.src && !s.src.includes('@vite') && !s.src.includes('chrome-extension')) {
        assets.push(s.src);
      }
    });
    // Stylesheet CSS
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
      if (l.href && !l.href.includes('@vite')) {
        assets.push(l.href);
      }
    });

    if (assets.length > 0) {
      targetWorker.postMessage({
        type: 'REGISTER_BUILD_ASSETS',
        assets
      });
      console.log(`[ZLCE PWA] Dikirim ${assets.length} aset bundel ke Service Worker untuk precache deterministik.`);
    }
  } catch (e) {
    console.warn('[ZLCE PWA] Gagal mendeteksi aset bundel dokumen:', e);
  }
}

/**
 * Mendaftarkan Service Worker public/sw.js
 */
export function registerServiceWorker(options: ServiceWorkerOptions = {}): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        activeRegistration = registration;
        console.log('[ZLCE PWA] Service Worker registered with scope:', registration.scope);

        // Jika SW sudah aktif, daftarkan aset yang sudah dimuat ke cache
        if (registration.active) {
          registerCurrentBuildAssets(registration);
        }

        // Pantau pembaruan service worker
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Versi baru terinstal, siap memperbarui cache
                console.log('[ZLCE PWA] Konten baru tersedia; silakan muat ulang.');
                options.onUpdate?.(registration);
              } else {
                // Konten pertama kali di-cache untuk penggunaan offline
                console.log('[ZLCE PWA] Konten siap beroperasi secara offline.');
                registerCurrentBuildAssets(registration);
                options.onSuccess?.(registration);
              }
            }
          });
        });

        // Dengarkan jika controller berganti
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          registerCurrentBuildAssets(registration);
        });

        resolve(registration);
      } catch (error) {
        console.warn('[ZLCE PWA] Service Worker registration failed:', error);
        options.onError?.(error as Error);
        resolve(null);
      }
    });
  });
}

/**
 * Batalkan pendaftaran Service Worker jika diperlukan
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    return registration.unregister();
  }
  return false;
}

/**
 * Paksa periksa pembaruan Service Worker
 */
export async function checkForServiceWorkerUpdates(): Promise<void> {
  if (activeRegistration) {
    await activeRegistration.update();
  }
}

/**
 * Hook deteksi status koneksi internet (Online / Offline)
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Hook in-app install prompt untuk tablet & browser
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Deteksi jika sudah berjalan dalam mode standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Deteksi iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('[ZLCE PWA] Aplikasi sukses diinstal ke layar utama.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install
  };
}
