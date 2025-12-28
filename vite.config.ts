import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Injection sécurisée des variables d'environnement
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // Augmente la limite à 3000kb pour supprimer l'avertissement jaune sur les gros bundles
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        // Découpage stratégique pour réduire la taille du bundle principal
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'charts-lib': ['recharts'],
          'icons-lib': ['lucide-react'],
          'data-lib': ['@supabase/supabase-js', 'xlsx'],
        },
      },
    },
  },
});