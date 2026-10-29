import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pisahkan vendor berat (peta, chart, parser Excel, ikon) dari bundle inti.
// Tanpa ini seluruh aplikasi jadi satu file ~870 kB yang harus diunduh dan
// di-parse sebelum halaman pertama tampil.
function vendorChunk(id) {
  if (!id.includes('node_modules')) return;
  const p = id.replace(/\\/g, '/');
  if (p.includes('/leaflet') || p.includes('@react-leaflet')) return 'leaflet';
  if (p.includes('/chart.js') || p.includes('chartjs')) return 'charts';
  if (p.includes('read-excel-file')) return 'excel';
  if (p.includes('lucide-react')) return 'icons';
  if (p.includes('react-router') || p.includes('@remix-run')) return 'router';
  if (p.includes('/react/') || p.includes('/react-dom/') || p.includes('/scheduler/')) return 'react';
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
});
