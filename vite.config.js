import * as child from 'child_process';
import { defineConfig } from 'vite';
import { resolve } from 'path';

const commitHash = child.execSync('git rev-parse --short HEAD').toString();

// https://vitejs.dev/config/
export default defineConfig({
    appType: 'mpa',
    build: {
        rollupOptions: {
            input: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'game-of-webgpu': resolve(__dirname, 'game-of-webgpu/index.html'),
                main: resolve(__dirname, 'index.html'),
                renderer: resolve(__dirname, 'renderer/index.html')
            }
        },
        target: 'esnext'
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(commitHash) }
});
