// Zod schemas validating backend JSON responses before use in the UI.
import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.string(),
});

export const CitationSchema = z.object({
  control_id: z.string(),
  title: z.string(),
  family: z.string(),
  relevance_score: z.number(),
});

export const MetaInfoSchema = z.object({
  model: z.string(),
  search_method: z.string(),
  latency_ms: z.number(),
  controls_searched: z.number(),
});

export const AskResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
  meta: MetaInfoSchema,
});

export const UploadResponseSchema = z.object({
  document_id: z.string().uuid(),
  filename: z.string(),
  chunks_created: z.number(),
});

export const ApiErrorSchema = z.object({
  detail: z.string(),
});
