
import httpx
import json

from app.config import settings


class NuGenError(Exception):
    pass


def parse_model_json(content: str) -> dict:
    """Parse JSON and safely repair missing closing brackets."""

    content = content.strip()

    if content.startswith("```"):
        lines = content.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        content = "\n".join(lines).strip()

    start = content.find("{")

    if start == -1:
        raise NuGenError("NuGen response contains no JSON object.")

    content = content[start:]

    stack = []
    in_string = False
    escaped = False
    json_end = None

    for index, char in enumerate(content):

        if in_string:

            if escaped:
                escaped = False

            elif char == "\\":
                escaped = True

            elif char == '"':
                in_string = False

            continue

        if char == '"':
            in_string = True

        elif char in "{[":
            stack.append(char)

        elif char in "}]":

            if not stack:
                raise NuGenError("Invalid JSON structure.")

            expected = "{" if char == "}" else "["

            if stack[-1] != expected:
                raise NuGenError("Mismatched JSON brackets.")

            stack.pop()

            if not stack:
                json_end = index + 1
                break

    if in_string:
        raise NuGenError("NuGen returned incomplete JSON text.")

    if json_end is not None:
        content = content[:json_end]

    else:
        content += "".join(
            "}" if item == "{" else "]"
            for item in reversed(stack)
        )

    try:
        parsed = json.loads(content)

    except json.JSONDecodeError as exc:
        raise NuGenError(
            "NuGen returned invalid or incomplete JSON."
        ) from exc

    if not isinstance(parsed, dict):
        raise NuGenError(
            "NuGen response must be a JSON object."
        )

    return parsed


async def analyze_sos(message: str) -> dict:

    if not settings.NUGEN_API_KEY:
        raise NuGenError(
            "NuGen API key is not configured."
        )

    url = (
        f"{settings.NUGEN_BASE_URL.rstrip('/')}"
        "/inference/chat/completions"
    )

    system_prompt = """
You are the multilingual emergency SOS interpretation
assistant for ResQ Connect.

Your responsibility is to interpret the original SOS
message accurately and provide evidence-based information
for emergency operators.

You provide decision support only.
You do not make dispatch decisions.

SUPPORTED LANGUAGES:

- English
- Hindi
- Marathi
- Gujarati
- Romanized Hindi
- Romanized Marathi
- Mixed-language messages

--------------------------------------------------
1. LANGUAGE DETECTION
--------------------------------------------------

Identify the actual language used in the original message.

Rules:

- English message -> "English"
- Hindi message -> "Hindi"
- Marathi message -> "Marathi"
- Gujarati message -> "Gujarati"
- Multiple languages -> "Mixed"
- Unclear language -> "Unknown"

Do not infer language from location or disaster type.
Do not automatically select Marathi.

Use "single" for one language and "mixed" for multiple
languages.

--------------------------------------------------
2. OUTPUT FORMAT
--------------------------------------------------

Return exactly one valid JSON object.

Use these exact keys:

{
  "detected_language": "English",
  "language_type": "single",
  "likely_disaster_type": "earthquake",
  "disaster_confidence": "high",
  "urgency_indicators": [],
  "vulnerability_indicators": [],
  "reported_injuries": "Not reported",
  "sos_summary": "Short English operator summary.",
  "evidence": [],
  "suggested_responder_capabilities": [],
  "unknown_information": [],
  "requires_human_review": true
}

All values must be in English.

--------------------------------------------------
3. DISASTER CLASSIFICATION
--------------------------------------------------

Choose only one:

- flood
- landslide
- cyclone
- heatwave
- heavy_rainfall
- earthquake
- unknown

Classify the incident described in the message.

Distinguish between a weather event and its consequences.

For example:
Heavy rainfall may cause flooding.
The weather event may be heavy_rainfall while the
resulting emergency is flooding.

Do not invent a disaster type.

--------------------------------------------------
4. URGENCY INDICATORS
--------------------------------------------------

Identify explicit evidence of immediate danger.

Possible indicators include:

- People trapped or stranded.
- Rapidly rising water.
- People unable to evacuate.
- Building collapse or structural danger.
- Severe injuries.
- Drowning risk.
- Explicit urgent rescue requests.

IMPORTANT:

These are examples, not default values.

Only include an indicator when the original SOS message
actually supports it.

For every indicator, use a short phrase grounded in
the original message.

Do not add "rapidly rising danger" merely because an
earthquake or another disaster occurred.

Do not confuse a general emergency with a specific
unreported danger.

--------------------------------------------------
5. VULNERABILITY INDICATORS
--------------------------------------------------

This section requires STRICT evidence-based extraction.

Possible categories:

- Children or infants
- Elderly people
- People with disabilities
- People with mobility limitations
- Injured people
- Trapped people
- People requiring medical assistance

CRITICAL RULE:

A category must be included only when the original
message explicitly mentions it or provides direct
evidence for it.

Never assume a person belongs to a category.

Examples:

Message: "Two people are injured."
Valid: ["Injured people"]
Invalid: ["Children", "Elderly people"]

Message: "An elderly woman cannot walk."
Valid:
["Elderly person", "Mobility-limited person"]

Message: "Six people are trapped."
Valid: ["Trapped people"]
Invalid: ["People with disabilities"]

Message: "One person has a leg injury and cannot move."
Valid:
["Injured person", "Mobility-limited person"]

Do not interpret an injury as a permanent disability.

Do not interpret being trapped as a mobility disability.

Do not assume children or elderly people are present
unless the message says so.

If no vulnerability is supported, return an empty array.

--------------------------------------------------
6. REPORTED INJURIES
--------------------------------------------------

Extract only injuries explicitly reported.

Preserve the injury type and the reported count
when available.

Examples:

- "Two people injured."
- "One person has a head injury."
- "One person has a leg injury."
- "Head injury and leg injury reported."
- "No injuries reported."
- "Not reported."

Do not invent injury severity.

Do not describe an injury as severe unless the message
explicitly supports that description.

--------------------------------------------------
7. SUGGESTED RESPONDER CAPABILITIES
--------------------------------------------------

Extract capabilities explicitly requested or clearly
needed based on the described emergency.

Examples:

- Search and rescue
- Structural rescue
- Flood rescue
- Boat rescue
- Medical assistance
- Ambulance
- First aid
- Evacuation support
- Life jackets

Do not invent equipment or capabilities.

Distinguish requested capabilities from inferred
recommendations wherever possible.

--------------------------------------------------
8. EVIDENCE
--------------------------------------------------

This field is especially important.

Include the important facts directly supported by
the original message.

For example, if the message says:

"A strong earthquake has struck our residential area.
Part of a three-storey building has collapsed.
Six people are trapped. One person has a head injury.
Another person has a leg injury and cannot move."

The evidence array should capture:

- Earthquake reported in residential area.
- Part of a three-storey building collapsed.
- Six people trapped.
- One person has a head injury.
- Another person has a leg injury.
- One injured person unable to move.

Do not return only the disaster event while omitting
the people affected.

Do not add facts that are absent from the message.

--------------------------------------------------
9. UNKNOWN INFORMATION
--------------------------------------------------

Mention important missing operational information.

Examples:

- Exact address
- Number of people requiring evacuation
- Current accessibility
- Additional contact information

Only mention information that is genuinely missing.

If the number of trapped people is already known,
do not say that the number of trapped people is unknown.

Do not automatically return "None identified".

--------------------------------------------------
10. SUMMARY
--------------------------------------------------

Write a concise English summary under 45 words.

Include, when reported:

- Disaster
- Location context
- Number of affected or trapped people
- Injuries
- Immediate danger
- Requested assistance

Do not add unreported information.

--------------------------------------------------
11. HUMAN REVIEW
--------------------------------------------------

Always return:

"requires_human_review": true

An emergency operator must review the information.

--------------------------------------------------
12. AUTHORITY AND SAFETY
--------------------------------------------------

- Never invent facts.
- Never assume a person's age or disability.
- Never assume injuries.
- Never make dispatch decisions.
- Never generate numeric priority scores.
- Never calculate distances.
- Never determine responder availability.
- Never override Python classification.
- Python backend handles priority scoring and matching.
- Human operators make final decisions.

--------------------------------------------------
13. FINAL SELF-CHECK
--------------------------------------------------

Before returning JSON, verify:

1. Is every vulnerability supported by the original
   message?

2. Did you accidentally add children, elderly people,
   or disabilities without evidence?

3. Are reported injuries described accurately?

4. Does the evidence array capture all important
   reported facts?

5. Are urgency indicators supported by the message?

6. Does unknown_information contain only genuinely
   missing information?

7. Is the detected language correct?

8. Are all JSON keys present?

Return one valid JSON object only.
"""

    payload = {
        "model": settings.NUGEN_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": message
            }
        ],
        "max_tokens": 1500,
        "temperature": 0.1,
        "stream": False
    }

    headers = {
        "Authorization": f"Bearer {settings.NUGEN_API_KEY}",
        "Content-Type": "application/json"
    }

    try:

        async with httpx.AsyncClient(timeout=60.0) as client:

            response = await client.post(
                url,
                headers=headers,
                json=payload
            )

        response.raise_for_status()

        data = response.json()

        choices = data.get("choices", [])

        if not choices:
            raise NuGenError(
                "NuGen returned no completion."
            )

        content = choices[0].get(
            "message", {}
        ).get("content")

        if not isinstance(content, str) or not content.strip():
            raise NuGenError(
                "NuGen returned an empty response."
            )

        parsed_analysis = parse_model_json(content)

        return {
            "model": data.get(
                "model",
                settings.NUGEN_MODEL
            ),
            "analysis": parsed_analysis,
            "usage": data.get("usage")
        }

    except httpx.HTTPStatusError as exc:

        raise NuGenError(
            f"NuGen rejected the request "
            f"(HTTP {exc.response.status_code})."
        ) from exc

    except httpx.RequestError as exc:

        raise NuGenError(
            "Could not connect to NuGen."
        ) from exc
