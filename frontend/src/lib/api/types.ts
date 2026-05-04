// TypeScript types inferred from Zod schemas plus outbound request shapes.
import type { z } from "zod";
import type {
  ApiErrorSchema,
  AskResponseSchema,
  CitationSchema,
  HealthResponseSchema,
  MetaInfoSchema,
  UploadResponseSchema,
} from "./schemas";

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type MetaInfo = z.infer<typeof MetaInfoSchema>;
export type AskResponse = z.infer<typeof AskResponseSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export interface AskRequest {
  question: string;
}

/** Callbacks for `askQuestionStream` (SSE token/done/error). */
export interface AskQuestionStreamCallbacks {
  onToken: (text: string) => void;
  onDone: (citations: Citation[], meta: MetaInfo) => void;
  onError: (message: string) => void;
}
