import * as utils from './utils.ts';

import type { ServerSentEventMessage } from 'std/http/server_sent_event_stream.ts';

export type { ServerSentEventMessage };

type K = keyof ServerSentEventMessage;
const Keys = new Set<K>(['data', 'event', 'id', 'retry']);

/**
 * Convert a `Response` body containing Server Sent Events (SSE) into an Async Iterator that yields {@linkcode ServerSentEventMessage} objects.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events}
 *
 * @example
 * ```js
 * // Optional
 * let abort = new AbortController;
 *
 * // Manually fetch a Response
 * let res = await fetch('https://...', {
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
 *   let stream = events(res, abort.signal);
 *   for await (let event of stream) {
 *     console.log('<<', event.data);
 *   }
 * }
 * ```
 */
export async function* events(
	res: Response,
	signal?: AbortSignal,
): AsyncGenerator<ServerSentEventMessage, void, unknown> {
	// TODO: throw error?
	if (!res.body) return;

	let iter = utils.stream(res.body);
	let event: ServerSentEventMessage | undefined;
	let line: string;

	for await (line of iter) {
		if (signal && signal.aborted) break;

		if (!line) {
			if (event) yield event;
			event = undefined;
			continue;
		}

		if (line.startsWith(':')) continue;

		let [field, value] = utils.partition(line, ':');
		if (value.startsWith(' ')) value = value.substring(1);

		// TODO: data.join(\n)
		if (Keys.has(field as K)) {
			event ||= {};
			// @ts-ignore; annoying
			event[field as K] = value;
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
 * let events = await stream('https://api.openai.com/...', {
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
 * for await (let event of events) {
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
	let req = new Request(input, init);
	utils.fallback(req.headers, 'Accept', 'text/event-stream');
	utils.fallback(req.headers, 'Content-Type', 'application/json');

	let r = await fetch(req);
	if (!r.ok) throw r;

	return events(r, req.signal);
}
