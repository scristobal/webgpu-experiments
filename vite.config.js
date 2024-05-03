import { defineConfig } from 'vite';

import * as child from 'child_process';

const commitHash = child.execSync('git rev-parse --short HEAD').toString();

// https://vitejs.dev/config/
export default defineConfig({
    define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(commitHash) },
    build: { target: 'esnext' },
    appType: 'mpa'
});
