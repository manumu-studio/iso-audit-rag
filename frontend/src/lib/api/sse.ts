// Incremental SSE parser for fetch() ReadableStream bodies (POST-friendly; no EventSource).
export interface SSEEvent {
  event: string;
  data: string;
}

function normalizeNewlines(raw: string): string {
  return raw.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

/**
 * Yield complete SSE events from a byte stream. Buffers until `\n\n` boundaries.
 */
export async function* parseSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    const normalized = normalizeNewlines(buffer);
    const parts = normalized.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const rawEvent of parts) {
      if (rawEvent.trim() === "") {
        continue;
      }

      let eventName = "message";
      const dataLines: string[] = [];

      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice("event:".length).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).trimStart());
        }
      }

      if (dataLines.length === 0) {
        continue;
      }

      yield { event: eventName, data: dataLines.join("\n") };
    }
  }
}
