import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'es2017',
    outDir: './dist',
    rollupOptions: {
      input: './src/plugin.ts',
      output: {
        entryFileNames: '[name].js'
      }
    }
  }
});
