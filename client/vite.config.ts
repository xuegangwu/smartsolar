import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3004,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/antd') || id.includes('@ant-design/icons')) return 'vendor-antd';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet';
          if (id.includes('node_modules/react-markdown') || id.includes('remark-gfm')) return 'vendor-md';
          if (id.includes('node_modules/axios')) return 'vendor-axios';
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
