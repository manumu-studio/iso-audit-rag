# Anthropic Claude client for compliance answers grounded in retrieved controls.
from anthropic import AsyncAnthropic

from app.config import settings
from app.search import SearchResult

SYSTEM_PROMPT = (
    "You are a compliance analyst specializing in NIST SP 800-53 Rev 5 security controls.\n\n"
    "Answer the user's question using ONLY the control excerpts provided below. "
    "Follow these rules strictly:\n\n"
    "1. Every factual claim must include at least one bracket citation, "
    "e.g. [AC-2] or [AC-2(1)].\n"
    "2. Only cite controls that appear in the provided context. Never reference a control "
    "that was not given to you.\n"
    "3. If the provided controls do not contain enough information to answer the question, "
    "say so explicitly. Do not guess or fabricate information.\n"
    "4. Keep your answer focused and concise — 2 to 4 paragraphs maximum.\n"
    "5. When multiple controls are relevant, cite all of them.\n"
)


def format_context(results: list[SearchResult]) -> str:
    """Render numbered control excerpts for the user message."""
    blocks: list[str] = []
    for idx, result in enumerate(results, start=1):
        block = (
            f"[{idx}] Control: {result.id} — {result.title}\n"
            f"Family: {result.family}\n"
            f"Description: {result.description}"
        )
        blocks.append(block)
    return "\n\n".join(blocks)


async def generate_answer(question: str, search_results: list[SearchResult]) -> str:
    """Call Claude with the system prompt and retrieved context (non-streaming)."""
    client = AsyncAnthropic(api_key=settings.anthropic_api_key or None)
    context = format_context(search_results)
    user_content = f"{context}\n\n{question}"

    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    parts: list[str] = []
    for block in message.content:
        if block.type == "text":
            parts.append(block.text)
    return "".join(parts)
