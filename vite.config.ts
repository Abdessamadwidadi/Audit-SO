
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Vite ne définit pas process.env par défaut pour le navigateur.
    // Cette ligne permet à l'application de lire la clé API_KEY configurée sur Vercel.
    'process.env': process.env
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
});
