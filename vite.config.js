/* eslint-disable no-undef */
import * as child from "node:child_process";
import { defineConfig } from "vite";
import { resolve } from "node:path";

const commitHash = child.execSync("git rev-parse --short HEAD").toString();

// https://vitejs.dev/config/
export default defineConfig({
	define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify(commitHash) },
	build: {
		target: "esnext",
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
				"game-of-webgpu": resolve(__dirname, "game-of-webgpu/index.html"),
				"renderer-webgpu": resolve(__dirname, "renderer-webgpu/index.html"),
				"renderer-webgl2": resolve(__dirname, "renderer-webgl2/index.html"),
			},
		},
	},
	appType: "mpa",
});
