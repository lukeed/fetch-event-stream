import { resolve } from '@std/path';
import { assert } from '@std/assert';

import * as semver from 'jsr:@std/semver@1.0.6';

type Options = Deno.CommandOptions & {
	args: string[];
};

async function run(label: string, options: Options) {
	let bin = options.args.shift()!;
	let pid = new Deno.Command(bin, options);
	let p = await pid.spawn().status;
	assert(p.code === 0, label);
}

const v = semver.parse(Deno.args[0]);
const version = semver.format(v);

const file = resolve('./deno.json');
const Config = JSON.parse(await Deno.readTextFile(file));

await run('build npm package', {
	args: ['deno', 'task', 'build', version],
});

Config.version = version;
const contents = JSON.stringify(Config, null, 2);
await Deno.writeTextFile(file, contents);

// prevent CI error
await run('deno fmt', {
	args: ['deno', 'fmt', file],
});

await run('publish npm package', {
	args: ['npm', 'publish'],
	cwd: resolve('npm'),
});

await run('publish jsr package', {
	args: ['deno', 'publish', '--allow-dirty'],
});

await run('git add', {
	args: ['git', 'add', file],
});

await run('git commit', {
	args: ['git', 'commit', '-m', version],
});

await run('git tag', {
	args: ['git', 'tag', version],
});

await run('git push', {
	args: ['git', 'push', 'origin', 'main', '--tags'],
});
