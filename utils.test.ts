import { assertEquals } from 'std/assert/mod.ts';
import { fallback, split, stream } from './utils.ts';

Deno.test('stream should correctly pipe input through TextDecoderStream and TextLineStream', async () => {
	const input = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('Hello\nWorld'));
			controller.close();
		},
	});

	const resultStream = stream(input);
	const reader = resultStream.getReader();
	const line1 = await reader.read();
	assertEquals(line1.value, 'Hello');

	const line2 = await reader.read();
	assertEquals(line2.value, 'World');
});

Deno.test('split should parse a `field:value` line', () => {
	const result = split('key:value');
	assertEquals(result, ['key', 'value']);
});

Deno.test('split should parse a `field: value` line', () => {
	const result = split('key: value');
	assertEquals(result, ['key', 'value']);
});

Deno.test('split should parse a `field: foo:bar` line', () => {
	const result = split('key: foo:bar');
	assertEquals(result, ['key', 'foo:bar']);
});

Deno.test('split should parse a `field: foo: bar` line', () => {
	const result = split('key: foo: bar');
	assertEquals(result, ['key', 'foo: bar']);
});

Deno.test('split should return void if no field delimiter found', () => {
	const result = split('keyvalue');
	assertEquals(result, undefined);
});

Deno.test('split should return void if comment', () => {
	const result = split(': foobar');
	assertEquals(result, undefined);
});

Deno.test('fallback should set header if not already set', () => {
	const headers = new Headers();
	fallback(headers, 'Content-Type', 'application/json');
	assertEquals(headers.get('Content-Type'), 'application/json');
});

Deno.test('fallback should not overwrite existing header', () => {
	const headers = new Headers();
	headers.set('Content-Type', 'text/plain');
	fallback(headers, 'Content-Type', 'application/json');
	assertEquals(headers.get('Content-Type'), 'text/plain');
});
