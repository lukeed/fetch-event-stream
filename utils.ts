import { TextLineStream } from '@std/streams/text_line_stream';

export function stream(input: ReadableStream<Uint8Array>) {
	let decoder = new TextDecoderStream();
	let split = new TextLineStream({ allowCR: true });
	return input.pipeThrough(decoder).pipeThrough(split);
}

export function split(input: string) {
	let rgx = /[:]\s*/;
	let match = rgx.exec(input);
	// ": comment" -> index=0 -> ignore
	let idx = match && match.index;
	if (idx) {
		return [
			input.substring(0, idx),
			input.substring(idx + match![0].length),
		];
	}
}

export function fallback(headers: Headers, key: string, value: string) {
	let tmp = headers.get(key);
	if (!tmp) headers.set(key, value);
}
