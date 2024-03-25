// deno-lint-ignore-file no-deprecated-deno-api

import { assert } from 'std/assert/assert.ts';
import { resolve } from 'std/path/resolve.ts';
import * as semver from 'https://deno.land/x/semver@v1.4.1/mod.ts';

type Options = Parameters<typeof Deno.run>[0];
async function run(label: string, options: Options) {
	let p = await Deno.run(options).status();
	assert(p.code === 0, label);
}

const version = semver.valid(Deno.args[0]);
assert(version, 'Invalid version!');

await run('build npm package', {
	cmd: ['deno', 'task', 'build', version],
});

await run('publish npm package', {
	cmd: ['npm', 'publish'],
	cwd: resolve('npm'),
});

await run('git tag', {
	cmd: ['git', 'tag', version],
});

await run('git push', {
	cmd: ['git', 'push', '--tags'],
});
