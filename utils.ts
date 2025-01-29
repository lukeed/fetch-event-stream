import { TextLineStream } from '@std/streams/text-line-stream';

export function stream(input: ReadableStream<Uint8Array>) {
	const decoder = new TextDecoderStream();
	const split = new TextLineStream({ allowCR: true });
	return input.pipeThrough(decoder).pipeThrough(split);
}

export function split(input: string) {
	const rgx = /[:]\s*/;
	const match = rgx.exec(input);
	// ": comment" -> index=0 -> ignore
	const idx = match && match.index;
	if (idx) {
		return [
			input.substring(0, idx),
			input.substring(idx + match![0].length),
		];
	}
}

export function fallback(headers: Headers, key: string, value: string) {
	const tmp = headers.get(key);
	if (!tmp) headers.set(key, value);
}
