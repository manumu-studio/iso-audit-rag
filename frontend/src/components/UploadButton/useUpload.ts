// Upload orchestration: validation, progress tracking, and backend handoff.
"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiClientError, uploadDocument } from "@/lib/api";
import { ZodError } from "zod";
import type { UploadState } from "./UploadButton.types";

const MAX_BYTES = 20 * 1024 * 1024;

function isPdfFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const extensionOk = lowerName.endsWith(".pdf");
  const mimeOk =
    file.type === "application/pdf" || file.type === "" || file.type === "application/octet-stream";
  return extensionOk && mimeOk;
}

export function useUpload(
  showToast: (message: string, variant: "success" | "error") => void,
  onUploadProcessed: (filename: string, chunksCreated: number) => void,
): {
  uploadState: UploadState;
  startUpload: (file: File) => Promise<void>;
  resetUpload: () => void;
} {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });

  const resetUpload = useCallback(() => {
    setUploadState({ status: "idle" });
  }, []);

  useEffect(() => {
    if (uploadState.status !== "success" && uploadState.status !== "error") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setUploadState({ status: "idle" });
    }, 5000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [uploadState]);

  const startUpload = useCallback(
    async (file: File) => {
      if (!isPdfFile(file)) {
        showToast("Only PDF files are supported", "error");
        setUploadState({
          status: "error",
          error: "Only PDF files are supported",
        });
        return;
      }

      if (file.size > MAX_BYTES) {
        showToast("File exceeds 20MB limit", "error");
        setUploadState({ status: "error", error: "File too large (max 20MB)" });
        return;
      }

      setUploadState({ status: "uploading", filename: file.name, progress: 0 });

      try {
        const response = await uploadDocument(file, {
          onProgress: (percent) => {
            setUploadState({
              status: "uploading",
              filename: file.name,
              progress: percent,
            });
          },
        });

        setUploadState({
          status: "success",
          filename: response.filename,
          chunksCreated: response.chunks_created,
        });

        showToast(
          `✓ ${response.filename} uploaded — ${String(response.chunks_created)} chunks created`,
          "success",
        );
        onUploadProcessed(response.filename, response.chunks_created);
      } catch (error: unknown) {
        if (error instanceof ApiClientError) {
          if (error.status === 0) {
            showToast("Couldn't reach the server", "error");
          } else {
            showToast("Upload failed — please try again", "error");
          }
          setUploadState({
            status: "error",
            error:
              error.status === 0 ? "Couldn't reach the server" : "Upload failed — please try again",
          });
          return;
        }

        if (error instanceof ZodError) {
          showToast("Upload failed — please try again", "error");
          setUploadState({
            status: "error",
            error: "Upload failed — please try again",
          });
          return;
        }

        showToast("Upload failed — please try again", "error");
        setUploadState({
          status: "error",
          error: "Upload failed — please try again",
        });
      }
    },
    [onUploadProcessed, showToast],
  );

  return { uploadState, startUpload, resetUpload };
}
