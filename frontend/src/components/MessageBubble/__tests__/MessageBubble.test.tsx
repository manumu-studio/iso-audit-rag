// Unit tests for the MessageBubble component rendering user and assistant messages.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MessageBubble } from "../MessageBubble";
import type { Message } from "@/components/Chat/Chat.types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeMessage(overrides: Partial<Message> & Pick<Message, "role" | "content">): Message {
  return {
    id: "test-id-1",
    timestamp: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Suite                                                               */
/* ------------------------------------------------------------------ */

describe("MessageBubble", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a user message with the correct text and styling", () => {
    const message = makeMessage({ role: "user", content: "What are access controls?" });

    const { container } = render(<MessageBubble message={message} />);

    expect(screen.getByText("What are access controls?")).toBeInTheDocument();

    // User bubble has ml-auto for right alignment
    const bubble = container.firstElementChild;
    expect(bubble?.classList.contains("ml-auto")).toBe(true);
  });

  it("renders an assistant message with markdown content", () => {
    const message = makeMessage({
      role: "assistant",
      content: "Access controls **require** proper authentication.",
    });

    render(<MessageBubble message={message} />);

    // The bold text should be rendered
    expect(screen.getByText("require")).toBeInTheDocument();
    expect(screen.getByText(/Access controls/)).toBeInTheDocument();
    expect(screen.getByText(/proper authentication/)).toBeInTheDocument();
  });

  it("displays citation pills and source panel when citations are present", () => {
    const message = makeMessage({
      role: "assistant",
      content: "See [AC-01] for access policy details.",
      citations: [
        { control_id: "AC-01", title: "Access Control Policy", family: "Access Control", relevance_score: 0.92 },
      ],
    });

    render(<MessageBubble message={message} />);

    // Citation pill should render the control ID
    const pill = screen.getByRole("button", { name: "AC-01" });
    expect(pill).toBeInTheDocument();

    // Citation panel should show sources count
    const sourcesButton = screen.getByText(/Sources \(1 controls\)/);
    expect(sourcesButton).toBeInTheDocument();

    // The citation panel content should contain the control details
    expect(screen.getByText("Access Control Policy")).toBeInTheDocument();
    expect(screen.getByText("Access Control")).toBeInTheDocument();
  });
});
