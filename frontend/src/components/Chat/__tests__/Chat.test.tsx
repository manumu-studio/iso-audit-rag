// Integration tests for the primary Chat shell component.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chat } from "../Chat";

/* ------------------------------------------------------------------ */
/*  Mock the API client module                                         */
/* ------------------------------------------------------------------ */

vi.mock("@/lib/api", () => ({
  askQuestion: vi.fn(),
  uploadDocument: vi.fn(),
  checkHealth: vi.fn(),
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

// Import the mock after vi.mock so we can control return values
const { askQuestion } = await import("@/lib/api");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mockAskSuccess(answer = "This is the answer."): void {
  vi.mocked(askQuestion).mockResolvedValueOnce({
    answer,
    citations: [
      { control_id: "AC-01", title: "Access Control", family: "AC", relevance_score: 0.9 },
    ],
    meta: { model: "claude-3", search_method: "hybrid", latency_ms: 100, controls_searched: 50 },
  });
}

/* ------------------------------------------------------------------ */
/*  Suite                                                               */
/* ------------------------------------------------------------------ */

describe("Chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the message input textarea and send button", () => {
    render(<Chat />);

    expect(screen.getByPlaceholderText("Ask about compliance controls...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("sends a message on form submit and displays the response", async () => {
    const user = userEvent.setup();
    mockAskSuccess("Access control requires...");

    render(<Chat />);

    const textarea = screen.getByPlaceholderText("Ask about compliance controls...");
    const sendButton = screen.getByRole("button", { name: "Send" });

    await user.type(textarea, "What is AC-01?");
    await user.click(sendButton);

    expect(askQuestion).toHaveBeenCalledWith("What is AC-01?");

    await waitFor(() => {
      expect(screen.getByText("What is AC-01?")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Access control requires/)).toBeInTheDocument();
    });
  });

  it("shows loading state while waiting for API response", async () => {
    const user = userEvent.setup();

    // Never-resolving promise to keep loading state
    vi.mocked(askQuestion).mockReturnValueOnce(new Promise(() => {}));

    render(<Chat />);

    const textarea = screen.getByPlaceholderText("Ask about compliance controls...");
    await user.type(textarea, "Test question");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      // Send button should be disabled during loading
      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    });
  });

  it("displays error banner on API failure", async () => {
    const user = userEvent.setup();

    const { ApiClientError } = await import("@/lib/api");
    vi.mocked(askQuestion).mockRejectedValueOnce(
      new ApiClientError("Request failed", 500, "Backend unavailable"),
    );

    render(<Chat />);

    const textarea = screen.getByPlaceholderText("Ask about compliance controls...");
    await user.type(textarea, "Failing question");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
    });
  });
});
