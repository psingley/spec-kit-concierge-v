import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    MAIN_WINDOW_VITE_DEV_SERVER_URL: JSON.stringify(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL),
    MAIN_WINDOW_VITE_NAME: JSON.stringify('main_window')
  },
  build: {
    outDir: '.vite/build',
    emptyOutDir: false,
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs']
    },
    rollupOptions: {
      external: ['electron', 'pino', ...builtinModules, ...builtinModules.map((name) => `node:${name}`)],
      output: {
        entryFileNames: 'main.js'
      }
    }
  }
});
