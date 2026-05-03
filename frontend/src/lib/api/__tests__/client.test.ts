// Unit tests for the typed fetch helpers that call the FastAPI backend.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, askQuestion, checkHealth, uploadDocument } from "../client";

/* ------------------------------------------------------------------ */
/*  Mock helpers                                                       */
/* ------------------------------------------------------------------ */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : "Server Error",
    headers: { "Content-Type": "application/json" },
  });
}

/* ------------------------------------------------------------------ */
/*  Suite                                                               */
/* ------------------------------------------------------------------ */

describe("API client", () => {
  let previousApiUrl: string | undefined;

  beforeEach(() => {
    previousApiUrl = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";

    vi.stubGlobal("fetch", vi.fn());
    // Ensure XMLHttpRequest is undefined so uploadDocument uses fetchApi path
    vi.stubGlobal("XMLHttpRequest", undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    if (previousApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = previousApiUrl;
    }
  });

  it("askQuestion sends POST /ask with the question body", async () => {
    const mockBody = {
      answer: "Access controls require...",
      citations: [
        { control_id: "AC-01", title: "Access Control Policy", family: "Access Control", relevance_score: 0.95 },
      ],
      meta: { model: "claude-3", search_method: "hybrid", latency_ms: 120, controls_searched: 50 },
    };

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(mockBody));

    const result = await askQuestion("What is AC-01?");

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe("http://localhost:8000/ask");
    expect((init as RequestInit).method).toBe("POST");

    const sentBody: unknown = JSON.parse((init as RequestInit).body as string);
    expect(sentBody).toEqual({ question: "What is AC-01?" });

    expect(result.answer).toBe("Access controls require...");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]?.control_id).toBe("AC-01");
  });

  it("uploadDocument sends multipart FormData with the file", async () => {
    const mockBody = {
      document_id: "550e8400-e29b-41d4-a716-446655440000",
      filename: "policy.pdf",
      chunks_created: 12,
    };

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(mockBody));

    const file = new File(["fake-pdf-content"], "policy.pdf", { type: "application/pdf" });
    const result = await uploadDocument(file);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe("http://localhost:8000/upload");
    expect((init as RequestInit).method).toBe("POST");

    const body = (init as RequestInit).body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBeInstanceOf(File);

    expect(result.document_id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.chunks_created).toBe(12);
  });

  it("checkHealth sends GET /health and parses response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ status: "ok" }));

    const result = await checkHealth();

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe("http://localhost:8000/health");
    expect((init as RequestInit).method).toBe("GET");

    expect(result.status).toBe("ok");
  });

  it("throws ApiClientError on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ detail: "Rate limit exceeded" }, 429),
    );

    await expect(checkHealth()).rejects.toThrow(ApiClientError);

    try {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({ detail: "Internal failure" }, 500),
      );
      await checkHealth();
      expect.unreachable("Should have thrown");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ApiClientError);
      const apiError = error as ApiClientError;
      expect(apiError.status).toBe(500);
      expect(apiError.detail).toBe("Internal failure");
    }
  });

  it("Zod rejects malformed response missing required fields", async () => {
    // Missing 'citations' and 'meta' fields
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ answer: "partial response" }),
    );

    await expect(askQuestion("test")).rejects.toThrow();
  });
});
