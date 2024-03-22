import { assertEquals } from 'std/assert/mod.ts';
import { fallback, partition, stream } from './utils.ts';

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

Deno.test('partition should correctly split input based on delimiter', () => {
	const result = partition('key:value', ':');
	assertEquals(result, ['key', 'value']);
});

Deno.test('partition should return input and empty string if delimiter not found', () => {
	const result = partition('keyvalue', ':');
	assertEquals(result, ['keyvalue', '']);
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
