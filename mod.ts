import * as utils from './utils.ts';

import type { ServerSentEventMessage } from 'std/http/server_sent_event_stream.ts';

export type { ServerSentEventMessage };

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

		event ||= {};
		if (field === 'data') {
			event.data = value;
		} else {
			console.warn('[TODO] sse', { field, value });
		}
	}
}

export async function stream(input: RequestInfo | URL, init?: RequestInit) {
	let req = new Request(input, init);
	utils.fallback(req.headers, 'Accept', 'text/event-stream');
	utils.fallback(req.headers, 'Content-Type', 'application/json');

	let r = await fetch(req);
	if (!r.ok) throw r;

	return events(r, req.signal);
}
