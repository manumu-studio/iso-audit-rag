// Typed fetch helpers for the FastAPI backend with Zod-validated responses.
import {
  ApiErrorSchema,
  AskResponseSchema,
  HealthResponseSchema,
  UploadResponseSchema,
} from "./schemas";
import type { AskResponse, HealthResponse, UploadResponse } from "./types";

const DEFAULT_API_BASE = "http://localhost:8000";

function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_API_BASE;
  }
  return raw.replace(/\/$/, "");
}

function hasDetailField(value: unknown): value is { detail: unknown } {
  return typeof value === "object" && value !== null && "detail" in value;
}

function stringifyDetail(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "Unknown error";
  }
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "ApiClientError";
  }
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const rawUnknown: unknown = await response.clone().json();
    return extractErrorDetail(rawUnknown, response.statusText);
  } catch {
    // Fall through to status text.
  }
  return response.statusText || "Request failed";
}

function extractErrorDetail(rawUnknown: unknown, fallback: string): string {
  const parsed = ApiErrorSchema.safeParse(rawUnknown);
  if (parsed.success) {
    return parsed.data.detail;
  }
  if (hasDetailField(rawUnknown)) {
    return stringifyDetail(rawUnknown.detail);
  }
  return fallback || "Request failed";
}

function parseErrorDetailFromBodyText(bodyText: string, fallback: string): string {
  if (bodyText.trim() === "") {
    return fallback || "Request failed";
  }
  try {
    const rawUnknown: unknown = JSON.parse(bodyText);
    return extractErrorDetail(rawUnknown, fallback);
  } catch {
    return fallback || "Request failed";
  }
}

export async function fetchApi(
  path: string,
  init: {
    method?: string;
    body?: BodyInit | null;
    headers?: HeadersInit;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  const url = `${getApiBaseUrl()}${path}`;
  const headers = new Headers(init.headers);
  const body = init.body ?? undefined;

  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(url, {
    method: init.method ?? "GET",
    headers,
    ...(body !== undefined ? { body } : {}),
    ...(init.signal !== undefined ? { signal: init.signal } : {}),
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new ApiClientError(
      `Request failed with status ${String(response.status)}`,
      response.status,
      detail,
    );
  }

  return response;
}

export async function askQuestion(question: string): Promise<AskResponse> {
  const response = await fetchApi("/ask", {
    method: "POST",
    body: JSON.stringify({ question } satisfies { question: string }),
  });
  const rawUnknown: unknown = await response.json();
  return AskResponseSchema.parse(rawUnknown);
}

export async function uploadDocument(
  file: File,
  options?: { onProgress?: (percent: number) => void },
): Promise<UploadResponse> {
  const url = `${getApiBaseUrl()}/upload`;

  if (globalThis.XMLHttpRequest === undefined) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetchApi("/upload", {
      method: "POST",
      body: formData,
    });
    const rawUnknown: unknown = await response.json();
    return UploadResponseSchema.parse(rawUnknown);
  }

  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (options?.onProgress !== undefined && event.lengthComputable && event.total > 0) {
        const pct = Math.round((event.loaded / event.total) * 100);
        options.onProgress(pct);
      }
    };

    xhr.onerror = () => {
      reject(new ApiClientError("Network error during upload", 0, "Couldn't reach the server"));
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        const detail = parseErrorDetailFromBodyText(xhr.responseText, xhr.statusText);
        reject(
          new ApiClientError(
            `Request failed with status ${String(xhr.status)}`,
            xhr.status,
            detail,
          ),
        );
        return;
      }

      try {
        const rawUnknown: unknown = JSON.parse(xhr.responseText);
        resolve(UploadResponseSchema.parse(rawUnknown));
      } catch (error: unknown) {
        reject(error);
      }
    };

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetchApi("/health");
  const rawUnknown: unknown = await response.json();
  return HealthResponseSchema.parse(rawUnknown);
}
