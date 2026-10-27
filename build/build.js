import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuildBuild, context } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const builds = [
	{
		absWorkingDir: root,
		entryPoints: ['src/index.js'],
		bundle: true,
		format: 'iife',
		globalName: 'leafletGestureHandling',
		footer: { js: 'globalThis["leaflet-gesture-handling"] = leafletGestureHandling;' },
		sourcemap: true,
		define: { 'import.meta': 'null' },
		outfile: 'dist/leaflet-gesture-handling.js'
	},
	{
		absWorkingDir: root,
		entryPoints: ['src/index.js'],
		bundle: true,
		format: 'iife',
		globalName: 'leafletGestureHandling',
		footer: { js: 'globalThis["leaflet-gesture-handling"] = leafletGestureHandling;' },
		sourcemap: true,
		define: { 'import.meta': 'null' },
		outfile: 'dist/leaflet-gesture-handling.min.js', minify: true },
	{
		absWorkingDir: root,
		entryPoints: ['src/index.css'],
		outfile: 'dist/leaflet-gesture-handling.css'
	},
	{
		absWorkingDir: root,
		entryPoints: ['src/index.css'],
		outfile: 'dist/leaflet-gesture-handling.min.css',
		minify: true
	}
];

export async function build({ watch = false } = {}) {
	await mkdir(resolve(root, 'dist'), { recursive: true });
	await cp(resolve(root, 'src/locales'), resolve(root, 'dist/locales'), { recursive: true });

	if (!watch) {
		await Promise.all(builds.map(options => esbuildBuild(options)));
		return;
	}

	const contexts = await Promise.all(builds.map(options => context(options)));
	try {
		await Promise.all(contexts.map(builder => builder.watch()));
	} catch (error) {
		await Promise.all(contexts.map(builder => builder.dispose()));
		throw error;
	}
	return () => Promise.all(contexts.map(builder => builder.dispose()));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	await build();
}
