import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './sw-register';

// Daftarkan Service Worker PWA untuk offline caching shell
registerServiceWorker({
  onUpdate: () => {
    console.info('[ZLCE PWA] Update cache tersedia. Muat ulang untuk mengaktifkan.');
  },
  onSuccess: () => {
    console.info('[ZLCE PWA] App shell berhasil di-cache untuk operasi offline.');
  }
});

createRoot(document.getElementById('root')!).render(<App />);

