import { TextLineStream } from 'std/streams/text_line_stream.ts';

export function stream(input: ReadableStream<Uint8Array>) {
	let decoder = new TextDecoderStream();
	let split = new TextLineStream({ allowCR: true });
	return input.pipeThrough(decoder).pipeThrough(split);
}

export function partition(input: string, delimiter: string) {
	let idx = input.indexOf(delimiter);

	if (idx === -1) {
		return [input, ''];
	}

	return [
		input.substring(0, idx),
		input.substring(idx + delimiter.length),
	];
}

export function fallback(headers: Headers, key: string, value: string) {
	let tmp = headers.get(key);
	if (!tmp) headers.set(key, value);
}
