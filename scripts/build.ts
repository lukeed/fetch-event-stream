import { build, emptyDir } from 'https://deno.land/x/dnt@0.40.0/mod.ts';

await emptyDir('./npm');

await build({
	entryPoints: ['./mod.ts'],
	outDir: './npm',
	shims: {
		// see JS docs for overview and more options
		deno: true,
	},

	declaration: 'separate',
	scriptModule: 'cjs',
	typeCheck: 'both',
	test: true,

	importMap: 'deno.json',

	package: {
		name: 'fetch-event-stream',
		version: Deno.args[0],
		repository: 'lukeed/fetch-event-stream',
		description: 'Server Sent Event (SSE) streaming via `fetch` and Web Streams API',
		license: 'MIT',
		author: {
			name: 'Luke Edwards',
			email: 'luke@lukeed.com',
			url: 'https://lukeed.com',
		},
		keywords: [
			'SSE',
			'Server-Sent Events',
			'Events',
			'EventSource',
		],
	},

	compilerOptions: {
		target: 'ES2022',
		lib: ['ES2022', 'WebWorker'],
	},

	filterDiagnostic(diag) {
		let txt = diag.messageText.toString();
		return !txt.includes(
			// ignore type error for missing Deno built-in information
			`Type 'ReadableStream<string>' must have a '[Symbol.asyncIterator]()' method that returns an async iterator`,
		);
	},

	async postBuild() {
		await Deno.copyFile('license', 'npm/license');
		await Deno.copyFile('readme.md', 'npm/readme.md');
	},
});
