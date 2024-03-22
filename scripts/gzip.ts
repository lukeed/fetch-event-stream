// deno-lint-ignore-file no-deprecated-deno-api

import { assert } from 'std/assert/assert.ts';

let bundle = await Deno.run({
	cmd: [Deno.execPath(), 'bundle', 'mod.ts'],
	stdout: 'piped',
}).output();

let minify = Deno.run({
	cmd: ['minify', '--type=js'],
	stdin: 'piped',
	stdout: 'piped',
});

let bytes = {
	min: 0,
	gzip: 0,
};

let stream = minify.stdout.readable.pipeThrough(
	new TransformStream({
		transform(chunk, ctrl) {
			bytes.min += chunk.length;
			ctrl.enqueue(chunk);
		},
	}),
).pipeThrough(
	new CompressionStream('gzip'),
);

await minify.stdin.write(bundle);
minify.stdin.close();

let pid = await minify.status();
assert(pid.code === 0, 'minify error');

let reader = stream.getReader();
while (true) {
	let tmp = await reader.read();
	if (tmp.done) break;
	bytes.gzip += tmp.value.length;
}

console.log('bytes (raw):', bundle.length.toLocaleString());
console.log('bytes (minify):', bytes.min.toLocaleString());
console.log('bytes (gzip):', bytes.gzip.toLocaleString());
