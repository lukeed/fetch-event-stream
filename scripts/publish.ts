// deno-lint-ignore-file no-deprecated-deno-api
import { resolve } from '@std/path';
import { assert } from '@std/assert';

import * as semver from 'https://deno.land/x/semver@v1.4.1/mod.ts';

type Options = Parameters<typeof Deno.run>[0];
async function run(label: string, options: Options) {
	const p = await Deno.run(options).status();
	assert(p.code === 0, label);
}

const version = semver.valid(Deno.args[0]);
assert(version, 'Invalid version!');

const file = resolve('./deno.json');
const Config = JSON.parse(await Deno.readTextFile(file));

await run('build npm package', {
	cmd: ['deno', 'task', 'build', version],
});

Config.version = version;
const contents = JSON.stringify(Config, null, 2);
await Deno.writeTextFile(file, contents);

// prevent CI error
await run('deno fmt', {
	cmd: ['deno', 'fmt', file],
});

await run('publish npm package', {
	cmd: ['npm', 'publish'],
	cwd: resolve('npm'),
});

await run('publish jsr package', {
	cmd: ['deno', 'publish', '--allow-dirty'],
});

await run('git add', {
	cmd: ['git', 'add', file],
});

await run('git commit', {
	cmd: ['git', 'commit', '-m', version],
});

await run('git tag', {
	cmd: ['git', 'tag', version],
});

await run('git push', {
	cmd: ['git', 'push', 'origin', 'main', '--tags'],
});
