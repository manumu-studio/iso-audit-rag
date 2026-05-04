// Tests for useChat streaming state machine and /ask fallback.
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "../useChat";

vi.mock("@/lib/api", () => ({
  askQuestion: vi.fn(),
  askQuestionStream: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    status: number;
    detail: string;
    constructor(message: string, status: number, detail: string) {
      super(message);
      this.name = "ApiClientError";
      this.status = status;
      this.detail = detail;
    }
  },
}));

const { askQuestion, askQuestionStream } = await import("@/lib/api");

const emptyMeta = {
  model: "claude-3",
  search_method: "hybrid_rrf",
  latency_ms: 10,
  controls_searched: 42,
};

describe("useChat streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("goes loading → streaming → idle while tokens arrive", async () => {
    vi.mocked(askQuestionStream).mockImplementation(async (_q, callbacks) => {
      callbacks.onToken("Hello ");
      callbacks.onToken("world");
      callbacks.onDone([], { ...emptyMeta, latency_ms: 5 });
    });

    const { result } = renderHook(() => useChat());

    expect(result.current.chatState.status).toBe("idle");

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    await waitFor(() => {
      expect(result.current.chatState.status).toBe("idle");
    });

    const assistant = result.current.messages.filter((m) => m.role === "assistant").at(-1);
    expect(assistant?.content).toBe("Hello world");
    expect(assistant?.streaming).toBe(false);
    expect(askQuestion).not.toHaveBeenCalled();
  });

  it("falls back to askQuestion when streaming fails", async () => {
    const { ApiClientError } = await import("@/lib/api");

    vi.mocked(askQuestionStream).mockRejectedValueOnce(
      new ApiClientError("stream failed", 502, "bad gateway"),
    );
    vi.mocked(askQuestion).mockResolvedValueOnce({
      answer: "Blocking answer",
      citations: [],
      meta: { ...emptyMeta, latency_ms: 20 },
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("Q");
    });

    await waitFor(() => {
      expect(result.current.chatState.status).toBe("idle");
    });

    expect(askQuestion).toHaveBeenCalledWith("Q");
    const assistant = result.current.messages.filter((m) => m.role === "assistant").at(-1);
    expect(assistant?.content).toBe("Blocking answer");
  });

  it("passes an AbortSignal into askQuestionStream", async () => {
    const signals: AbortSignal[] = [];

    vi.mocked(askQuestionStream).mockImplementation(async (_q, callbacks, signal) => {
      if (signal !== undefined) {
        signals.push(signal);
      }
      callbacks.onToken("ok");
      callbacks.onDone([], { ...emptyMeta });
      await Promise.resolve();
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("one");
    });

    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals[0]?.aborted).toBe(false);
  });
});
