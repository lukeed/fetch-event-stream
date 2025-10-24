<!-- deno-fmt-ignore-file -->
# fetch-event-stream [![CI](https://github.com/lukeed/fetch-event-stream/workflows/CI/badge.svg)](https://github.com/lukeed/fetch-event-stream/actions?query=workflow%3ACI) [![licenses](https://licenses.dev/b/npm/fetch-event-stream)](https://licenses.dev/npm/fetch-event-stream)

> A tiny (741b) utility for Server Sent Event (SSE) streaming via `fetch` and Web Streams API

* Allows any HTTP method
* Built with native [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
* Works with browser, Node.js, Cloudflare Workers, Deno, and Bun
* Supports WebWorker or Service Worker environments
* Accepts [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) for cancellable streams

***Why?***

1. Even though [`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) exists in browsers (and Deno!), it only sends `GET` requests and does not allow for custom HTTP headers. Most APIs (eg, Anthropic, OpenAI) require `POST` requests with an `Authorization` header and a JSON payload.

2. Web Streams are new, not very well understood, and are sometimes confused with NodeJS Streams. Because of this, many other libraries embed large polyfills or manually reconstruct desired behaviors through non-standard approaches. These polyfills are generally [not necessary](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API#browser_compatibility) anymore, but still make large impacts on SDK size; for example, [`openai`](https://bundlejs.com/?q=openai%404.29.2) is `17kB` (gzip).

## Install

> Available on [JSR](https://jsr.io/@lukeed/fetch-event-stream), [npm](https://www.npmjs.com/package/fetch-event-stream), and [deno.land](https://deno.land/x/fetch_event_stream)

```
$ npm install --save fetch-event-stream
```


## Usage

```ts
import { events, stream } from 'fetch-event-stream';
// or
import { events, stream } from 'https://deno.land/x/fetch_event_stream';
```


## API

### events(res, signal?)

Convert a `Response` body containing Server Sent Events (SSE) into an Async Iterator that yields
`ServerSentEventMessage` objects.

_**Example**_

```js
// Optional
let abort = new AbortController();

// Manually fetch a Response
let res = await fetch('https://...', {
  method: 'POST',
  signal: abort.signal,
  headers: {
    'api-key': 'token <value>',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    stream: true, // <- hypothetical
    // ...
  }),
});

if (res.ok) {
  let stream = events(res, abort.signal);
  for await (let event of stream) {
    console.log('<<', event.data);
  }
}
```

#### res
Type: `Response`

The `Response` to consume. Must contain a body that follows the Server-Sent Event message protocol.

#### signal
Type: `AbortSignal`

Optional. Use the `AbortController` interface to stop iteration. The stream will be destroyed.


### stream(input, init?)

Convenience function that will `fetch` with the given arguments and, if ok, will return the [`events`](#eventsres-signal) async iterator.

> **Note:** Accepts the same arguments as `fetch` but **does not** return a `Response`!

> **Important:** Will `throw` the `Response` if received non-`2xx` status code.

_**Example**_

```js
// NOTE: throws `Response` if not 2xx status
let events = await stream('https://api.openai.com/...', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    stream: true,
    // ...
  }),
});

for await (let event of events) {
  console.log('<<', JSON.parse(event.data));
}
```

#### input
Type: `Request | URL | string`

Refer to [`fetch#resource`](https://developer.mozilla.org/en-US/docs/Web/API/fetch#resource) documentation.

#### init
Type: `RequestInit`

Refer to [`fetch#options`](https://developer.mozilla.org/en-US/docs/Web/API/fetch#options) documentation.


## License

MIT © [Luke Edwards](https://lukeed.com)
