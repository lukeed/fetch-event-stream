import { build } from 'npm:esbuild@0.20.2';
import { denoPlugins } from 'jsr:@luca/esbuild-deno-loader@^0.10.3';

function toAbsolute(id: string) {
	return new URL(import.meta.resolve(id)).pathname;
}

const result = await build({
	bundle: true,
	format: 'esm',
	entryPoints: [
		'./mod.ts',
	],
	minify: true,
	treeShaking: true,
	write: false,
	plugins: denoPlugins({
		configPath: toAbsolute('../deno.json'),
		lockPath: toAbsolute('../deno.lock'),
	}),
});

const output = result.outputFiles[0].contents;

const bytes = {
	min: output.length,
	gzip: 0,
};

const stream = new ReadableStream({
	start(ctrl) {
		ctrl.enqueue(output);
		ctrl.close();
	},
}).pipeThrough(
	new CompressionStream('gzip'),
);

const reader = stream.getReader();

while (true) {
	const tmp = await reader.read();
	if (tmp.done) break;
	bytes.gzip += tmp.value.length;
}

console.log('bytes (minify):', bytes.min.toLocaleString());
console.log('bytes (gzip):', bytes.gzip.toLocaleString());
