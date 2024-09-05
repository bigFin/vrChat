import { defineConfig } from 'vite';

export default defineConfig({
	root: '.',  // Root directory (same level as index.html)
	build: {
		outDir: 'dist',  // Where to output the build
	},
	server: {
		open: true,  // Automatically open the app in the browser
	},
});

