// @ts-check
import * as child from 'node:child_process';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const commitHash = child.execSync('git rev-parse --short HEAD').toString();

// https://vitejs.dev/config/
export default defineConfig({
    define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(commitHash) },
    build: { target: 'esnext' },
    plugins: [tsconfigPaths()]
});
