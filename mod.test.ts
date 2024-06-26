import { assertEquals, assertRejects } from '@std/assert';

import { ServerSentEventStream } from '@std/http/server-sent-event-stream';
import type { ServerSentEventMessage } from '@std/http/server-sent-event-stream';

import { events, stream } from './mod.ts';

let timer: ReturnType<typeof setTimeout> | undefined;
function sleep(ms: number) {
	return new Promise((r) => timer = setTimeout(r, ms));
}

function toInput(items: ServerSentEventMessage[], delay?: number) {
	let src = new ReadableStream<ServerSentEventMessage>({
		async start(ctrl) {
			for (let x of items) {
				ctrl.enqueue(x);
				if (delay) await sleep(delay);
			}
			ctrl.close();
		},
		cancel() {
			if (timer) {
				clearTimeout(timer);
			}
		},
	});

	return src.pipeThrough(new ServerSentEventStream());
}

async function collect<T>(input: AsyncGenerator<T, unknown, unknown>): Promise<T[]> {
	let output: T[] = [];
	for await (let item of input) {
		output.push(item);
	}
	return output;
}

Deno.test('events should yield no events for empty response body', async () => {
	const res = new Response(null);
	const iter = events(res);
	const result = await collect(iter);
	assertEquals(result, []);
});

Deno.test('events should break on signal abort', async () => {
	const body = toInput([
		{ data: 'hello' },
		{ data: 'world' },
	], 1000);

	const stop = new AbortController();
	const sse = events(new Response(body), stop.signal);

	// no await
	const task = sleep(150).then(() => {
		stop.abort();
	});

	const result = await collect(sse);

	await task;

	assertEquals(result.length, 1);
	assertEquals(result, [{ data: 'hello' }]);
});

Deno.test('stream should throw if response is not ok', async () => {
	await assertRejects(async () => {
		await stream('http://1782637816.com123');
	});
});

Deno.test('stream should set default headers if not provided', async () => {
	const prev = globalThis.fetch;

	// @ts-ignore; mock fetch
	globalThis.fetch = (req: Request) => {
		assertEquals(req.headers.get('Accept'), 'text/event-stream');
		assertEquals(req.headers.get('Content-Type'), 'application/json');
		return Promise.resolve(new Response());
	};

	try {
		await stream('http://example.com');
	} finally {
		// restore
		globalThis.fetch = prev;
	}
});

Deno.test('events should yield ServerSentEventMessage objects', async () => {
	const res = new Response(
		toInput([
			{ data: 'foobar' },
		]),
	);

	const iter = events(res);
	const result = await collect(iter);

	assertEquals(result, [{ data: 'foobar' }]);
});

Deno.test('events should yield ServerSentEventMessages w/ all fields', async () => {
	const res = new Response(
		toInput([
			{
				id: 'm1',
				event: 'message',
				data: 'hello',
			},
			{
				id: 'm2',
				event: 'message',
				data: 'world',
			},
		]),
	);

	const iter = events(res);
	const result = await collect(iter);

	assertEquals(result.length, 2);
	assertEquals(result, [
		{
			id: 'm1',
			event: 'message',
			data: 'hello',
		},
		{
			id: 'm2',
			event: 'message',
			data: 'world',
		},
	]);
});

Deno.test('junk events should not be yielded', async () => {
	const res = new Response(
		toInput([
			// @ts-expect-error; known invalid
			{ foo: 'm1', bar: 123 },
			// @ts-expect-error; known invalid
			{ a: 1, b: 2 },
			{ data: 'ok' },
		]),
	);

	const iter = events(res);
	const result = await collect(iter);

	assertEquals(result.length, 1);
	assertEquals(result, [{ data: 'ok' }]);
});

Deno.test('invalid event fields should be ignored', async () => {
	const res = new Response(
		toInput([{
			event: 'ok',
			data: 'hello world',
			// @ts-expect-error; known invalid
			foobar: 456,
		}]),
	);

	const iter = events(res);
	const result = await collect(iter);

	assertEquals(result.length, 1);
	assertEquals(result, [{
		event: 'ok',
		data: 'hello world',
	}]);
});

Deno.test('event.data should allow special unicode', async () => {
	const res = new Response(
		toInput([{
			data: '😅',
		}]),
	);

	const iter = events(res);
	const result = await collect(iter);

	assertEquals(result.length, 1);
	assertEquals(result, [{
		data: '😅',
	}]);
});

Deno.test('event.data should allow newlines', async () => {
	const res = new Response(
		toInput([{
			data: 'hello\nworld',
		}]),
	);

	const iter = events(res);
	const result = await collect(iter);

	assertEquals(result.length, 1);
	assertEquals(result, [{
		data: 'hello\nworld',
	}]);
});

Deno.test('event.retry should be number, if present', async () => {
	const res = new Response(
		toInput([{
			data: 'hello',
			retry: 123,
		}]),
	);

	const iter = events(res);
	const result = await collect(iter);

	assertEquals(result.length, 1);
	assertEquals(result, [{
		data: 'hello',
		retry: 123,
	}]);
});

Deno.test('event.retry should be undefined when invalid', async () => {
	const res = new Response(
		toInput([{
			data: 'hello',
			// @ts-expect-error; wrong type
			retry: 'foobar',
		}]),
	);

	const iter = events(res);
	const result = await collect(iter);

	assertEquals(result.length, 1);
	assertEquals(result, [{
		data: 'hello',
		retry: undefined,
	}]);
});

Deno.test('event.id should allow `number` type', async () => {
	const res = new Response(
		toInput([
			{ id: 123 },
		]),
	);

	const iter = events(res);
	const result = await collect(iter);

	assertEquals(result.length, 1);
	assertEquals(result, [
		{ id: 123 },
	]);
});

Deno.test('event.id should allow `string` type', async () => {
	const res = new Response(
		toInput([
			{ id: 'abc' },
		]),
	);

	const iter = events(res);
	const result = await collect(iter);

	assertEquals(result.length, 1);
	assertEquals(result, [
		{ id: 'abc' },
	]);
});
