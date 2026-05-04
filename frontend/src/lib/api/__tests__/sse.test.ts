// Unit tests for SSE line parser used by askQuestionStream.
import { describe, expect, it } from "vitest";
import { parseSSE } from "../sse";

function readerFromStringChunks(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[index]));
      index += 1;
    },
  }).getReader();
}

describe("parseSSE", () => {
  it("yields events split across chunk boundaries", async () => {
    const reader = readerFromStringChunks([
      'event: token\ndata: {"text":"Hel',
      'lo"}\n\nevent: token\ndata:',
      ' {"text":" world"}\n\n',
    ]);
    const collected: { event: string; data: string }[] = [];
    for await (const evt of parseSSE(reader)) {
      collected.push(evt);
    }
    expect(collected).toHaveLength(2);
    expect(collected[0]?.event).toBe("token");
    expect(collected[0]?.data).toBe('{"text":"Hello"}');
    expect(collected[1]?.data).toBe('{"text":" world"}');
  });

  it("normalizes CRLF and handles a done event", async () => {
    const reader = readerFromStringChunks(['event: done\r\ndata: {"citations":[],"meta":{}}\r\n\r\n']);
    const collected: { event: string; data: string }[] = [];
    for await (const evt of parseSSE(reader)) {
      collected.push(evt);
    }
    expect(collected).toHaveLength(1);
    expect(collected[0]?.event).toBe("done");
    expect(collected[0]?.data).toBe('{"citations":[],"meta":{}}');
  });

  it("joins multi-line data fields", async () => {
    const reader = readerFromStringChunks(['event: msg\ndata: line1\ndata: line2\n\n']);
    const collected: { event: string; data: string }[] = [];
    for await (const evt of parseSSE(reader)) {
      collected.push(evt);
    }
    expect(collected).toHaveLength(1);
    expect(collected[0]?.data).toBe("line1\nline2");
  });
});
