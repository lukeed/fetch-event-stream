import * as utils from './utils.ts';

import type { ServerSentEventMessage } from '@std/http/server-sent-event-stream';

export type { ServerSentEventMessage };

/**
 * Convert a `Response` body containing Server Sent Events (SSE) into an Async Iterator that yields {@linkcode ServerSentEventMessage} objects.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events}
 *
 * @example
 * ```js
 * // Optional
 * const abort = new AbortController;
 *
 * // Manually fetch a Response
 * const res = await fetch('https://...', {
 *   method: 'POST',
 *   signal: abort.signal,
 *   headers: {
 *     'api-key': 'token <value>',
 *     'content-type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     stream: true, // <- hypothetical
 *     // ...
 *   })
 * });
 *
 * if (res.ok) {
 *   const stream = events(res, abort.signal);
 *   for await (const event of stream) {
 *     console.log('<<', event.data);
 *   }
 * }
 * ```
 */
export async function* events(
	res: Response,
	signal?: AbortSignal | null,
): AsyncGenerator<ServerSentEventMessage, void, unknown> {
	// TODO: throw error?
	if (!res.body) return;

	const iter = utils.stream(res.body);
	const reader = iter.getReader();
	let event: ServerSentEventMessage | undefined;

	for (;;) {
		if (signal && signal.aborted) {
			return reader.cancel();
		}

		const line = await reader.read();
		if (line.done) return;

		if (!line.value) {
			if (event) yield event;
			event = undefined;
			continue;
		}

		const [field, value] = utils.split(line.value) || [];
		if (!field) continue; // comment or invalid

		if (field === 'data') {
			event ||= {};
			event[field] = event[field] ? (event[field] + '\n' + value) : value;
		} else if (field === 'event') {
			event ||= {};
			event[field] = value;
		} else if (field === 'id') {
			event ||= {};
			event[field] = +value || value;
		} else if (field === 'retry') {
			event ||= {};
			event[field] = +value || undefined;
		}
	}
}

/**
 * Convenience function that will `fetch` with the given arguments and, if ok, will return the {@linkcode events} async iterator.
 *
 * If the response is not ok (status 200-299), the `Response` is thrown.
 *
 * @example
 * ```js
 * // NOTE: throws `Response` if not 2xx status
 * const events = await stream('https://api.openai.com/...', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer <token>',
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     stream: true,
 *     // ...
 *   })
 * });
 *
 * for await (const event of events) {
 *   console.log('<<', JSON.parse(event.data));
 * }
 * ```
 */
export async function stream(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<
	AsyncGenerator<ServerSentEventMessage, void, unknown>
> {
	const req = new Request(input, init);
	utils.fallback(req.headers, 'Accept', 'text/event-stream');
	utils.fallback(req.headers, 'Content-Type', 'application/json');

	const res = await fetch(req);
	if (!res.ok) throw res;

	return events(res, req.signal);
}
