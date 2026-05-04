# Request Flow

How a user question travels from the browser to a cited answer.

## Query Pipeline

```mermaid
flowchart TB
  user[User types question] --> input[MessageInput component]
  input -->|submit| hook[useChat hook]
  hook -->|AbortController| client[API Client<br/>askQuestionStream]

  client -->|"POST /ask/stream<br/>SSE fetch"| fastapi[FastAPI route<br/>routes.py]

  subgraph retrieval["Hybrid Retrieval (search.py)"]
    direction TB
    embed_q["embed_single(query)<br/>OpenAI 1536-dim"] --> parallel
    subgraph parallel["Parallel Search"]
      direction LR
      bm25["BM25 full-text<br/>ts_rank_cd"]
      vector["pgvector cosine<br/>1 - (embedding <=> query)"]
    end
    parallel --> rrf["RRF Fusion<br/>k=60, top_k=10"]
    rrf --> results["Ranked SearchResult[]<br/>control_id · score · content"]
  end

  fastapi --> embed_q

  subgraph generation["LLM Generation (llm.py)"]
    direction TB
    context[Top-K chunks<br/>+ metadata] --> claude["Claude claude-sonnet-4-6<br/>system prompt + citations"]
    claude -->|streaming| tokens["Token-by-token<br/>SSE events"]
    tokens --> accumulate[Accumulate full answer]
    accumulate --> cite["Extract citations<br/>bracket pattern → SearchResult"]
  end

  results --> context

  subgraph response["SSE Response"]
    direction TB
    event_token["event: token<br/>data: {text: delta}"]
    event_done["event: done<br/>data: {citations, meta}"]
  end

  tokens --> event_token
  cite --> event_done

  subgraph frontend_render["Frontend Rendering"]
    direction TB
    sse_parser[SSE Parser<br/>sse.ts] --> chat_state[useChat state machine<br/>idle → loading → streaming → idle]
    chat_state --> bubble[MessageBubble<br/>+ streaming caret]
    chat_state --> pills[CitationPill badges]
    pills -->|click| panel[CitationPanel<br/>detail sidebar]
  end

  event_token --> sse_parser
  event_done --> sse_parser
```

## Fallback Path

If SSE streaming fails, the client automatically falls back to the JSON endpoint.

```mermaid
flowchart LR
  ask_stream["/ask/stream (SSE)"] -->|"network error<br/>or parse failure"| fallback[Catch in useChat]
  fallback --> ask_json["/ask (JSON)<br/>blocking request"]
  ask_json --> zod[Zod schema validation<br/>AskResponseSchema.parse]
  zod --> render[Render answer<br/>+ citations]
```

## Type Safety Chain

Data is validated at every boundary crossing:

```mermaid
flowchart LR
  db[(PostgreSQL)] -->|asyncpg Row| pydantic[Pydantic models<br/>SearchResult · Citation]
  pydantic -->|JSON response| sse[SSE event frames]
  sse -->|fetch ReadableStream| parser[parseSSE generator]
  parser -->|typed events| zod[Zod schemas<br/>StreamTokenPayloadSchema<br/>StreamDoneSchema]
  zod -->|validated data| react[React state<br/>ChatMessage type]
```

## Response Timing

| Phase | What happens | Measured by |
|-------|-------------|-------------|
| Embedding | Query → 1536-dim vector | — |
| Search | BM25 + vector parallel, RRF merge | — |
| First token | Claude starts generating | `time.monotonic()` |
| Streaming | Tokens arrive via SSE | Client renders incrementally |
| Done | Citations extracted, meta sent | `latency_ms` in meta payload |
