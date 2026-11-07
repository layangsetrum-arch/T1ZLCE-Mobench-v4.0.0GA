/**
 * ZLCE Mobile Workbench Service Worker
 * Versi: v4.0.0
 * Strategi: Cache-First untuk App Shell & Aset Statis, Stale-While-Revalidate untuk konten umum,
 * Network-First dengan Cache Fallback untuk navigasi, dan message listener untuk precache build assets deterministik.
 * Rujukan: docs/mobile/blueprint/03_PWA_ARCHITECTURE.md, AUD2-005
 */

const CACHE_NAME = 'zlce-mobile-v4.0.0';

// Mandatory App Shell core precache assets (kegagalan memuat ini memicu penanganan khusus)
const CORE_MANDATORY_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Optional non-blocking precache assets
const OPTIONAL_PRECACHE_ASSETS = [
  '/icons/icon-512x512-maskable.png',
  '/icons/apple-touch-icon.png'
];

// Install: Simpan seluruh App Shell inti ke Cache Storage secara deterministik
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Simpan aset wajib
      try {
        await cache.addAll(CORE_MANDATORY_ASSETS);
        console.log('[SW] Core mandatory App Shell assets cached successfully.');
      } catch (err) {
        console.error('[SW] Core mandatory assets precache error:', err);
      }

      // 2. Simpan aset opsional (non-fatal jika gagal)
      await Promise.allSettled(
        OPTIONAL_PRECACHE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn('[SW] Optional asset precache skipped:', url, err);
          })
        )
      );
    })
  );
});

// Activate: Bersihkan cache lama dan klaim kontrol klien
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith('zlce-'))
          .map((name) => {
            console.log('[SW] Menghapus cache usang:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Caching multi-layer ramah tablet offline 100%
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Hanya tangani metode GET
  if (request.method !== 'GET') {
    return;
  }

  // Bypass API lokal, WebSocket Vite HMR, dan skema non-http(s)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/__vite') ||
    url.protocol.startsWith('ws') ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  // Strategi 1: Navigasi Halaman (HTML) -> Network-First dengan Fallback ke Cache App Shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return caches.match('/');
        })
    );
    return;
  }

  // Strategi 2: Aset Statis (JS, CSS, Font, Ikon, Gambar, Manifest) -> Cache-First
  const isStaticAsset =
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidasi di latar belakang (Stale-While-Revalidate) jika online
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {/* Abaikan kegagalan jaringan saat revalidasi */});
          return cachedResponse;
        }

        // Jika belum ada di cache, unduh dari jaringan dan simpan
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Strategi 3: Permintaan Lainnya -> Network First dengan Fallback Cache
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// Penanganan Pesan Kontrol dari Klien (misal: pendaftaran bundel JS/CSS aktif deterministik)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'REGISTER_BUILD_ASSETS' && Array.isArray(event.data.assets)) {
    const assetsToCache = event.data.assets;
    caches.open(CACHE_NAME).then((cache) => {
      assetsToCache.forEach((assetUrl) => {
        if (typeof assetUrl === 'string' && assetUrl.length > 0) {
          fetch(assetUrl)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(assetUrl, res);
                console.log('[SW] Deterministic build asset cached:', assetUrl);
              }
            })
            .catch((err) => {
              console.warn('[SW] Could not precache dynamic asset:', assetUrl, err);
            });
        }
      });
    });
  }
});
