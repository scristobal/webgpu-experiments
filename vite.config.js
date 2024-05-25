import { defineConfig } from 'vite';
import { resolve } from 'path';

import * as child from 'child_process';

const commitHash = child.execSync('git rev-parse --short HEAD').toString();

// https://vitejs.dev/config/
export default defineConfig({
    define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(commitHash) },
    build: {
        target: 'esnext',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                'game-of-webgpu': resolve(__dirname, 'game-of-webgpu/index.html'),
                renderer: resolve(__dirname, 'renderer/index.html')
            }
        }
    },
    appType: 'mpa'
});
