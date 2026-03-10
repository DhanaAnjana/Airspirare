"""
gemini_service.py
-----------------
Calls a local LM Studio model to generate role-specific recommendations
based on the top-5 pollutant sources for a ward.

Uses `lmstudio` SDK to talk to a locally running LM Studio server with
the google/gemma-3-1B-it-QAT model.

Responses are cached in a module-level dict so identical queries don't
re-hit the model.  The cache has no TTL — acceptable for local dev.
"""

import lmstudio as lms

# Connect to the local LM Studio model.
# Make sure LM Studio is running with google/gemma-3-1b loaded.
model = lms.llm("google/gemma-3-1b")

# Module-level cache: (ward, top5_tuple, role) → recommendation string.
_cache: dict[tuple, str] = {}


def get_recommendation(
    ward: str, aqi: int, top5: list[tuple[str, float]], role: str
) -> str:
    """
    Generate a recommendation from the local LM Studio model.

    Parameters
    ----------
    ward   : Ward name, e.g. "Rohini".
    aqi    : Current AQI value for the ward.
    top5   : List of (source_name, confidence%) sorted descending.
    role   : "admin" or "citizen".

    Returns
    -------
    A model-generated recommendation string.
    """

    # Build a hashable cache key from the inputs.
    cache_key = (ward, tuple(top5), role)
    if cache_key in _cache:
        return _cache[cache_key]

    # Format the top-5 sources into a readable list for the prompt.
    sources_text = "\n".join(
        f"  {i+1}. {name} — {score}%" for i, (name, score) in enumerate(top5)
    )

    # ---- Construct role-specific prompt ----
    if role == "admin":
        prompt = (
            f"You are an air-quality policy advisor for Delhi.\n"
            f"Ward: {ward}\n"
            f"Current AQI: {aqi}\n"
            f"Top 5 identified pollution sources:\n{sources_text}\n\n"
            f"Write exactly 5 policy actions the ward administrator should implement.\n"
            f"Rules:\n"
            f"- Output ONLY a numbered list (1–5).\n"
            f"- Each point must be one or two sentences.\n"
            f"- No headings.\n"
            f"- No introductory sentence.\n"
            f"- No markdown formatting (no **, no bullets).\n"
            f"- Do not repeat the pollution source names.\n"
            f"- Maximum 200 words total.\n"
        )
    else:
        prompt = (
            f"You are a public health advisor writing for ordinary residents "
            f"of Delhi who are not scientists.\n"
            f"Ward: {ward}\n"
            f"Current AQI: {aqi}\n"
            f"Top 5 pollution sources in their area:\n{sources_text}\n\n"
            f"Write exactly 5 formal health advisory points. "
            f"Rules:\n"
            f"- Output ONLY a numbered list (1–5).\n"
            f"- Each point must be one or two sentences.\n"
            f"- No headings.\n"
            f"- No introductory sentence.\n"
            f"- No markdown formatting (no **, no bullets).\n"
            f"- Do not repeat the pollution source names.\n"
            f"- Maximum 200 words total.\n"
        )

    try:
        result = model.respond(prompt)
        text = str(result)
        # Only cache successful responses — errors should be retried next time.
        _cache[cache_key] = text
    except Exception as e:
        text = f"[LM Studio error: {e}]"

    return text