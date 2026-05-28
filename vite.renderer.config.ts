import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
const gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __GIT_SHA__: JSON.stringify(gitSha),
    __LICENSE_TEXT__: JSON.stringify('Internal')
  },
  build: {
    outDir: '../.vite/renderer/main_window',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/index.html'
    }
  }
});
