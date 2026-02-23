import hashlib
from typing import Literal

FeatureName = Literal[
    "complete",
    "search",
    "style_convert",
    "character_simulate",
    "predict",
    "translate",
    "research",
    "storyboard",
    "tts",
    "transcribe",
]


def _digest(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]


def _clip(text: str, max_len: int = 220) -> str:
    text = (text or "").strip()
    if len(text) <= max_len:
        return text
    return text[:max_len] + "..."


def build_mock_response(feature: FeatureName, prompt: str) -> str:
    sig = _digest(prompt)
    preview = _clip(prompt)

    if feature == "search":
        return (
            f"[MOCK:settings-search:{sig}]\n"
            f"- Matched source: world_settings\n"
            f"- Confidence: 0.84\n"
            f"- Answer: The requested setting is likely tied to chapter context.\n"
            f"- Prompt preview: {preview}"
        )

    if feature == "complete":
        return (
            f"[MOCK:continue:{sig}]\n"
            "The corridor fell silent for a heartbeat, and then the door opened from inside. "
            "He stepped in without looking back, because hesitation would read as fear."
        )

    if feature == "style_convert":
        return (
            f"[MOCK:style:{sig}]\n"
            "Converted style output: emotional tone increased, sentence rhythm tightened, and narration kept first-person consistency."
        )

    if feature == "character_simulate":
        return (
            f"[MOCK:character:{sig}]\n"
            "Character response: \"I can agree to this plan, but only if we protect the team first.\""
        )

    if feature == "predict":
        return (
            f"[MOCK:predict:{sig}]\n"
            "Engagement score: 72/100, drop-risk section around middle transition, recommendation: shorten exposition by 20%."
        )

    if feature == "translate":
        return (
            f"[MOCK:translate:{sig}]\n"
            "Translated output: This scene describes a tense negotiation in a dim hallway."
        )

    if feature == "research":
        return (
            f"[MOCK:research:{sig}]\n"
            "Summary: 3 key facts collected, 2 source leads suggested, and one historical inconsistency flagged for review."
        )

    if feature == "storyboard":
        return (
            f"[MOCK:storyboard:{sig}]\n"
            "Cut1 close-up reaction, Cut2 wide shot conflict setup, Cut3 impact frame with dialogue emphasis."
        )

    if feature == "tts":
        return (
            f"[MOCK:tts:{sig}]\n"
            "Narration script generated. Audio rendering is disabled in mock mode."
        )

    return (
        f"[MOCK:transcribe:{sig}]\n"
        "Transcript generated from placeholder input. Real audio pipeline is not active in mock mode."
    )
