// Unit tests for the UploadButton component (PDF picker and upload flow).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadButton } from "../UploadButton";
import type { ChatState } from "@/components/Chat/Chat.types";
import type { ToastVariant } from "@/components/Toast/Toast.types";

/* ------------------------------------------------------------------ */
/*  Mock the API client module                                         */
/* ------------------------------------------------------------------ */

vi.mock("@/lib/api", () => ({
  uploadDocument: vi.fn(),
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

const { uploadDocument } = await import("@/lib/api");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const idleChatState: ChatState = { status: "idle" };

function renderUpload(overrides?: {
  chatState?: ChatState;
  showToast?: (message: string, variant: ToastVariant) => void;
  onUploadProcessed?: (filename: string, chunksCreated: number) => void;
}) {
  const showToast = overrides?.showToast ?? vi.fn();
  const onUploadProcessed = overrides?.onUploadProcessed ?? vi.fn();

  return {
    showToast,
    onUploadProcessed,
    ...render(
      <UploadButton
        chatState={overrides?.chatState ?? idleChatState}
        showToast={showToast}
        onUploadProcessed={onUploadProcessed}
      />,
    ),
  };
}

/* ------------------------------------------------------------------ */
/*  Suite                                                               */
/* ------------------------------------------------------------------ */

describe("UploadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the upload button with the correct title", () => {
    renderUpload();

    const button = screen.getByTitle("Upload PDF document");
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it("opens file picker on click", async () => {
    const user = userEvent.setup();
    renderUpload();

    const button = screen.getByTitle("Upload PDF document");

    // The hidden file input should exist
    const fileInput = document.querySelector("input[type='file']");
    expect(fileInput).not.toBeNull();
    expect(fileInput?.getAttribute("accept")).toBe(".pdf,application/pdf");

    // Clicking the button should trigger input click (via ref)
    const clickSpy = vi.spyOn(fileInput as HTMLInputElement, "click");
    await user.click(button);
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("calls onUploadProcessed after successful upload", async () => {
    const user = userEvent.setup();
    const onUploadProcessed = vi.fn();

    vi.mocked(uploadDocument).mockResolvedValueOnce({
      document_id: "550e8400-e29b-41d4-a716-446655440000",
      filename: "report.pdf",
      chunks_created: 8,
    });

    renderUpload({ onUploadProcessed });

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const pdfFile = new File(["fake-pdf"], "report.pdf", { type: "application/pdf" });

    await user.upload(fileInput, pdfFile);

    await waitFor(() => {
      expect(uploadDocument).toHaveBeenCalledOnce();
    });

    await waitFor(() => {
      expect(onUploadProcessed).toHaveBeenCalledWith("report.pdf", 8);
    });
  });
});
